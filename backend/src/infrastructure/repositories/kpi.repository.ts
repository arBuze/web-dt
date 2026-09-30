import { prisma } from "../database/prisma.js";

export class KpiRepository {
  public async findConfig(componentKey: string) {
    return prisma.kpiConfig.findFirst({
      where: {
        enabled: true,
        component: {
          key: componentKey,
          isActive: true,
        },
      },
      include: {
        component: true,
        stateParameter: true,
        totalCountParameter: true,
        goodCountParameter: true,
      },
    });
  }

  public async findLatestBefore(
    parameterId: string,
    timestamp: Date
  ) {
    return prisma.telemetryReading.findFirst({
      where: {
        parameterId,
        timestamp: {
          lt: timestamp,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      select: {
        timestamp: true,
        numberValue: true,
        stringValue: true,
      },
    });
  }

  public async findReadings(
    parameterId: string,
    from: Date,
    to: Date
  ) {
    return prisma.telemetryReading.findMany({
      where: {
        parameterId,
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
      select: {
        timestamp: true,
        numberValue: true,
        stringValue: true,
      },
    });
  }
}
