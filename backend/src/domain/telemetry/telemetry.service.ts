import type { TelemetryPoint } from "../digital-twin/digital-twin.types.js";
import type { DigitalTwinService } from "../digital-twin/digital-twin.service.js";
import type { TelemetryRepository } from "../../infrastructure/repositories/telemetry.repository.js";

export class TelemetryService {
  constructor(
    private readonly digitalTwin: DigitalTwinService,
    private readonly repository: TelemetryRepository,
  ) {}

  public async ingest(
    point: TelemetryPoint,
  ): Promise<void> {
    console.log(
      "[TelemetryService] ingest:",
      point.componentKey,
      point.parameterKey,
      point.value,
    );

    // Обновляем текущее состояние
    this.digitalTwin.ingest(point);

    console.log(
      "[TelemetryService] current state:",
      this.digitalTwin.getSnapshot(),
    );

    // Сохраняем историю
    await this.repository.save(point);
  }
}
