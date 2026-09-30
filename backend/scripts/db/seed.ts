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

  await prisma.alarmRule.upsert({
    where: {
      key: "machine-01-high-temperature",
    },
    update: {
      parameterId: temperature.id,
      condition: "ABOVE",
      threshold: 80,
      clearThreshold: 75,
      severity: "CRITICAL",
      message: "Machine temperature is above the allowed operating threshold",
      enabled: true,
    },
    create: {
      key: "machine-01-high-temperature",
      name: "Machine 01 High Temperature",
      parameterId: temperature.id,
      condition: "ABOVE",
      threshold: 80,
      clearThreshold: 75,
      severity: "CRITICAL",
      message: "Machine temperature is above the allowed operating threshold",
      enabled: true,
    },
  });

  const speed =
    await prisma.parameter.upsert({
      where: {
        componentId_key: {
          componentId: machine.id,
          key: "speed",
        },
      },
      update: {
        name: "Speed",
        dataType: "DOUBLE",
        unit: "rpm",
        readable: true,
        writable: true,
        minValue: 0,
        maxValue: 3000,
        isActive: true,
      },
      create: {
        componentId: machine.id,
        key: "speed",
        name: "Speed",
        dataType: "DOUBLE",
        unit: "rpm",
        readable: true,
        writable: true,
        minValue: 0,
        maxValue: 3000,
      },
    });

  const machineState =
    await prisma.parameter.upsert({
      where: {
        componentId_key: {
          componentId:
            machine.id,

          key:
            "state",
        },
      },

      update: {
        name:
          "Machine State",

        dataType:
          "STRING",

        readable:
          true,

        writable:
          false,

        isActive:
          true,
      },

      create: {
        componentId:
          machine.id,

        key:
          "state",

        name:
          "Machine State",

        dataType:
          "STRING",

        readable:
          true,

        writable:
          false,
      },
    });

  const totalCount =
    await prisma.parameter.upsert({
      where: {
        componentId_key: {
          componentId:
            machine.id,

          key:
            "total-count",
        },
      },

      update: {
        name:
          "Total Produced",

        dataType:
          "INT32",

        readable:
          true,

        writable:
          false,

        isActive:
          true,
      },

      create: {
        componentId:
          machine.id,

        key:
          "total-count",

        name:
          "Total Produced",

        dataType:
          "INT32",

        unit:
          "pcs",

        readable:
          true,

        writable:
          false,
      },
    });

  const goodCount =
    await prisma.parameter.upsert({
      where: {
        componentId_key: {
          componentId:
            machine.id,

          key:
            "good-count",
        },
      },

      update: {
        name:
          "Good Produced",

        dataType:
          "INT32",

        readable:
          true,

        writable:
          false,

        isActive:
          true,
      },

      create: {
        componentId:
          machine.id,

        key:
          "good-count",

        name:
          "Good Produced",

        dataType:
          "INT32",

        unit:
          "pcs",

        readable:
          true,

        writable:
          false,
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
        parameterId: speed.id,
        dataSourceId: mqtt.id,
        address: "factory/machine-01/speed",
      },
    },
    update: {
      enabled: true,
      writeAddress: "factory/machine-01/commands/speed",
    },
    create: {
      parameterId: speed.id,
      dataSourceId: mqtt.id,
      address: "factory/machine-01/speed",
      writeAddress: "factory/machine-01/commands/speed",
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

  await prisma.parameterBinding.upsert({
    where: {
      parameterId_dataSourceId_address: {
        parameterId: machineState.id,
        dataSourceId: mqtt.id,
        address: "factory/machine-01/state",
      },
    },
    update: {
      enabled: true,
    },
    create: {
      parameterId: machineState.id,
      dataSourceId: mqtt.id,
      address: "factory/machine-01/state",
      enabled: true,
    },
  });

  await prisma.parameterBinding.upsert({
    where: {
      parameterId_dataSourceId_address: {
        parameterId: totalCount.id,
        dataSourceId: mqtt.id,
        address: "factory/machine-01/total-count",
      },
    },
    update: {
      enabled: true,
    },
    create: {
      parameterId: totalCount.id,
      dataSourceId: mqtt.id,
      address: "factory/machine-01/total-count",
      enabled: true,
    },
  });

  await prisma.parameterBinding.upsert({
    where: {
      parameterId_dataSourceId_address: {
        parameterId: goodCount.id,
        dataSourceId: mqtt.id,
        address: "factory/machine-01/good-count",
      },
    },
    update: {
      enabled: true,
    },
    create: {
      parameterId: goodCount.id,
      dataSourceId: mqtt.id,
      address: "factory/machine-01/good-count",
      enabled: true,
    },
  });

  await prisma.kpiConfig.upsert({
    where: {
      componentId: machine.id,
    },
    update: {
      stateParameterId: machineState.id,
      totalCountParameterId: totalCount.id,
      goodCountParameterId: goodCount.id,
      runningStateValue: "RUNNING",
      idealCycleTimeSeconds: 1,
      enabled: true,
    },
    create: {
      componentId: machine.id,
      stateParameterId: machineState.id,
      totalCountParameterId: totalCount.id,
      goodCountParameterId: goodCount.id,
      runningStateValue: "RUNNING",
      idealCycleTimeSeconds: 1,
      enabled:true,
    },
  });

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
