import {
  prisma,
} from "../../src/infrastructure/database/prisma.ts";

async function main() {
  const machine =
    await prisma.component.upsert({
      where: {
        key: "machine-01",
      },
      update: {
        name: "Test Machine",
      },
      create: {
        key: "machine-01",
        name: "Test Machine",
        type: "machine",
      },
    });

  const temperature =
    await prisma.parameter.upsert({
      where: {
        componentId_key: {
          componentId: machine.id,
          key: "temperature",
        },
      },
      update: {},
      create: {
        componentId: machine.id,
        key: "temperature",
        name: "Temperature",
        dataType: "DOUBLE",
        unit: "°C",
        readable: true,
        writable: false,
        minValue: 0,
        maxValue: 100,
      },
    });

  const mqtt =
    await prisma.dataSource.upsert({
      where: {
        key: "local-mqtt",
      },
      update: {
        endpoint: "mqtt://127.0.0.1:1883",
      },
      create: {
        key: "local-mqtt",
        name: "Local MQTT Broker",
        protocol: "MQTT",
        endpoint: "mqtt://127.0.0.1:1883",
        enabled: true,
      },
    });

  await prisma.parameterBinding.upsert({
    where: {
      parameterId_dataSourceId_address: {
        parameterId: temperature.id,
        dataSourceId: mqtt.id,
        address: "factory/machine-01/temperature",
      },
    },
    update: {
      enabled: true,
    },
    create: {
      parameterId: temperature.id,
      dataSourceId: mqtt.id,
      address: "factory/machine-01/temperature",
      enabled: true,
    },
  });

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
