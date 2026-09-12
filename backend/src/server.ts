import { buildApp } from "./app.js";
import { env } from "./config/env.js";

import {
  parameterBindings,
} from "./bootstrap/bindings.js";

async function main() {
  const {
    app,
    digitalTwin,
    mqtt,
    opcUa,
  } = await buildApp();

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  const handler = (point: Parameters<
    typeof digitalTwin.ingest
  >[0]) => {
    digitalTwin.ingest(point);

    app.log.debug(
      {
        componentId: point.componentId,
        parameter: point.parameterKey,
        value: point.value,
        protocol: point.protocol,
      },
      "Telemetry received",
    );
  };

  if (env.MQTT_ENABLED) {
    try {
      await mqtt.connect();

      await mqtt.subscribe(
        parameterBindings,
        handler,
      );

      app.log.info(
        "MQTT connected",
      );
    } catch (error) {
      app.log.error(
        error,
        "MQTT connection failed",
      );
    }
  }

  if (env.OPCUA_ENABLED) {
    try {
      await opcUa.connect();

      await opcUa.subscribe(
        parameterBindings,
        handler,
      );

      app.log.info("OPC UA connected");
    } catch (error) {
      app.log.error(
        error,
        "OPC UA connection failed",
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
