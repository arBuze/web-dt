import { prisma } from "../database/prisma.js";

export class ParameterRepository {
  public async findByKeys(
    componentKey: string,
    parameterKey: string,
  ) {
    return prisma.parameter.findFirst({
      where: {
        key: parameterKey,
        isActive: true,
        component: {
          key: componentKey,
          isActive: true,
        },
      },
      select: {
        id: true,
        key: true,
        name: true,
        unit: true,
        dataType: true,
        component: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
      },
    });
  }
}
