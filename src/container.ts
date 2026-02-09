import { PrismaClient } from '@prisma/client';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';

export class AppContainer {
  private prismaClient!: PrismaClient;
  private webinarRepository!: PrismaWebinarRepository;
  private changeSeatsUseCase!: ChangeSeats;
  private organizeWebinarsUseCase!: OrganizeWebinars;

  init(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
    this.webinarRepository = new PrismaWebinarRepository(this.prismaClient);
    this.changeSeatsUseCase = new ChangeSeats(this.webinarRepository);

    // initialize organize use-case with simple/fixed generators for tests/fixtures
    const idGenerator = new FixedIdGenerator();
    const dateGenerator = new FixedDateGenerator();
    this.organizeWebinarsUseCase = new OrganizeWebinars(
      this.webinarRepository,
      idGenerator,
      dateGenerator,
    );
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getChangeSeatsUseCase() {
    return this.changeSeatsUseCase;
  }

  getOrganizeWebinarsUseCase() {
    return this.organizeWebinarsUseCase;
  }
}

export const container = new AppContainer();
