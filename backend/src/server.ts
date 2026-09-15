import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { DigitalTwinService } from "./domain/digital-twin/digital-twin.service.js";
import { TelemetryRepository } from "./infrastructure/repositories/telemetry.repository.js";
import { DataSourceRepository } from "./infrastructure/repositories/data-sourse.repository.js";
import { TelemetryService } from "./domain/telemetry/telemetry.service.js";
import { DataAcquisitionService } from "./application/data-acquisition.service.js";

async function main() {
  const digitalTwin = new DigitalTwinService();
  const telemetryRepository = new TelemetryRepository();
  const dataSourceRepository = new DataSourceRepository();
  const telemetryService = new TelemetryService(
    digitalTwin,
    telemetryRepository,
  );
  const dataAcquisition = new DataAcquisitionService(
    dataSourceRepository,
    telemetryService,
  );

  const app = await buildApp({ digitalTwin });

  app.addHook(
    "onClose",
    async () => {
      app.log.info("Stopping data acquisition...");
      await dataAcquisition.stop();
      app.log.info("Disconnecting from database...");
      await prisma.$disconnect();
    },
  );

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  await dataAcquisition.start();
  app.log.info("Data acquisition started");
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
