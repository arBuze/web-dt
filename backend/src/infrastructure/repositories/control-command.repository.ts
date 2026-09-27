import { Prisma } from "../../generated/prisma/client.js";

import type { ControlValue } from "../../integrations/common/industrial-adapter.js";

import { prisma } from "../database/prisma.js";

export interface CreateControlCommand {
  componentKey: string;
  parameterKey: string;
  parameterId?: string | null;
  value: ControlValue;
}

export class ControlCommandRepository {
  public async createRequested(data: CreateControlCommand) {
    return prisma.controlCommand.create({
      data: {
        componentKey: data.componentKey,
        parameterKey: data.parameterKey,
        parameterId: data.parameterId ?? null,
        requestedValue: data.value as Prisma.InputJsonValue,
        status: "REQUESTED",
      },
    });
  }

  public async markSuccess(
    commandId: string,
    data: {
      dataSourceId: string;
      dataSourceKey: string;
      bindingId: string;
      protocol: "MQTT" | "OPC_UA";
      resultStatus: string;
    }
  ) {
    return prisma.controlCommand.update({
      where: {
        id: commandId,
      },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        dataSourceId: data.dataSourceId,
        dataSourceKey: data.dataSourceKey,
        bindingId: data.bindingId,
        protocol: data.protocol,
        resultStatus: data.resultStatus,
      },
    });
  }

  public async markRejected(
    commandId: string,
    errorCode: string,
    errorMessage: string
  ) {
    return prisma.controlCommand.update({
      where: {
        id: commandId,
      },
      data: {
        status: "REJECTED",
        completedAt: new Date(),
        errorCode,
        errorMessage,
      },
    });
  }

  public async markFailed(
    commandId: string,
    errorCode: string,
    errorMessage: string
  ) {
    return prisma.controlCommand.update({
      where: {
        id: commandId,
      },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorCode,
        errorMessage,
      },
    });
  }

  public async findRecent(limit = 100) {
    return prisma.controlCommand.findMany({
      orderBy: {
        requestedAt: "desc",
      },
      take: limit,
    });
  }
}
