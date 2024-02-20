import winston from "winston";

export const logger = winston.createLogger({
	level: "debug",
	format: winston.format.combine(
		winston.format.label({ label: "recapp-backend" }),
		winston.format.colorize(),
		winston.format.timestamp({}),
		winston.format.printf(info => `[${info.label}] ${info.timestamp} ${info.level}: ${info.message}`)
	),
	transports: [new winston.transports.Console()],
});
