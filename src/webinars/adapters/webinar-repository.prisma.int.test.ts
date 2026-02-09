// Test d'intégration
// C. Ecriture de notre premier test d'intégration
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';

const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repository: PrismaWebinarRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = container.getConnectionUri();
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);
    await prisma.$connect();
  });

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prisma);
    await prisma.webinar.deleteMany();
    await prisma.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  describe('create', () => {
    it('should create a webinar', async () => {
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      await repository.create(webinar);

      const maybe = await prisma.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybe).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('findById', () => {
    it('should return a webinar', async () => {
      await prisma.webinar.create({
        data: {
          id: 'w1',
          organizerId: 'o1',
          title: 'T',
          startDate: new Date('2022-01-01T00:00:00Z'),
          endDate: new Date('2022-01-01T01:00:00Z'),
          seats: 10,
        },
      });

      const found = await repository.findById('w1');
      expect(found?.props).toEqual({
        id: 'w1',
        organizerId: 'o1',
        title: 'T',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 10,
      });
    });
  });

  describe('update', () => {
    it('should update a webinar', async () => {
      await prisma.webinar.create({
        data: {
          id: 'w2',
          organizerId: 'o2',
          title: 'T2',
          startDate: new Date('2022-01-01T00:00:00Z'),
          endDate: new Date('2022-01-01T01:00:00Z'),
          seats: 10,
        },
      });

      const entity = await repository.findById('w2');
      entity?.update({ seats: 50 });
      if (entity) await repository.update(entity);

      const updated = await prisma.webinar.findUnique({ where: { id: 'w2' } });
      expect(updated?.seats).toBe(50);
    });
  });
});
