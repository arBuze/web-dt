import type { TelemetryValue } from "../domain/digital-twin/digital-twin.types.js";
import type { ParameterRepository } from "../infrastructure/repositories/parameter.repository.js";
import type { TelemetryRepository } from "../infrastructure/repositories/telemetry.repository.js";

export interface TelemetryHistoryRequest {
  componentKey: string;
  parameterKey: string;
  dateFrom: Date;
  dateTo: Date;
  limit: number;
}

export class TelemetryHistoryService {
  constructor(
    private readonly parameterRepository: ParameterRepository,
    private readonly telemetryRepository: TelemetryRepository,
  ) {}

  public async getHistory(request: TelemetryHistoryRequest) {
    const parameter =
      await this.parameterRepository.findByKeys(
        request.componentKey,
        request.parameterKey
      );

    if (!parameter) {
      return null;
    }

    const readings =
      await this.telemetryRepository.findHistory(
        parameter.id,
        request.dateFrom,
        request.dateTo,
        request.limit
      );

    const points = readings
      .reverse()
      .map((reading) => ({
        timestamp: reading.timestamp.toISOString(),
        receivedAt: reading.receivedAt.toISOString(),
        value: this.extractValue(reading),
        quality: reading.quality,
        protocol: reading.protocol,
        sourceAddress: reading.sourceAddress,
      }));

    return {
      component: {
        key: parameter.component.key,
        name: parameter.component.name,
      },
      parameter: {
        key: parameter.key,
        name: parameter.name,
        unit: parameter.unit,
        dataType: parameter.dataType,
      },
      range: {
        dateFrom: request.dateFrom.toISOString(),
        dateTo: request.dateTo.toISOString(),
      },
      points,
    };
  }

  private extractValue(
    reading: {
      numberValue: number | null;
      booleanValue: boolean | null;
      stringValue: string | null;
      rawValue: unknown;
    }
  ): TelemetryValue {
    if (reading.numberValue !== null) {
      return reading.numberValue;
    }

    if (reading.booleanValue !== null) {
      return reading.booleanValue;
    }

    if (reading.stringValue !== null) {
      return reading.stringValue;
    }

    if (reading.rawValue !== null) {
      return reading.rawValue as TelemetryValue;
    }

    return null;
  }
}
