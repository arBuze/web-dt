import type { FastifyInstance } from "fastify";

import type { AlarmRepository } from "../../infrastructure/repositories/alarm.repository.js";

export async function registerAlarmRoutes(
  app: FastifyInstance,
  repository: AlarmRepository,
): Promise<void> {
  app.get(
    "/api/v1/alarms/active",
    async () => repository.findActive()
  );

  app.get(
    "/api/v1/alarms",
    async () => repository.findRecent(100)
  );
}
