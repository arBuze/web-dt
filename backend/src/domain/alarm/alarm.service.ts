import { EventEmitter } from "node:events";

import type { TelemetryPoint } from "../digital-twin/digital-twin.types.js";
import type { AlarmRepository } from "../../infrastructure/repositories/alarm.repository.js";

export class AlarmService extends EventEmitter {
  constructor(
    private readonly repository: AlarmRepository,
  ) {
    super();
  }

  public async process(point: TelemetryPoint): Promise<void> {
    if (typeof point.value !== "number") {
      return;
    }

    const rules =
      await this.repository
        .findRulesForParameter(point.parameterId);

    for (const rule of rules) {
      const active =
        await this.repository
          .findActiveForRule(rule.id);

      const triggered = this.isTriggered(
        point.value,
        rule.condition,
        rule.threshold,
      );

      if (triggered && !active) {
        const alarm =
          await this.repository.raise({
            ruleId: rule.id,
            parameterId: point.parameterId,
            value: point.value,
            severity: rule.severity,
            message: rule.message,
          });

        this.emit("raised", alarm);

        continue;
      }

      const shouldClear = this.shouldClear(
        point.value,
        rule.condition,
        rule.threshold,
        rule.clearThreshold,
      );

      if (active && shouldClear) {
        const alarm =
          await this.repository.clear(
            active.id,
            point.value,
          );

        this.emit("cleared", alarm);
      }
    }
  }

  private isTriggered(
    value: number,
    condition: "ABOVE" | "BELOW",
    threshold: number
  ): boolean {
    switch (condition) {
      case "ABOVE":
        return value >= threshold;
      case "BELOW":
        return value <= threshold;
      default:
        return this.assertNever(condition);
    }
  }

  private shouldClear(
    value: number,
    condition: "ABOVE" | "BELOW",
    threshold: number,
    clearThreshold: number | null
  ): boolean {
    const clear = clearThreshold ?? threshold;

    switch (condition) {
      case "ABOVE":
        return value <= clear;
      case "BELOW":
        return value >= clear;
      default:
        return this.assertNever(condition);
    }
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported alarm condition: ${String(value)}`);
  }
}
