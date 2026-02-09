import request from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';
import { testUser } from 'src/users/tests/user-seeds';

jest.setTimeout(60_000);

describe('E2E: Organize webinar', () => {
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

  it('should create a webinar via POST /webinars', async () => {
    const server = fixture.getServer();
    const prisma = fixture.getPrismaClient();

    // ACT
    await request(server)
      .post('/webinars')
      .set('x-user-id', testUser.alice.props.id) // adapte l'auth si besoin
      .send({
        title: 'E2E Webinar',
        startDate: new Date('2025-01-01T00:00:00Z').toISOString(),
        endDate: new Date('2025-01-01T01:00:00Z').toISOString(),
        seats: 30,
      })
      .expect(201);

    // ASSERT
    const created = await prisma.webinar.findMany({ where: { title: 'E2E Webinar' } });
    expect(created.length).toBe(1);
    expect(created[0].organizerId).toBe(testUser.alice.props.id);
    expect(created[0].seats).toBe(30);
  });
});