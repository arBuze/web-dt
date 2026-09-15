import type { FastifyInstance } from "fastify";
import type {
  DigitalTwinService,
  TelemetryUpdateListener,
} from "../../domain/digital-twin/digital-twin.service.js";
import type { TelemetryUpdateDto } from "../dto/telemetry.dto.js";

import { Server } from "socket.io";
import { toTelemetryUpdateDto } from "../dto/telemetry.dto.js";

interface ServerToClientEvents {
  "telemetry:update": (point: TelemetryUpdateDto) => void;
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

  public start(): void {
    this.digitalTwin.onUpdated(this.telemetryListener);

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
    this.io.local.disconnectSockets(true);
  }
}
