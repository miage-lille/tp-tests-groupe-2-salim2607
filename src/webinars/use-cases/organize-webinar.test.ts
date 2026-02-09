import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { IDateGenerator } from 'src/core/ports/date-generator.interface';
import { IIdGenerator } from 'src/core/ports/id-generator.interface';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { testUser } from 'src/users/tests/user-seeds';

const asyncExec = promisify(exec);
jest.setTimeout(60_000);

describe('Feature: Organize webinars', () => {
  let repository: InMemoryWebinarRepository;
  let idGenerator: IIdGenerator;
  let useCase: OrganizeWebinars;
  let dateGenerator: IDateGenerator;

  const payload = {
    userId: 'user-alice-id',
    title: 'Webinar title',
    seats: 100,
    startDate: new Date('2024-01-10T10:00:00.000Z'),
    endDate: new Date('2024-01-10T11:00:00.000Z'),
  };

  function expectWebinarToEqual(webinar: Webinar) {
    expect(webinar).toEqual({
      props: {
        id: 'id-1',
        organizerId: 'user-alice-id',
        title: 'Webinar title',
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
        seats: 100,
      },
      initialState: {
        id: 'id-1',
        organizerId: 'user-alice-id',
        title: 'Webinar title',
        startDate: new Date('2024-01-10T10:00:00.000Z'),
        endDate: new Date('2024-01-10T11:00:00.000Z'),
        seats: 100,
      },
    });
  }

  beforeEach(() => {
    repository = new InMemoryWebinarRepository();
    idGenerator = new FixedIdGenerator();
    dateGenerator = new FixedDateGenerator();
    useCase = new OrganizeWebinars(repository, idGenerator, dateGenerator);
  });

  describe('Scenario: happy path', () => {
    it('should create a webinar', async () => {
      const result = await useCase.execute(payload);

      expect(result).toEqual({ id: 'id-1' });
    });

    it('should insert a new webinar in the repository', async () => {
      await useCase.execute(payload);

      const createdWebinar = repository.database[0];
      expectWebinarToEqual(createdWebinar);
    });
  });

  describe('Scenario: webinar happens too soon', () => {
    const payload = {
      userId: 'user-alice-id',
      title: 'Webinar title',
      seats: 100,
      startDate: new Date('2024-01-03T23:59:59.000Z'),
      endDate: new Date('2024-01-03T23:59:59.000Z'),
    };

    it('should throw an error', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must be scheduled at least 3 days in advance',
      );
    });

    it('should not insert the webinar in the repository', async () => {
      try {
        await useCase.execute(payload);
      } catch (error) {}

      expect(repository.database).toEqual([]);
    });
  });

  describe('Scenario: webinar has too many seats', () => {
    const payload = {
      userId: 'user-alice-id',
      title: 'Webinar title',
      seats: 1001,
      startDate: new Date('2024-01-10T10:00:00.000Z'),
      endDate: new Date('2024-01-10T11:00:00.000Z'),
    };

    it('should throw an error', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must have at most 1000 seats',
      );
    });

    it('should not insert the webinar in the repository', async () => {
      try {
        await useCase.execute(payload);
      } catch (error) {}

      expect(repository.database).toEqual([]);
    });
  });

  describe('Scenario: webinar does not have enough seats', () => {
    const payload = {
      userId: 'user-alice-id',
      title: 'Webinar title',
      seats: 0,
      startDate: new Date('2024-01-10T10:00:00.000Z'),
      endDate: new Date('2024-01-10T11:00:00.000Z'),
    };

    it('should throw an error', async () => {
      await expect(useCase.execute(payload)).rejects.toThrow(
        'Webinar must have at least 1 seat',
      );
    });

    it('should not insert the webinar in the repository', async () => {
      try {
        await useCase.execute(payload);
      } catch (error) {}

      expect(repository.database).toEqual([]);
    });
  });
});

describe('OrganizeWebinar use-case (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient | undefined;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = container.getConnectionUri();
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

    // exécute les migrations Prisma
    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);
    await prisma.$connect();
  });

  beforeEach(async () => {
    if (!prisma) throw new Error('prisma not initialized');
    repository = new PrismaWebinarRepository(prisma);
    // adapte si OrganizeWebinar prend d'autres dépendances (id/date generator)
    useCase = new OrganizeWebinars(
      repository,
      new FixedIdGenerator(),
      new FixedDateGenerator(),
    );
    await prisma.webinar.deleteMany();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (container) await container.stop();
  });

  it('should create a webinar in the database', async () => {
    // ARRANGE
    const payload = {
      userId: testUser.alice.props.id,
      title: 'Integration Webinar',
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-01-01T01:00:00Z'),
      seats: 50,
    };

    // ACT
    await useCase.execute(payload);

    // ASSERT (on vérifie directement la DB)
    const list = await prisma!.webinar.findMany();
    expect(list).toHaveLength(1);
    expect(list[0].organizerId).toBe(testUser.alice.props.id);
    expect(list[0].seats).toBe(50);
  });
});
