import { prisma } from "../database/prisma.js";

export class DataSourceRepository {
  public async findEnabledWithBindings() {
    return prisma.dataSource.findMany({
      where: {
        enabled: true,
      },
      include: {
        bindings: {
          where: {
            enabled: true,
            parameter: {
              isActive: true,
            },
          },
          include: {
            parameter: {
              include: {
                component: true,
              },
            },
          },
        },
      },
    });
  }
}
