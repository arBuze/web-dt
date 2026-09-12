import {
  AttributeIds,
  type ClientSession,
  ClientSubscription,
  OPCUAClient,
  TimestampsToReturn,
} from "node-opcua";

import { env } from "../../config/env.js";

import type {
  IndustrialAdapter,
  TelemetryHandler,
} from "../common/industrial-adapter.js";

import type {
  ParameterBinding,
  TelemetryValue,
} from "../../domain/digital-twin/digital-twin.types.js";

export class OpcUaService implements IndustrialAdapter
{
  public readonly protocol = "OPC_UA" as const;

  private client: OPCUAClient;

  private session:
    | ClientSession
    | null = null;

  private subscription:
    | ClientSubscription
    | null = null;

  constructor() {
    this.client =
      OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 5,
          maxDelay: 5000,
        },
      });
  }

  public async connect(): Promise<void> {
    await this.client.connect(
      env.OPCUA_ENDPOINT,
    );

    this.session =
      await this.client.createSession();
  }

  public isConnected(): boolean {
    return this.session !== null;
  }

  public async subscribe(
    bindings: ParameterBinding[],
    handler: TelemetryHandler,
  ): Promise<void> {
    if (!this.session) {
      throw new Error(
        "OPC UA session is not active",
      );
    }

    this.subscription =
      await this.session.createSubscription2({
        requestedPublishingInterval: 500,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 20,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10,
      });

    const opcBindings =
      bindings.filter(
        (binding) =>
          binding.protocol ===
          "OPC_UA",
      );

    for (const binding of opcBindings) {
      const monitoredItem =
        await this.subscription.monitor(
          {
            nodeId: binding.address,
            attributeId: AttributeIds.Value,
          },
          {
            samplingInterval: 500,
            discardOldest: true,
            queueSize: 10,
          },
          TimestampsToReturn.Both,
        );

      monitoredItem.on(
        "changed",
        (dataValue) => {
          void handler({
            componentId: binding.componentId,
            parameterKey: binding.parameterKey,
            value: dataValue.value.value as TelemetryValue,
            timestamp:
              dataValue.sourceTimestamp ??
              new Date(),
            protocol: "OPC_UA",
            sourceAddress: binding.address,
            quality: dataValue.statusCode.toString(),
          });
        },
      );
    }
  }

  public async write(
    _binding: ParameterBinding,
    _value: TelemetryValue,
  ): Promise<void> {
    throw new Error(
      "OPC UA write is not implemented yet",
    );
  }

  public async disconnect(): Promise<void> {
    if (this.subscription) {
      await this.subscription.terminate();
      this.subscription = null;
    }

    if (this.session) {
      await this.session.close();
      this.session = null;
    }

    await this.client.disconnect();
  }
}
