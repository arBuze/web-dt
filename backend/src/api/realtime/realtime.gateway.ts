import type { FastifyInstance } from "fastify";
import type {
  DigitalTwinService,
  TelemetryUpdateListener,
} from "../../domain/digital-twin/digital-twin.service.js";
import type { TelemetryUpdateDto } from "../dto/telemetry.dto.js";

import { Server } from "socket.io";
import { toTelemetryUpdateDto } from "../dto/telemetry.dto.js";
import type { AlarmService } from "../../domain/alarm/alarm.service.js";

interface ServerToClientEvents {
  "telemetry:update": (point: TelemetryUpdateDto) => void;
  "alarm:raised": (alarm: unknown) => void;
  "alarm:cleared": (alarm: unknown) => void;
}

interface ClientToServerEvents {
  // пока пусто
}

export class RealtimeGateway {
  private readonly io: Server<
    ClientToServerEvents,
    ServerToClientEvents
  >;

  private readonly telemetryListener: TelemetryUpdateListener;

  constructor(
    private readonly app: FastifyInstance,
    private readonly digitalTwin: DigitalTwinService,
    private readonly alarmService: AlarmService,
    frontendOrigin: string
  ) {
    this.io = new Server(
      app.server,
      {
        cors: {
          origin: frontendOrigin,
        },
      },
    );

    this.telemetryListener = (point) => {
      this.io.emit(
        "telemetry:update",
        toTelemetryUpdateDto(point)
      );
    };
  }

  private readonly onAlarmRaised = (alarm: unknown) => {
    this.io.emit("alarm:raised", alarm);
  };

  private readonly onAlarmCleared = (alarm: unknown) => {
    this.io.emit("alarm:cleared", alarm);
  };

  public start(): void {
    this.digitalTwin.onUpdated(this.telemetryListener);

    this.alarmService.on("raised", this.onAlarmRaised);
    this.alarmService.on("cleared", this.onAlarmCleared);

    this.io.on(
      "connection",
      (socket) => {
        this.app.log.info(
          { socketId: socket.id },
          "Realtime client connected"
        );

        socket.on(
          "disconnect",
          (reason) => {
            this.app.log.info(
              {
                socketId: socket.id,
                reason,
              },
              "Realtime client disconnected"
            );
          }
        );
      },
    );
  }

  public stop(): void {
    this.digitalTwin.offUpdated(this.telemetryListener);

    this.alarmService.off("raised", this.onAlarmRaised);
    this.alarmService.off("cleared", this.onAlarmCleared);

    this.io.local.disconnectSockets(true);
  }
}
