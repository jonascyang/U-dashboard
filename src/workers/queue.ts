export const QUEUE_NAMES = {
  ingest: "ingest-hourly",
  aggregate: "aggregate-hourly",
  alerts: "alerts-hourly"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
