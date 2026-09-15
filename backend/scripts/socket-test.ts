import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:3000");

socket.on(
  "connect",
  () => {
    console.log("Connected:", socket.id);
  }
);

socket.on(
  "telemetry:update",
  (point) => {
    console.log("Telemetry update:", point);
  }
);

socket.on(
  "disconnect",
  (reason) => {
    console.log("Disconnected:", reason);
  }
);
