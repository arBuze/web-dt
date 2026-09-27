import type {
  ParameterBinding,
  ParameterDataType,
} from "../domain/digital-twin/digital-twin.types.js";
import type {
  ControlValue,
  IndustrialWriteResult,
} from "../integrations/common/industrial-adapter.js";
import type { DataAcquisitionService } from "./data-acquisition.service.js";
import type { ParameterRepository } from "../infrastructure/repositories/parameter.repository.js";
import type { ControlCommandRepository } from "../infrastructure/repositories/control-command.repository.js";

export interface ControlRequest {
  componentKey: string;
  parameterKey: string;
  value: ControlValue;
  dataSourceKey: string | null;
}

export interface ControlResult {
  componentKey: string;
  parameterKey: string;
  value: ControlValue;
  dataSourceKey: string;
  result: IndustrialWriteResult;
}

export class ControlService {
  constructor(
    private readonly parameterRepository: ParameterRepository,
    private readonly dataAcquisition: DataAcquisitionService,
    private readonly commandRepository: ControlCommandRepository
  ) {}

  public async write(request: ControlRequest): Promise<ControlResult> {
    const parameter =
      await this.parameterRepository
        .findControl(
          request.componentKey,
          request.parameterKey
        );

    const command = 
      await this.commandRepository
        .createRequested({
          componentKey: request.componentKey,
          parameterKey: request.parameterKey,
          parameterId: parameter?.id ?? null,
          value: request.value,
        });

    if (!parameter) {
      await this.commandRepository.markRejected(
        command.id,
        "PARAMETER_NOT_FOUND",
        "Parameter not found"
      );

      throw new Error("PARAMETER_NOT_FOUND");
    }

    if (!parameter.writable) {
      await this.commandRepository.markRejected(
        command.id,
        "PARAMETER_READ_ONLY",
        "Parameter is read-only"
      );

      throw new Error("PARAMETER_READ_ONLY");
    }

    try {
      this.validateValue(
        request.value,
        parameter.dataType,
        parameter.minValue,
        parameter.maxValue
      );
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "VALIDATION_FAILED";

      await this.commandRepository.markRejected(
        command.id,
        message,
        message,
      );

      throw error;
    }
    

    let bindings = parameter.bindings.filter(
      (binding) => this.dataAcquisition.hasAdapter(binding.dataSourceId)
    );

    if (request.dataSourceKey) {
      bindings = bindings.filter(
        (binding) =>
          binding.dataSource.key
          === request.dataSourceKey,
      );
    }

    if (bindings.length === 0) {
      throw new Error("NO_WRITABLE_DATA_SOURCE");
    }

    if (
      bindings.length > 1
      && !request.dataSourceKey
    ) {
      throw new Error("MULTIPLE_DATA_SOURCES");
    }

    const {
      id,
      parameterId,
      dataSourceId,
      dataSource,
      address,
      writeAddress,
      selector,
      samplingIntervalMs,
      deadband,
    } = bindings[0]!;

    const domainBinding: ParameterBinding = {
      id,
      parameterId,
      dataSourceId,
      componentId: parameter.component.id,
      componentKey: parameter.component.key,
      parameterKey: parameter.key,
      protocol: dataSource.protocol,
      address,
      writeAddress,
      selector,
      dataType: parameter.dataType,
      writable: parameter.writable,
      samplingIntervalMs,
      deadband,
    };

    try {
      const result = await this.dataAcquisition.write(
        domainBinding,
        request.value
      );

      await this.commandRepository.markSuccess(
        command.id,
        {
          dataSourceId,
          dataSourceKey: dataSource.key,
          bindingId: id,
          protocol: dataSource.protocol,
          resultStatus: result.status,
        }
      );

      return {
        componentKey: parameter.component.key,
        parameterKey: parameter.key,
        value: request.value,
        dataSourceKey: dataSource.key,
        result,
      };
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unknown control error";

      await this.commandRepository.markFailed(
        command.id,
        "INDUSTRIAL_WRITE_FAILED",
        message
      );

      throw error;
    }
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported parameter data type: ${String(value)}`);
  }

  private validateValue(
    value: ControlValue,
    dataType: ParameterDataType,
    minValue: number | null,
    maxValue: number | null
  ): void {
    const invalidTypeError = "INVALID_PARAMETER_TYPE";

    switch (dataType) {
      case "BOOLEAN": {
        if (typeof value !== "boolean") {
          throw new Error(invalidTypeError);
        }

        return;
      }
      case "INT32": {
        if (
          typeof value !== "number"
          || !Number.isInteger(value)
          || value < -2147483648
          || value > 2147483647
        ) {
          throw new Error(invalidTypeError);
        }

        this.validateRange(
          value,
          minValue,
          maxValue
        );

        return;
      }
      case "FLOAT":
      case "DOUBLE": {
        if (
          typeof value !== "number"
          || !Number.isFinite(value)
        ) {
          throw new Error(invalidTypeError);
        }

        this.validateRange(
          value,
          minValue,
          maxValue
        );

        return;
      }
      case "STRING": {
        if (typeof value !== "string") {
          throw new Error(invalidTypeError);
        }

        return;
      }
      case "INT64":
        throw new Error("INT64_WRITE_NOT_IMPLEMENTED");
      case "JSON":
        throw new Error("JSON_WRITE_NOT_IMPLEMENTED");
      default:
        return this.assertNever(dataType);
    }
  }

  private validateRange(
    value: number,
    minValue: number | null,
    maxValue: number | null
  ): void {
    if (
      minValue !== null
      && value < minValue
    ) {
      throw new Error("VALUE_BELOW_MINIMUM");
    }

    if (
      maxValue !== null
      && value > maxValue
    ) {
      throw new Error("VALUE_ABOVE_MAXIMUM");
    }
  }
}
