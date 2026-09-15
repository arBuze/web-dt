import type { FastifyInstance } from "fastify";
import type { TelemetryHistoryService } from "../../application/telemetry-history.service.js";

import { z } from "zod";

const querySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(2000),
});

interface HistoryParams {
  componentKey: string;
  parameterKey: string;
}

export async function registerTelemetryRoutes(
  app: FastifyInstance,
  telemetryHistory: TelemetryHistoryService
): Promise<void> {
  app.get<{ Params: HistoryParams; }>(
    "/api/v1/components/:componentKey/parameters/:parameterKey/history",
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply
          .code(400)
          .send({
            message: "Invalid query parameters",
            errors: z.treeifyError(parsed.error),
          });
      }

      const dateTo = parsed.data.dateTo
        ? new Date(parsed.data.dateTo)
        : new Date();

      const dateFrom = parsed.data.dateFrom
        ? new Date(parsed.data.dateFrom)
        : new Date(dateTo.getTime() - 60 * 60 * 1000);

      if (
        Number.isNaN(dateFrom.getTime()) ||
        Number.isNaN(dateTo.getTime())
      ) {
        return reply
          .code(400)
          .send({ message: "Invalid date format" });
      }

      if (dateFrom > dateTo) {
        return reply
          .code(400)
          .send({ message: "'dateFrom' must be earlier than 'dateTo'" });
      }

      const result =
        await telemetryHistory.getHistory({
          componentKey: request.params.componentKey,
          parameterKey: request.params.parameterKey,
          dateFrom,
          dateTo,
          limit: parsed.data.limit,
        });

      if (!result) {
        return reply
          .code(404)
          .send({ message: "Parameter not found" });
      }

      return result;
    },
  );
}
