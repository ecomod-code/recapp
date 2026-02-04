import winston from "winston";

function resolveLogLevel(): string {
  // Explicit override wins
  const explicit = process.env.LOG_LEVEL?.toLowerCase();
  if (explicit) return explicit;

  // Debug toggle (string envs)
  const debug = process.env.DEBUG_RECAPP === "1";

  // Production defaults to info, otherwise debug
  const isProd = process.env.NODE_ENV === "production";
  if (debug) return "debug";
  return isProd ? "info" : "debug";
}

export const logger = winston.createLogger({
  level: resolveLogLevel(),
  format: winston.format.combine(
    winston.format.label({ label: "recapp-backend" }),
    // Color in dev only; keeps prod logs cleaner + smaller
    ...(process.env.NODE_ENV === "production" ? [] : [winston.format.colorize()]),
    winston.format.timestamp({}),
    winston.format.printf(
      info => `[${info.label}] ${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [new winston.transports.Console()],
});
