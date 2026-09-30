import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { DigitalTwinService } from "./domain/digital-twin/digital-twin.service.js";
import { TelemetryRepository } from "./infrastructure/repositories/telemetry.repository.js";
import { DataSourceRepository } from "./infrastructure/repositories/data-sourse.repository.js";
import { TelemetryService } from "./domain/telemetry/telemetry.service.js";
import { DataAcquisitionService } from "./application/data-acquisition.service.js";
import { ParameterRepository } from "./infrastructure/repositories/parameter.repository.js";
import { TelemetryHistoryService } from "./application/telemetry-history.service.js";
import { RealtimeGateway } from "./api/realtime/realtime.gateway.js";
import { ControlService } from "./application/control.service.js";
import { AlarmRepository } from "./infrastructure/repositories/alarm.repository.js";
import { ControlCommandRepository } from "./infrastructure/repositories/control-command.repository.js";
import { AlarmService } from "./domain/alarm/alarm.service.js";
import { KpiService } from "./application/kpi.service.js";
import { KpiRepository } from "./infrastructure/repositories/kpi.repository.js";

async function main() {
  const digitalTwin = new DigitalTwinService();
  const telemetryRepository = new TelemetryRepository();
  const parameterRepository = new ParameterRepository();
  const dataSourceRepository = new DataSourceRepository();
  const alarmRepository = new AlarmRepository();
  const commandRepository = new ControlCommandRepository();
  const kpiRepository = new KpiRepository();

  const alarmService = new AlarmService(alarmRepository);
  const telemetryService = new TelemetryService(
    digitalTwin,
    telemetryRepository,
    alarmService
  );
  const telemetryHistory = new TelemetryHistoryService(
    parameterRepository,
    telemetryRepository
  );
  const dataAcquisition = new DataAcquisitionService(
    dataSourceRepository,
    telemetryService
  );
  const controlService = new ControlService(
    parameterRepository,
    dataAcquisition,
    commandRepository
  );
  const kpiService = new KpiService(kpiRepository);

  const app = await buildApp({
    digitalTwin,
    telemetryHistory,
    controlService,
    commandRepository,
    alarmRepository,
    kpiService,
  });

  const realtime = new RealtimeGateway(
    app,
    digitalTwin,
    alarmService,
    env.FRONTEND_ORIGIN
  );

  realtime.start();

  app.addHook(
    "preClose",
    async () => {
      realtime.stop();
    }
  );
  app.addHook(
    "onClose",
    async () => {
      app.log.info("Stopping data acquisition...");
      await dataAcquisition.stop();
      app.log.info("Disconnecting from database...");
      await prisma.$disconnect();
    }
  );

  await dataAcquisition.start();
  app.log.info("Data acquisition started");

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });
  app.log.info("Application started");
}

main().catch(
  async (error) => {
    console.error("Application startup failed:", error);

    await prisma
      .$disconnect()
      .catch(() => {});

    process.exit(1);
  }
);
