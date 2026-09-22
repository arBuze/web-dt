import {
  AttributeIds,
  type ClientSession,
  ClientSubscription,
  DataType,
  OPCUAClient,
  TimestampsToReturn,
} from "node-opcua";

import type {
  ControlValue,
  IndustrialAdapter,
  IndustrialWriteResult,
  TelemetryHandler,
} from "../common/industrial-adapter.js";

import type {
  ParameterBinding,
  ParameterDataType,
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

  constructor(private readonly endpoint: string) {
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
      this.endpoint,
    );

    this.session = await this.client.createSession();
  }

  public isConnected(): boolean {
    return this.session !== null;
  }

  public async subscribe(
    bindings: ParameterBinding[],
    handler: TelemetryHandler,
  ): Promise<void> {
    if (!this.session) {
      throw new Error("OPC UA session is not active");
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

    const opcBindings = bindings.filter(
      (binding) => binding.protocol === "OPC_UA"
    );

    for (const binding of opcBindings) {
      const monitoredItem =
        await this.subscription.monitor(
          {
            nodeId: binding.address,
            attributeId: AttributeIds.Value,
          },
          {
            samplingInterval: binding.samplingIntervalMs ?? 500,
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
            componentKey: binding.componentKey,
            parameterId: binding.parameterId,
            parameterKey: binding.parameterKey,
            bindingId: binding.id,
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

  private assertNever(value: never): never {
    throw new Error(`Unsupported parameter data type: ${String(value)}`);
  }

  private toOpcUaDataType(type: ParameterDataType): DataType {
    switch (type) {
      case "BOOLEAN":
        return DataType.Boolean;
      case "INT32":
        return DataType.Int32;
      case "INT64":
        return DataType.Int64;
      case "FLOAT":
        return DataType.Float;
      case "DOUBLE":
        return DataType.Double;
      case "STRING":
        return DataType.String;
      case "JSON":
        throw new Error("JSON OPC UA write is not supported");
      default:
        return this.assertNever(type);
    }
  }

  public async write(
    binding: ParameterBinding,
    value: ControlValue,
  ): Promise<IndustrialWriteResult> {
    if (!this.session) {
      throw new Error("OPC UA seccion is not active");
    }

    if (!binding.writable) {
      throw new Error(`Parameter ${binding.parameterKey} is read-only`);
    }

    const nodeId = binding.writeAddress ?? binding.address;
    const dataType = this.toOpcUaDataType(binding.dataType);

    const statusCode = await this.session.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType,
          value,
        },
      },
    });

    const status = statusCode.toString();

    console.log("[OPC UA] Write status: ", status);

    if (!status.startsWith("Good")) {
      throw new Error(`OPC UA write failed: ${status}`);
    }
    
    return {
      protocol: "OPC_UA",
      status: "ACKNOWLEDGED",
      details: status,
    };
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
