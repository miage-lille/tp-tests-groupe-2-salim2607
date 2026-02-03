// Tests unitaires
// ==============================
// TypeScript
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { testUser } from 'src/users/tests/user-seeds';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

describe('Feature : Change seats', () => {
  // Initialisation de nos tests, boilerplates...
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  // Code commun à nos scénarios : seed / données de base
  const seed = new Webinar({
    id: 'webinar-id',
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([seed]);
    useCase = new ChangeSeats(webinarRepository);
  });

  // Méthode utilitaire de vérification
  function expectWebinarSeatsToBe(n: number) {
    const w = webinarRepository.findByIdSync('webinar-id');
    expect(w?.props.seats).toBe(n);
  }

  describe('Scenario: Happy path', () => {
    it('should change the number of seats for a webinar', async () => {
      // Vérification de la règle métier, condition testée...
      await useCase.execute({
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 200,
      });

      expectWebinarSeatsToBe(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    it('should fail', async () => {
      // Vérification du cas où le webinar n’existe pas
      await expect(
        useCase.execute({
          user: testUser.alice,
          webinarId: 'unknown',
          seats: 200,
        }),
      ).rejects.toThrow(WebinarNotFoundException);

      expectWebinarSeatsToBe(100);
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    it('should fail', async () => {
      // Vérification de la règle métier : seul l’organisateur peut modifier
      await expect(
        useCase.execute({
          user: testUser.bob,
          webinarId: 'webinar-id',
          seats: 200,
        }),
      ).rejects.toThrow(WebinarNotOrganizerException);

      expectWebinarSeatsToBe(100);
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    it('should fail', async () => {
      // Vérification de la règle métier : impossible de réduire le nombre de places
      await expect(
        useCase.execute({
          user: testUser.alice,
          webinarId: 'webinar-id',
          seats: 50,
        }),
      ).rejects.toThrow(WebinarReduceSeatsException);

      expectWebinarSeatsToBe(100);
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    it('should fail', async () => {
      // Vérification de la règle métier : limite maximale de places
      await expect(
        useCase.execute({
          user: testUser.alice,
          webinarId: 'webinar-id',
          seats: 1001,
        }),
      ).rejects.toThrow(WebinarTooManySeatsException);

      expectWebinarSeatsToBe(100);
    });
  });
});
