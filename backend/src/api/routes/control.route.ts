import type { FastifyInstance } from "fastify";

import { z } from "zod";

import type { ControlService } from "../../application/control.service.js";
import type { ControlCommandRepository } from "../../infrastructure/repositories/control-command.repository.js";

const bodySchema = z.object({
  value: z.union([
    z.boolean(),
    z.number(),
    z.string(),
  ]),
  dataSourceKey: z.string()
    .min(1)
    .optional(),
});

interface ControlParams {
  componentKey: string;
  parameterKey: string;
}

export async function registerControlRoutes(
  app: FastifyInstance,
  controlService: ControlService,
  commandRepository: ControlCommandRepository
): Promise<void> {
  app.put<{ Params: ControlParams; }>(
    "/api/v1/components/:componentKey/parameters/:parameterKey",
    async (
      request,
      reply,
    ) => {
      const parsed = bodySchema.safeParse(
        request.body,
      );

      if (!parsed.success) {
        return reply
          .code(400)
          .send({
            message: "Invalid request body",
            errors: z.treeifyError(parsed.error),
          });
      }

      try {
        const result =
          await controlService.write({
            componentKey: request.params.componentKey,
            parameterKey: request.params.parameterKey,
            value: parsed.data.value,
            dataSourceKey:
              parsed.data.dataSourceKey
              ?? null,
          });

        return {
          success: true,
          ...result,
        };

      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }

        switch (error.message) {
          case "PARAMETER_NOT_FOUND":
            return reply
              .code(404)
              .send({ message: "Parameter not found" });
          case "PARAMETER_READ_ONLY":
            return reply
              .code(403)
              .send({ message: "Parameter is read-only" });
          case "INVALID_PARAMETER_TYPE":
          case "VALUE_BELOW_MINIMUM":
          case "VALUE_ABOVE_MAXIMUM":
            return reply
              .code(422)
              .send({ message: error.message });
          case "NO_WRITABLE_DATA_SOURCE":
            return reply
              .code(503)
              .send({ message: "No connected data source is available" });
          case "MULTIPLE_DATA_SOURCES":
            return reply
              .code(409)
              .send({ message: "Multiple data sources are available. Specify dataSourceKey." });
          default:
            throw error;
        }
      }
    },
  );

  app.get(
    "/api/v1/control-commands",
    async () => commandRepository.findRecent(100)
  );
}
