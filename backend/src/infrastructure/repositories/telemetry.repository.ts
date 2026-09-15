import type { TelemetryPoint } from "../../domain/digital-twin/digital-twin.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../database/prisma.js";

export class TelemetryRepository {
  public async save(
    point: TelemetryPoint,
  ): Promise<void> {
    let numberValue:
      | number
      | null = null;

    let booleanValue:
      | boolean
      | null = null;

    let stringValue:
      | string
      | null = null;

    let rawValue:
      Prisma.InputJsonValue
      | typeof Prisma.JsonNull
      | undefined;

    if (typeof point.value === "number") {
      numberValue = point.value;
    } else if (typeof point.value === "boolean") {
      booleanValue = point.value;
    } else if (typeof point.value === "string") {
      stringValue = point.value;
    } else if (point.value !== null) {
      rawValue = point.value;
    }

    await prisma.telemetryReading.create({
      data: {
        timestamp: point.timestamp,
        parameterId: point.parameterId,
        bindingId: point.bindingId,
        protocol: point.protocol,
        sourceAddress: point.sourceAddress,
        quality: point.quality,
        numberValue,
        booleanValue,
        stringValue,
        ...(rawValue !== undefined
          ? {
              rawValue,
            }
          : {}),
      },
    });
  }

  public async findHistory(
    parameterId: string,
    dateFrom: Date,
    dateTo: Date,
    limit: number,
  ) {
    return prisma.telemetryReading.findMany({
      where: {
        parameterId,
        timestamp: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
      select: {
        timestamp: true,
        receivedAt: true,
        numberValue: true,
        booleanValue: true,
        stringValue: true,
        rawValue: true,
        quality: true,
        protocol: true,
        sourceAddress: true,
      },
    });
  }
}
