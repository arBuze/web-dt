import type {
  IndustrialProtocol,
  ParameterBinding,
  TelemetryPoint,
  TelemetryValue,
} from "../../domain/digital-twin/digital-twin.types.js";

export type TelemetryHandler = (
  point: TelemetryPoint,
) => void | Promise<void>;

export interface IndustrialAdapter {
  readonly protocol: IndustrialProtocol;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  subscribe(
    bindings: ParameterBinding[],
    handler: TelemetryHandler,
  ): Promise<void>;
  write(
    binding: ParameterBinding,
    value: TelemetryValue,
  ): Promise<void>;
}
