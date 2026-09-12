import Fastify from "fastify";
import cors from "@fastify/cors";

import {
  checkDatabaseConnection,
  prisma,
} from "./infrastructure/database/prisma.js";

import {
  DigitalTwinService,
} from "./domain/digital-twin/digital-twin.service.js";

import {
  MqttService,
} from "./integrations/mqtt/mqtt.service.js";

import {
  OpcUaService,
} from "./integrations/opcua/opcua.service.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  const digitalTwin = new DigitalTwinService();

  const mqtt = new MqttService();

  const opcUa = new OpcUaService();

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
          mqtt:
            mqtt.isConnected()
              ? "connected"
              : "disconnected",
          opcUa:
            opcUa.isConnected()
              ? "connected"
              : "disconnected",
        },
      };
    },
  );

  app.get<{
    Params: {
      componentId: string;
    };
  }>(
    "/api/v1/components/:componentId/state",

    async (
      request,
      reply,
    ) => {
      const state =
        digitalTwin.getComponentState(
          request.params.componentId,
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

  app.addHook(
    "onClose",
    async () => {
      await Promise.allSettled([
        mqtt.disconnect(),
        opcUa.disconnect(),
      ]);

      await prisma.$disconnect();
    },
  );

  return {
    app,
    digitalTwin,
    mqtt,
    opcUa,
  };
}
