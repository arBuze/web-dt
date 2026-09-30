-- CreateTable
CREATE TABLE "kpi_configs" (
    "id" UUID NOT NULL,
    "componentId" UUID NOT NULL,
    "stateParameterId" UUID NOT NULL,
    "totalCountParameterId" UUID NOT NULL,
    "goodCountParameterId" UUID NOT NULL,
    "runningStateValue" VARCHAR(100) NOT NULL DEFAULT 'RUNNING',
    "idealCycleTimeSeconds" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "kpi_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_configs_componentId_key" ON "kpi_configs"("componentId");

-- AddForeignKey
ALTER TABLE "kpi_configs" ADD CONSTRAINT "kpi_configs_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_configs" ADD CONSTRAINT "kpi_configs_stateParameterId_fkey" FOREIGN KEY ("stateParameterId") REFERENCES "parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_configs" ADD CONSTRAINT "kpi_configs_totalCountParameterId_fkey" FOREIGN KEY ("totalCountParameterId") REFERENCES "parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_configs" ADD CONSTRAINT "kpi_configs_goodCountParameterId_fkey" FOREIGN KEY ("goodCountParameterId") REFERENCES "parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
