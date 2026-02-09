import supertest from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';

jest.setTimeout(60_000);

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  it('should update webinar seats', async () => {
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'test-user', // route uses a hardcoded user id 'test-user'
      },
    });

    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: '30' })
      .expect(200);

    expect(response.body).toEqual({ message: 'Seats updated' });

    const updated = await prisma.webinar.findUnique({ where: { id: webinar.id } });
    expect(updated?.seats).toBe(30);
  });

  it('should return 404 when webinar not found', async () => {
    const server = fixture.getServer();
    await supertest(server).post('/webinars/unknown/seats').send({ seats: '30' }).expect(404);
  });

  it('should return 401 when not organizer', async () => {
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'not-mine',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'someone-else',
      },
    });

    await supertest(server).post(`/webinars/${webinar.id}/seats`).send({ seats: '30' }).expect(401);
  });
});