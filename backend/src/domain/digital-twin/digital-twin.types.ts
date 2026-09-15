export type IndustrialProtocol =
  | "OPC_UA"
  | "MQTT";

export type ParameterDataType =
  | "BOOLEAN"
  | "INT32"
  | "INT64"
  | "FLOAT"
  | "DOUBLE"
  | "STRING"
  | "JSON";

export type TelemetryValue =
  | string
  | number
  | boolean
  | null
  | TelemetryValue[]
  | {
      [key: string]: TelemetryValue;
    };

export interface ParameterBinding {
  id: string;
  parameterId: string;
  dataSourceId: string;
  protocol: IndustrialProtocol;
  componentId: string;
  componentKey: string;
  parameterKey: string;
  address: string;
  dataType: ParameterDataType;
  writable: boolean;
  writeAddress: string | null;
  selector: string | null;
  samplingIntervalMs: number | null;
  deadband: number | null;
}

export interface TelemetryPoint {
  componentId: string;
  componentKey: string;
  parameterId: string;
  parameterKey: string;
  bindingId: string;
  value: TelemetryValue;
  timestamp: Date;
  protocol: IndustrialProtocol;
  sourceAddress: string;
  quality: string | null;
}
