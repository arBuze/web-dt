export type IndustrialProtocol =
  | "OPC_UA"
  | "MQTT";

export type ParameterDataType =
  | "Boolean"
  | "Int32"
  | "Double"
  | "String";

export type TelemetryValue =
  | boolean
  | number
  | string
  | null;

export interface ParameterBinding {
  id: string;
  protocol: IndustrialProtocol;
  componentId: string;
  parameterKey: string;
  address: string;
  dataType: ParameterDataType;
  writable: boolean;
  writeAddress?: string;
}

export interface TelemetryPoint {
  componentId: string;
  parameterKey: string;
  value: TelemetryValue;
  timestamp: Date;
  protocol: IndustrialProtocol;
  sourceAddress: string;
  quality?: string;
}
