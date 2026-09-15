import { EventEmitter } from "node:events";

import type { TelemetryPoint } from "./digital-twin.types.js";

export type TelemetryUpdateListener = (point: TelemetryPoint) => void;

export class DigitalTwinService extends EventEmitter {
  private readonly state = new Map<
    string,
    Map<string, TelemetryPoint>
  >();

  public onUpdated(listener: TelemetryUpdateListener): void {
    this.on("updated", listener);
  }

  public offUpdated(listener: TelemetryUpdateListener): void {
    this.off("updated", listener);
  }

  public ingest(point: TelemetryPoint): void {
    let componentState = this.state.get(point.componentKey);

    if (!componentState) {
      componentState = new Map();
      this.state.set(
        point.componentKey,
        componentState
      );
    }

    componentState.set(
      point.parameterKey,
      point
    );

    this.emit("updated", point);
  }

  public getComponentState(
    componentKey: string,
  ): Record<string, TelemetryPoint> | null {
    const componentState = this.state.get(componentKey);

    if (!componentState) {
      return null;
    }

    return Object.fromEntries(
      componentState.entries(),
    );
  }

  public getSnapshot(): Record<
    string,
    Record<string, TelemetryPoint>
  > {
    const result: Record<
      string,
      Record<string, TelemetryPoint>
    > = {};

    for (
      const [componentId, parameters]
      of this.state.entries()
    ) {
      result[componentId] =
        Object.fromEntries(
          parameters.entries(),
        );
    }

    return result;
  }
}
