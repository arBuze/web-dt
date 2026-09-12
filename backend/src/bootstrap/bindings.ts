import type {
  ParameterBinding,
} from "../domain/digital-twin/digital-twin.types.js";

export const parameterBindings:
  ParameterBinding[] = [
    {
      id: "mqtt-temperature",
      protocol: "MQTT",
      componentId: "machine-01",
      parameterKey: "temperature",
      address: "factory/machine-01/temperature",
      dataType: "Double",
      writable: false,
    },

    // Пример для Plant Simulation:
    //
    // {
    //   id: "opc-speed",
    //   protocol: "OPC_UA",
    //   componentId: "machine-01",
    //   parameterKey: "speed",
    //   address:
    //     "ns=2;s=Machine01.Speed",
    //   dataType: "Double",
    //   writable: true,
    // },
  ];