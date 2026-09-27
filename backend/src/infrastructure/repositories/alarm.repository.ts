import { prisma } from "../database/prisma.js";

export class AlarmRepository {
  public async findRulesForParameter(parameterId: string) {
    return prisma.alarmRule.findMany({
      where: {
        parameterId,
        enabled: true,
      },
    });
  }

  public async findActiveForRule(ruleId: string) {
    return prisma.alarm.findFirst({
      where: {
        ruleId,
        status: "ACTIVE",
      },
    });
  }

  public async raise(
    data: {
      ruleId: string;
      parameterId: string;
      value: number;
      severity:
        | "INFO"
        | "WARNING"
        | "CRITICAL";
      message: string;
    }
  ) {
    return prisma.alarm.create({
      data: {
        ruleId: data.ruleId,
        parameterId: data.parameterId,
        triggerValue: data.value,
        severity: data.severity,
        message: data.message,
        status: "ACTIVE",
      },
    });
  }

  public async clear(alarmId: string, value: number) {
    return prisma.alarm.update({
      where: {
        id: alarmId,
      },
      data: {
        status: "CLEARED",
        clearedAt: new Date(),
        clearValue: value,
      },
    });
  }

  public async findActive() {
    return prisma.alarm.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        startedAt: "desc",
      },
      include: {
        parameter: {
          include: {
            component: true,
          },
        },
        rule: true,
      },
    });
  }

  public async findRecent(limit = 100) {
    return prisma.alarm.findMany({
      orderBy: {
        startedAt: "desc",
      },
      take: limit,
      include: {
        parameter: {
          include: {
            component: true,
          },
        },
        rule: true,
      },
    });
  }
}
