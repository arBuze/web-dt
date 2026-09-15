import type {
  IndustrialProtocol,
  TelemetryPoint,
  TelemetryValue,
} from "../../domain/digital-twin/digital-twin.types.js";

export interface TelemetryUpdateDto {
  componentKey: string;
  parameterKey: string;
  value: TelemetryValue;
  timestamp: string;
  protocol: IndustrialProtocol;
  quality: string | null;
}

export function toTelemetryUpdateDto(
  point: TelemetryPoint,
): TelemetryUpdateDto {
  return {
    componentKey: point.componentKey,
    parameterKey: point.parameterKey,
    value: point.value,
    timestamp: point.timestamp.toISOString(),
    protocol: point.protocol,
    quality: point.quality,
  };
}
