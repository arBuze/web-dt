import {
  connectAsync,
  type MqttClient,
} from "mqtt";

import type {
  IndustrialAdapter,
  TelemetryHandler,
} from "../common/industrial-adapter.js";

import type {
  ParameterBinding,
  ParameterDataType,
  TelemetryValue,
} from "../../domain/digital-twin/digital-twin.types.js";

export class MqttService implements IndustrialAdapter
{
  public readonly protocol = "MQTT" as const;

  private client: MqttClient | null = null;

  private bindings = new Map<string, ParameterBinding>();

  private handler:
    | TelemetryHandler
    | null = null;

  constructor(private readonly endpoint: string) {}

  public async connect(): Promise<void> {
    if (this.client?.connected) {
      return;
    }

    this.client = await connectAsync(
      this.endpoint,
      {
        reconnectPeriod: 2000,
      },
    );

    console.log(`[MQTT] Connected to ${this.endpoint}`);

    this.client.on(
      "message",
      (topic, payload) => {
        console.log(`[MQTT] Message: ${topic} = ${payload.toString()}`);

        void this.handleMessage(
          topic,
          payload,
        );
      },
    );
  }

  public isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  public async subscribe(
    bindings: ParameterBinding[],
    handler: TelemetryHandler,
  ): Promise<void> {
    if (!this.client) {
      throw new Error("MQTT client is not connected");
    }

    this.handler = handler;

    const mqttBindings =
      bindings.filter(
        (binding) =>
          binding.protocol === "MQTT"
      );

    for (const binding of mqttBindings) {
      this.bindings.set(
        binding.address,
        binding,
      );

      console.log(`[MQTT] Subscribe: ${binding.address}`);

      await this.client.subscribeAsync(
        binding.address,
        {
          qos: 1,
        },
      );
    }
  }

  private async handleMessage(
    topic: string,
    payload: Buffer,
  ): Promise<void> {
    const binding =
      this.bindings.get(topic);

    if (!binding || !this.handler) {
      return;
    }

    const value = this.parseValue(
      payload.toString(),
      binding.dataType,
    );

    await this.handler({
      componentId: binding.componentId,
      componentKey: binding.componentKey,
      parameterId: binding.parameterId,
      parameterKey: binding.parameterKey,
      bindingId: binding.id,
      value,
      timestamp: new Date(),
      protocol: "MQTT",
      sourceAddress: topic,
      quality: "GOOD",
    });
  }

  public async write(
    binding: ParameterBinding,
    value: TelemetryValue,
  ): Promise<void> {
    if (!this.client) {
      throw new Error("MQTT client is not connected");
    }

    if (!binding.writable) {
      throw new Error(`Parameter ${binding.parameterKey} is read-only`);
    }

    if (!binding.writeAddress) {
      throw new Error("MQTT writeAddress is not configured");
    }

    await this.client.publishAsync(
      binding.writeAddress,
      String(value),
      {
        qos: 1,
      },
    );
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.endAsync();
      this.client = null;
    }
  }

  private parseBoolean(value: string): boolean {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1"
    ) {
      return true;
    }
    if (
      normalized === "false" ||
      normalized === "0"
    ) {
      return false;
    }

    throw new Error(`Cannot convert "${value}" to BOOLEAN`);
  }

  private parseInt32(value: string): number {
    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed < -2147483648 ||
      parsed > 2147483647
    ) {
      throw new Error(`Cannot convert "${value}" to INT32`);
    }

    return parsed;
  }

  private parseInt64(value: string): string {
    const normalized = value.trim();

    if (!/^-?\d+$/.test(normalized)) {
      throw new Error(`Cannot convert "${value}" to INT64`);
    }

    const parsed = BigInt(normalized);
    const min = -(2n ** 63n);
    const max = 2n ** 63n - 1n;

    if (
      parsed < min ||
      parsed > max
    ) {
      throw new Error(`INT64 value "${value}" is out of range`);
    }

    return normalized;
  }

  private parseFloatValue(value: string): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new Error(`Cannot convert "${value}" to floating-point number`);
    }

    return parsed;
  }

  private parseJson(value: string): TelemetryValue {
    try {
      return JSON.parse(value) as TelemetryValue;
    } catch {
      throw new Error(`Cannot parse MQTT payload as JSON: ${value}`);
    }
  }

  private assertNever(value: never): never {
    throw new Error(
      `Unsupported parameter data type: ${String(value)}`,
    );
  }

  private parseValue(
    value: string,
    type: ParameterDataType,
  ): TelemetryValue {
    switch (type) {
      case "BOOLEAN":
        return this.parseBoolean(value);
      case "STRING":
        return value;
      case "INT32":
        return this.parseInt32(value);
      case "INT64":
        return this.parseInt64(value);
      case "FLOAT":
      case "DOUBLE":
        return this.parseFloatValue(value);
      case "JSON":
        return this.parseJson(value);
      default:
        return this.assertNever(type);
    }
  }
}
