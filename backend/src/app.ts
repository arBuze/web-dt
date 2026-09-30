import Fastify from "fastify";
import cors from "@fastify/cors";

import type { TelemetryHistoryService } from "./application/telemetry-history.service.js";
import type { ControlService } from "./application/control.service.js";
import type { ControlCommandRepository } from "./infrastructure/repositories/control-command.repository.js";
import type { AlarmRepository } from "./infrastructure/repositories/alarm.repository.js";
import type { KpiService } from "./application/kpi.service.js";

import { checkDatabaseConnection } from "./infrastructure/database/prisma.js";
import { DigitalTwinService } from "./domain/digital-twin/digital-twin.service.js";
import { registerTelemetryRoutes } from "./api/routes/telemetry.route.js";
import { registerControlRoutes } from "./api/routes/control.route.js";
import { registerAlarmRoutes } from "./api/routes/alarm.route.js";
import { registerKpiRoutes } from "./api/routes/kpi.route.js";

interface AppDependencies {
  digitalTwin: DigitalTwinService;
  telemetryHistory: TelemetryHistoryService;
  controlService: ControlService;
  commandRepository: ControlCommandRepository;
  alarmRepository: AlarmRepository;
  kpiService: KpiService;
}

export async function buildApp(dependencies: AppDependencies) {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  const {
    digitalTwin,
    telemetryHistory,
    controlService,
    commandRepository,
    alarmRepository,
  } = dependencies;

  app.get(
    "/health",
    async () => {
      const database = await checkDatabaseConnection();

      return {
        status: "ok",
        services: {
          database:
            database
              ? "connected"
              : "disconnected",
        },
      };
    },
  );

  app.get<{
    Params: {
      componentKey: string;
    };
  }>(
    "/api/v1/components/:componentKey/state",
    async (request, reply) => {
      const state =
        digitalTwin.getComponentState(
          request.params.componentKey,
        );

      if (!state) {
        return reply
          .code(404)
          .send({
            message:
              "Component not found",
          });
      }

      return state;
    },
  );

  app.get(
    "/api/v1/state",
    async () => {
      return digitalTwin.getSnapshot();
    },
  );

  await registerTelemetryRoutes(
    app,
    telemetryHistory
  );

  await registerControlRoutes(
    app,
    controlService,
    commandRepository
  );

  await registerAlarmRoutes(
    app,
    alarmRepository
  );

  await registerKpiRoutes(
    app,
    dependencies.kpiService
  );

  return app;
}
