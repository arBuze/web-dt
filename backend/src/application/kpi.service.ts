import type { KpiRepository } from "../infrastructure/repositories/kpi.repository.js";

export interface KpiResult {
  componentKey: string;
  period: {
    from: string;
    to: string;
    seconds: number;
  };
  runtimeSeconds: number;
  downtimeSeconds: number;
  totalProduced: number;
  goodProduced: number;
  averageCycleTimeSeconds: number | null;
  availability: number;
  performance: number | null;
  quality: number | null;
  oee: number | null;
  dataCompleteness: number;
  warnings: string[];
}

export class KpiService {
  constructor(private readonly repository: KpiRepository) {}

  public async calculate(
    componentKey: string,
    from: Date,
    to: Date
  ): Promise<KpiResult | null> {
    const config = await this.repository.findConfig(componentKey);

    if (!config) {
      return null;
    }

    const deltaTime = to.getTime() - from.getTime()
    const plannedSeconds = Math.max(0, deltaTime / 1000);

    if (plannedSeconds === 0) {
      throw new Error("INVALID_KPI_PERIOD");
    }

    const previousState =
      await this.repository.findLatestBefore(
        config.stateParameterId,
        from
      );

    const stateReadings =
      await this.repository.findReadings(
        config.stateParameterId,
        from,
        to
      );

    const stateResult = this.calculateRuntime(
      previousState?.stringValue ?? null,
      stateReadings,
      from,
      to,
      config.runningStateValue
    );

    const totalProduced =
      await this.calculateCounterDelta(
        config.totalCountParameterId,
        from,
        to
      );

    const goodProduced =
      await this.calculateCounterDelta(
        config.goodCountParameterId,
        from,
        to
      );

    // ------------------------------------
    // KPI
    // ------------------------------------

    const availability = stateResult.runtimeSeconds / plannedSeconds;
    const performance = stateResult.runtimeSeconds > 0
      ? (
          config.idealCycleTimeSeconds
          * totalProduced
        )
        / stateResult.runtimeSeconds
      : null;

    const quality = totalProduced > 0
      ? goodProduced / totalProduced
      : null;

    const oee =
      performance !== null
      && quality !== null
        ? availability * performance * quality
        : null;

    const averageCycleTimeSeconds = totalProduced > 0
      ? stateResult.runtimeSeconds / totalProduced
      : null;

    const warnings: string[] = [];

    if (stateResult.knownSeconds < plannedSeconds) {
      warnings.push("State telemetry does not cover the complete requested period");
    }

    if (
      performance !== null
      && performance > 1
    ) {
      warnings.push("Performance is above 100%; check ideal cycle time or production counter configuration");
    }

    if (goodProduced > totalProduced) {
      warnings.push("Good production count is greater than total production count");
    }

    return {
      componentKey: config.component.key,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        seconds: plannedSeconds,
      },
      runtimeSeconds: stateResult.runtimeSeconds,
      downtimeSeconds:
        Math.max(
          0,
          plannedSeconds - stateResult.runtimeSeconds,
        ),
      totalProduced,
      goodProduced,
      averageCycleTimeSeconds,
      availability,
      performance,
      quality,
      oee,
      dataCompleteness: stateResult.knownSeconds / plannedSeconds,
      warnings,
    };
  }

  private calculateRuntime(
    initialState: string | null,
    readings: Array<{
      timestamp: Date;
      stringValue: string | null;
    }>,
    from: Date,
    to: Date,
    runningStateValue: string
  ) {
    let currentState = initialState;
    let cursor = from;
    let runtimeSeconds = 0;
    let knownSeconds = 0;

    for (const reading of readings) {
      const segmentSeconds = (reading.timestamp.getTime() - cursor.getTime()) / 1000;

      if (currentState !== null) {
        knownSeconds += segmentSeconds;

        if (currentState === runningStateValue) {
          runtimeSeconds += segmentSeconds;
        }
      }

      currentState = reading.stringValue;
      cursor = reading.timestamp;
    }

    const finalSeconds = (to.getTime() - cursor.getTime()) / 1000;

    if (currentState !== null) {
      knownSeconds += finalSeconds;

      if (currentState === runningStateValue) {
        runtimeSeconds += finalSeconds;
      }
    }

    return {
      runtimeSeconds: Math.max(0, runtimeSeconds),
      knownSeconds:Math.max(0, knownSeconds),
    };
  }

  private async calculateCounterDelta(
    parameterId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    const previous =
      await this.repository.findLatestBefore(
        parameterId,
        from
      );

    const readings =
      await this.repository.findReadings(
        parameterId,
        from,
        to
      );

    let previousValue = previous?.numberValue ?? null;
    let produced = 0;

    for (const reading of readings) {
      const current = reading.numberValue;

      if (current === null) {
        continue;
      }

      if (previousValue === null) {
        previousValue = current;

        continue;
      }

      const difference = current - previousValue;

      if (difference >= 0) {
        produced += difference;
      } else {
        // Счётчик был сброшен.
        produced += current;
      }

      previousValue = current;
    }

    return produced;
  }
}
