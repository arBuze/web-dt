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

async function main() {
  const digitalTwin = new DigitalTwinService();
  const telemetryRepository = new TelemetryRepository();
  const parameterRepository = new ParameterRepository();
  const dataSourceRepository = new DataSourceRepository();
  const telemetryService = new TelemetryService(
    digitalTwin,
    telemetryRepository
  );
  const telemetryHistory = new TelemetryHistoryService(
    parameterRepository,
    telemetryRepository
  );
  const dataAcquisition = new DataAcquisitionService(
    dataSourceRepository,
    telemetryService
  );

  const app = await buildApp({
    digitalTwin,
    telemetryHistory,
  });

  const realtime = new RealtimeGateway(
    app,
    digitalTwin,
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
