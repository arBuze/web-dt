import {
  connectAsync,
  type MqttClient,
} from "mqtt";

import { env } from "../../config/env.js";

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

  public async connect(): Promise<void> {
    if (this.client?.connected) {
      return;
    }

    this.client = await connectAsync(
      env.MQTT_URL,
      {
        reconnectPeriod: 2000,
      },
    );

    this.client.on(
      "message",
      (topic, payload) => {
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
      throw new Error(
        "MQTT client is not connected",
      );
    }

    this.handler = handler;

    const mqttBindings =
      bindings.filter(
        (binding) =>
          binding.protocol === "MQTT",
      );

    for (const binding of mqttBindings) {
      this.bindings.set(
        binding.address,
        binding,
      );

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
      parameterKey: binding.parameterKey,
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
      throw new Error(
        "MQTT client is not connected",
      );
    }

    if (!binding.writable) {
      throw new Error(
        `Parameter ${binding.parameterKey} is read-only`,
      );
    }

    if (!binding.writeAddress) {
      throw new Error(
        "MQTT writeAddress is not configured",
      );
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

  private parseValue(
    value: string,
    type: ParameterDataType,
  ): TelemetryValue {
    switch (type) {
      case "Boolean":
        return (
          value === "true" ||
          value === "1"
        );
      case "Int32":
        return Number.parseInt(
          value,
          10,
        );
      case "Double":
        return Number.parseFloat(
          value,
        );
      case "String":
        return value;
    }
  }
}
