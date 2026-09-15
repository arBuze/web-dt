import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .string()
  .default("false")
  .transform((value) => value.toLowerCase() === "true");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),
  DATABASE_URL: z.string().min(1),
  MIGRATION_DATABASE_URL: z.string().min(1),
  SHADOW_DATABASE_URL: z.string().min(1),
  MQTT_ENABLED: booleanFromString,
  MQTT_URL: z.string().default("mqtt://127.0.0.1:1883"),
  OPCUA_ENABLED: booleanFromString,
  OPCUA_ENDPOINT: z
    .string()
    .default("opc.tcp://127.0.0.1:4840"),
  FRONTEND_ORIGIN: z
    .string()
    .default("http://localhost:5173"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment variables:",
    result.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = result.data;
