import type {
  LogTag, BaseLog, AuthLog, RunLog, ListRequestLog,
  ListResultLog, WsLifecycleLog, WsDeltaLog, ConsistencyLog
} from "@recapp/models/debug/logTypes";

// Gate via Vite env; falls back to NODE_ENV for safety
const enabled =
  (import.meta as any)?.env?.VITE_DEBUG_RECAPP === "1" ||
  (typeof process !== "undefined" && process.env.DEBUG_RECAPP === "1");

export function dlog<T extends BaseLog>(
  tag: LogTag,
  payload: Omit<T, "ts">,
) {
  if (!enabled) return;
  const line = { tag, ts: new Date().toISOString(), ...payload };
  // eslint-disable-next-line no-console
  console.info(JSON.stringify(line));
}

// Convenience wrappers
export const d = {
  auth: (p: Omit<AuthLog, "ts">) => dlog<AuthLog>("AUTH", p),
  run: (p: Omit<RunLog, "ts">) => dlog<RunLog>("RUN", p),
  listReq: (p: Omit<ListRequestLog, "ts">) => dlog<ListRequestLog>("LIST_REQUEST", p),
  listRes: (p: Omit<ListResultLog, "ts">) => dlog<ListResultLog>("LIST_RESULT", p),
  wsLife: (p: Omit<WsLifecycleLog, "ts">) => dlog<WsLifecycleLog>("WS_OPEN", p),
  wsClose: (p: Omit<WsLifecycleLog, "ts">) => dlog<WsLifecycleLog>("WS_CLOSE", p),
  wsDelta: (p: Omit<WsDeltaLog, "ts">) => dlog<WsDeltaLog>("WS_QUESTION_UPDATE", p),
  consistency: (p: Omit<ConsistencyLog, "ts">) => dlog<ConsistencyLog>("CONSISTENCY", p),
};
