import type { FastifyInstance } from "fastify";

import { z } from "zod";

import type { KpiService } from "../../application/kpi.service.js";

const querySchema =
  z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  });

interface KpiParams {
  componentKey: string;
}

export async function registerKpiRoutes(
  app: FastifyInstance,
  kpiService: KpiService
): Promise<void> {
  app.get<{ Params: KpiParams; }>(
    "/api/v1/components/:componentKey/kpi",
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid query parameters" });
      }

      const to = parsed.data.to
        ? new Date(parsed.data.to)
        : new Date();

      const from = parsed.data.from
        ? new Date(parsed.data.from)
        : new Date(to.getTime() - 60 * 60 * 1000);

      if (
        Number.isNaN(from.getTime())
        || Number.isNaN(to.getTime())
        || from >= to
      ) {
        return reply
          .code(400)
          .send({ message: "Invalid KPI period" });
      }

      const result =
        await kpiService.calculate(
          request.params.componentKey,
          from,
          to
        );

      if (!result) {
        return reply
          .code(404)
          .send({ message: "KPI configuration not found" });
      }

      return result;
    }
  );
}
