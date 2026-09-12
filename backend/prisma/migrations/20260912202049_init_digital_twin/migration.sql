-- CreateEnum
CREATE TYPE "IndustrialProtocol" AS ENUM ('OPC_UA', 'MQTT');

-- CreateEnum
CREATE TYPE "ParameterDataType" AS ENUM ('BOOLEAN', 'INT32', 'INT64', 'FLOAT', 'DOUBLE', 'STRING', 'JSON');

-- CreateTable
CREATE TABLE "components" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "visualization" JSONB,
    "parentId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters" (
    "id" UUID NOT NULL,
    "componentId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "dataType" "ParameterDataType" NOT NULL,
    "unit" VARCHAR(50),
    "readable" BOOLEAN NOT NULL DEFAULT true,
    "writable" BOOLEAN NOT NULL DEFAULT false,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "protocol" "IndustrialProtocol" NOT NULL,
    "endpoint" VARCHAR(500) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "credentialsRef" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_bindings" (
    "id" UUID NOT NULL,
    "parameterId" UUID NOT NULL,
    "dataSourceId" UUID NOT NULL,
    "address" VARCHAR(1000) NOT NULL,
    "writeAddress" VARCHAR(1000),
    "selector" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "samplingIntervalMs" INTEGER,
    "deadband" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parameter_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_readings" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parameterId" UUID NOT NULL,
    "bindingId" UUID,
    "protocol" "IndustrialProtocol" NOT NULL,
    "sourceAddress" VARCHAR(1000),
    "numberValue" DOUBLE PRECISION,
    "booleanValue" BOOLEAN,
    "stringValue" TEXT,
    "rawValue" JSONB,
    "quality" VARCHAR(100),

    CONSTRAINT "telemetry_readings_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateIndex
CREATE UNIQUE INDEX "components_key_key" ON "components"("key");

-- CreateIndex
CREATE INDEX "components_parentId_idx" ON "components"("parentId");

-- CreateIndex
CREATE INDEX "components_type_idx" ON "components"("type");

-- CreateIndex
CREATE INDEX "parameters_componentId_idx" ON "parameters"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "parameters_componentId_key_key" ON "parameters"("componentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_key_key" ON "data_sources"("key");

-- CreateIndex
CREATE INDEX "data_sources_protocol_idx" ON "data_sources"("protocol");

-- CreateIndex
CREATE INDEX "parameter_bindings_parameterId_idx" ON "parameter_bindings"("parameterId");

-- CreateIndex
CREATE INDEX "parameter_bindings_dataSourceId_idx" ON "parameter_bindings"("dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_bindings_parameterId_dataSourceId_address_key" ON "parameter_bindings"("parameterId", "dataSourceId", "address");

-- CreateIndex
CREATE INDEX "telemetry_readings_parameterId_timestamp_idx" ON "telemetry_readings"("parameterId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "telemetry_readings_bindingId_timestamp_idx" ON "telemetry_readings"("bindingId", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters" ADD CONSTRAINT "parameters_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_bindings" ADD CONSTRAINT "parameter_bindings_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_bindings" ADD CONSTRAINT "parameter_bindings_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_readings" ADD CONSTRAINT "telemetry_readings_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_readings" ADD CONSTRAINT "telemetry_readings_bindingId_fkey" FOREIGN KEY ("bindingId") REFERENCES "parameter_bindings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable TimescaleDB for this database.
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert telemetry table to a TimescaleDB hypertable.
SELECT create_hypertable(
    'telemetry_readings',
    by_range('timestamp'),
    if_not_exists => TRUE
);
