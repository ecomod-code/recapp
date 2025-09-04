type LogTag =
  | "AUTH"
  | "RUN"
  | "LIST_REQUEST"
  | "LIST_RESULT"
  | "WS_OPEN"
  | "WS_CLOSE"
  | "WS_QUESTION_UPDATE"
  | "CONSISTENCY";

type BaseLog = { ts: string; quizId?: string };

type AuthLog = BaseLog & {
  ready: boolean;
  tokenAgeSec?: number;
  refresh?: "start" | "ok" | "error";
  error?: string;
};

type RunLog = BaseLog & {
  studentIdHash?: string;
  action: "start" | "ok" | "error" | "duplicate-suppressed";
  error?: string;
};

type ListRequestLog = BaseLog & {
  transport: "http" | "actor";
  urlOrMsg?: string;
  params?: Record<string, unknown>;
};

type ListResultLog = BaseLog & {
  source: "client" | "server";
  returnedCount: number;
  params?: Record<string, unknown>;
  status?: number;
};

type WsLifecycleLog = BaseLog & {
  event: "open" | "close";
  reason?: string;
};

type WsDeltaLog = BaseLog & {
  delta: number;
  totalAfter: number;
};

type ConsistencyLog = BaseLog & {
  serverTotal?: number;
  clientLength: number;
  loading?: boolean;
  triggeredRefetch?: boolean;
};

const enabled =
  import.meta.env.VITE_DEBUG_RECAPP === "1" ||
  localStorage.DEBUG_RECAPP === "1";  // runtime switch

export function dlog<T extends BaseLog>(
  tag: LogTag,
  payload: Omit<T, "ts">,
) {
  if (!enabled) return;
  const line = { tag, ts: new Date().toISOString(), ...payload };
  // eslint-disable-next-line no-console
  ((window as any).DEBUG_LOGS ||= []).push(line);
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
