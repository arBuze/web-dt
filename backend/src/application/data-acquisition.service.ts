import type { IndustrialAdapter } from "../integrations/common/industrial-adapter.js";
import type { ParameterBinding } from "../domain/digital-twin/digital-twin.types.js";
import type { DataSourceRepository } from "../infrastructure/repositories/data-sourse.repository.js";
import type { TelemetryService } from "../domain/telemetry/telemetry.service.js";

import { createIndustrialAdapter } from "../integrations/industrial-adapter.factory.js";

export class DataAcquisitionService {
  private readonly adapters: IndustrialAdapter[] = [];

  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly telemetryService: TelemetryService,
  ) {}

  public async start(): Promise<void> {
    const sources =
      await this.dataSourceRepository
        .findEnabledWithBindings();

    console.log( "[DataAcquisition] Sources:", sources.length);

    for (const source of sources) {
      console.log(
        `[DataAcquisition] Source ${source.key}:`,
        source.protocol,
        source.endpoint,
        `bindings=${source.bindings.length}`,
      );
      if (source.bindings.length === 0) {
        continue;
      }

      const adapter = createIndustrialAdapter({
        protocol: source.protocol,
        endpoint: source.endpoint,
      });

      const bindings: ParameterBinding[] =
        source.bindings.map(
          (binding) => ({
            id: binding.id,
            parameterId: binding.parameterId,
            dataSourceId: binding.dataSourceId,
            componentId: binding.parameter.component.id,
            componentKey: binding.parameter.component.key,
            parameterKey: binding.parameter.key,
            protocol: source.protocol,
            address: binding.address,
            writeAddress: binding.writeAddress,
            selector: binding.selector,
            dataType: binding.parameter.dataType,
            writable: binding.parameter.writable,
            samplingIntervalMs: binding.samplingIntervalMs,
            deadband: binding.deadband,
          }),
        );

      try {
        await adapter.connect();

        console.log(`[DataAcquisition] Connected: ${source.key}`);
        console.log(
          "[DataAcquisition] Subscribing:",
          bindings.map(
            (binding) => binding.address,
          ),
        );

        await adapter.subscribe(
          bindings,
          async (point) => {
            console.log(
              "[DataAcquisition] Telemetry:",
              point.componentKey,
              point.parameterKey,
              point.value,
            );
            await this
              .telemetryService
              .ingest(point);
          },
        );

        this.adapters.push(adapter);
      } catch (error) {
        console.error(
          `Cannot start data source ${source.key}`,
          error,
        );
      }
    }
  }

  public async stop(): Promise<void> {
    await Promise.allSettled(
      this.adapters.map(
        (adapter) =>
          adapter.disconnect(),
      ),
    );

    this.adapters.length = 0;
  }
}
