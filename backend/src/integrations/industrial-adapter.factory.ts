import type { IndustrialAdapter } from "./common/industrial-adapter.js";

import { MqttService } from "./mqtt/mqtt.service.js";
import { OpcUaService } from "./opcua/opcua.service.js";

export interface DataSourceConfig {
  protocol:
    | "MQTT"
    | "OPC_UA";
  endpoint: string;
}

export function createIndustrialAdapter(
  source: DataSourceConfig,
): IndustrialAdapter {
  switch (source.protocol) {
    case "MQTT":
      return new MqttService(
        source.endpoint,
      );
    case "OPC_UA":
      return new OpcUaService(
        source.endpoint,
      );
    default:
      throw new Error(
        `Unsupported industrial protocol`,
      );
  }
}
