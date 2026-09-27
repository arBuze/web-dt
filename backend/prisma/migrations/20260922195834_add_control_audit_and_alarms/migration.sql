-- CreateEnum
CREATE TYPE "ControlCommandStatus" AS ENUM ('REQUESTED', 'SUCCESS', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlarmSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlarmCondition" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "AlarmStatus" AS ENUM ('ACTIVE', 'CLEARED');

-- CreateTable
CREATE TABLE "control_commands" (
    "id" UUID NOT NULL,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "componentKey" VARCHAR(100) NOT NULL,
    "parameterKey" VARCHAR(100) NOT NULL,
    "parameterId" UUID,
    "dataSourceId" UUID,
    "bindingId" UUID,
    "dataSourceKey" VARCHAR(100),
    "protocol" "IndustrialProtocol",
    "requestedValue" JSONB NOT NULL,
    "status" "ControlCommandStatus" NOT NULL DEFAULT 'REQUESTED',
    "resultStatus" VARCHAR(100),
    "errorCode" VARCHAR(100),
    "errorMessage" TEXT,

    CONSTRAINT "control_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarms" (
    "id" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "parameterId" UUID NOT NULL,
    "status" "AlarmStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMPTZ(6),
    "triggerValue" DOUBLE PRECISION NOT NULL,
    "clearValue" DOUBLE PRECISION,
    "severity" "AlarmSeverity" NOT NULL,
    "message" VARCHAR(500) NOT NULL,

    CONSTRAINT "alarms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_rules" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parameterId" UUID NOT NULL,
    "condition" "AlarmCondition" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "clearThreshold" DOUBLE PRECISION,
    "severity" "AlarmSeverity" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alarm_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "control_commands_requestedAt_idx" ON "control_commands"("requestedAt" DESC);

-- CreateIndex
CREATE INDEX "control_commands_componentKey_parameterKey_requestedAt_idx" ON "control_commands"("componentKey", "parameterKey", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "control_commands_status_idx" ON "control_commands"("status");

-- CreateIndex
CREATE INDEX "alarms_status_idx" ON "alarms"("status");

-- CreateIndex
CREATE INDEX "alarms_ruleId_status_idx" ON "alarms"("ruleId", "status");

-- CreateIndex
CREATE INDEX "alarms_startedAt_idx" ON "alarms"("startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "alarm_rules_key_key" ON "alarm_rules"("key");

-- CreateIndex
CREATE INDEX "alarm_rules_parameterId_idx" ON "alarm_rules"("parameterId");

-- AddForeignKey
ALTER TABLE "control_commands" ADD CONSTRAINT "control_commands_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_commands" ADD CONSTRAINT "control_commands_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_commands" ADD CONSTRAINT "control_commands_bindingId_fkey" FOREIGN KEY ("bindingId") REFERENCES "parameter_bindings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alarm_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_rules" ADD CONSTRAINT "alarm_rules_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
