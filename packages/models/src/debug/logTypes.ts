// Minimal, transport-agnostic event tags
export type LogTag =
  | "AUTH"
  | "RUN"
  | "LIST_REQUEST"        // client sends list request (HTTP or actor message)
  | "LIST_RESULT"         // client receives a snapshot; or server reports count
  | "WS_OPEN"
  | "WS_CLOSE"
  | "WS_QUESTION_UPDATE"
  | "CONSISTENCY";

export type BaseLog = {
  ts: string;
  quizId?: string;
};

export type AuthLog = BaseLog & {
  ready: boolean;
  tokenAgeSec?: number;
  refresh?: "start" | "ok" | "error";
};

export type RunLog = BaseLog & {
  studentIdHash?: string;
  action: "start" | "ok" | "error" | "duplicate-suppressed";
  error?: string;
};

export type ListRequestLog = BaseLog & {
  transport: "http" | "actor";
  urlOrMsg?: string;
  params?: Record<string, unknown>;
};

export type ListResultLog = BaseLog & {
  source: "client" | "server";
  returnedCount: number;
  params?: Record<string, unknown>;
  status?: number;
};

export type WsLifecycleLog = BaseLog & {
  event: "open" | "close";
  reason?: string;
};

export type WsDeltaLog = BaseLog & {
  delta: number;       // +N items applied
  totalAfter: number;  // length after apply
};

export type ConsistencyLog = BaseLog & {
  serverTotal?: number;
  clientLength: number;
  loading?: boolean;
  triggeredRefetch?: boolean;
};
