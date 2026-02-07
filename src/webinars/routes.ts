import { FastifyInstance } from 'fastify';
import { AppContainer } from 'src/container';
import { User } from 'src/users/entities/user.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarDatesTooSoonException } from 'src/webinars/exceptions/webinar-dates-too-soon';
import { WebinarNotEnoughSeatsException } from 'src/webinars/exceptions/webinar-not-enough-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

export async function webinarRoutes(
  fastify: FastifyInstance,
  container: AppContainer,
) {
  const changeSeatsUseCase = container.getChangeSeatsUseCase();
  const organizeUseCase = container.getOrganizeWebinarsUseCase();

  fastify.post<{
    Body: { seats: string };
    Params: { id: string };
  }>('/webinars/:id/seats', {}, async (request, reply) => {
    const changeSeatsCommand = {
      seats: parseInt(request.body.seats, 10),
      webinarId: request.params.id,
      user: new User({
        id: 'test-user',
        email: 'test@test.com',
        password: 'fake',
      }),
    };

    try {
      await changeSeatsUseCase.execute(changeSeatsCommand);
      reply.status(200).send({ message: 'Seats updated' });
    } catch (err) {
      if (err instanceof WebinarNotFoundException) {
        return reply.status(404).send({ error: err.message });
      }
      if (err instanceof WebinarNotOrganizerException) {
        return reply.status(401).send({ error: err.message });
      }
      reply.status(500).send({ error: 'An error occurred' });
    }
  });

  fastify.post<{
    Body: {
      title: string;
      startDate: string;
      endDate: string;
      seats: number | string;
    };
  }>('/webinars', {}, async (request, reply) => {
    const organizerId = request.headers['x-user-id'] as string | undefined;
    if (!organizerId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const command = {
      userId: organizerId,
      title: request.body.title,
      seats:
        typeof request.body.seats === 'string'
          ? parseInt(request.body.seats, 10)
          : (request.body.seats as number),
      startDate: new Date(request.body.startDate),
      endDate: new Date(request.body.endDate),
    };

    try {
      const result = await organizeUseCase.execute(command);
      return reply.status(201).send({ id: result.id });
    } catch (err) {
      if (
        err instanceof WebinarDatesTooSoonException ||
        err instanceof WebinarNotEnoughSeatsException ||
        err instanceof WebinarTooManySeatsException
      ) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'An error occurred' });
    }
  });
}
