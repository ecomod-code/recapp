/**
 * Minimal, transport-agnostic tags for log events.
 *
 * These tags are shared between frontend and backend and can be used
 * regardless of whether an event was triggered by HTTP, WebSocket or
 * internal actor messages.
 */
export type LogTag =
  | "AUTH"                 // authentication / login / token refresh
  | "RUN"                 // starting/finishing quiz runs
  | "LIST_REQUEST"        // client sends list request (HTTP or actor message)
  | "LIST_RESULT"         // list result is returned (client or server side)
  | "WS_OPEN"             // WebSocket connection established
  | "WS_CLOSE"            // WebSocket connection closed
  | "WS_QUESTION_UPDATE"  // question list / state changed via WebSocket
  | "CONSISTENCY";        // consistency checks between client and server state

/**
 * Common fields for all log records.
 *
 * - `ts`: ISO timestamp when the event was recorded.
 * - `quizId`: optional quiz identifier the event refers to.
 */  
export type BaseLog = {
  ts: string;
  quizId?: string;
};


/**
 * Log entry for authentication and token state.
 *
 * Used to trace:
 * - when the auth layer is ready (`ready`),
 * - how old the current token is (`tokenAgeSec`),
 * - the state of token refresh (`refresh`: "start" | "ok" | "error").
 */
export type AuthLog = BaseLog & {
  ready: boolean;
  tokenAgeSec?: number;
  refresh?: "start" | "ok" | "error";
};

/**
 * Log entry for starting and completing quiz runs.
 *
 * Fields:
 * - `studentIdHash`: hashed student identifier (for privacy),
 * - `action`:
 *   - "start": run started,
 *   - "ok": run completed successfully,
 *   - "error": an error occurred,
 *   - "duplicate-suppressed": a duplicate start was ignored.
 * - `error`: optional error message when `action` is "error".
 */
export type RunLog = BaseLog & {
  studentIdHash?: string;
  action: "start" | "ok" | "error" | "duplicate-suppressed";
  error?: string;
};

/**
 * Log entry for outgoing list requests.
 *
 * Captures how a list was requested:
 * - `transport`: "http" or "actor",
 * - `urlOrMsg`: URL or actor message name,
 * - `params`: additional request parameters (e.g. query or filter).
 */
export type ListRequestLog = BaseLog & {
  transport: "http" | "actor";
  urlOrMsg?: string;
  params?: Record<string, unknown>;
};

/**
 * Log entry for list results.
 *
 * Records:
 * - `source`: whether this result came from the client cache or server,
 * - `returnedCount`: number of items returned,
 * - `params`: optional parameters describing the request,
 * - `status`: optional HTTP status code if the source was the server.
 */
export type ListResultLog = BaseLog & {
  source: "client" | "server";
  returnedCount: number;
  params?: Record<string, unknown>;
  status?: number;
};

/**
 * Log entry for WebSocket lifecycle events.
 *
 * - `event`: "open" or "close",
 * - `reason`: optional human-readable reason (e.g. close code / error).
 */
export type WsLifecycleLog = BaseLog & {
  event: "open" | "close";
  reason?: string;
};

/**
 * Log entry for incremental WebSocket updates to a list.
 *
 * Records:
 * - `delta`: number of items applied (+/-),
 * - `totalAfter`: list length after applying the delta.
 */
export type WsDeltaLog = BaseLog & {
  delta: number;       // +N items applied
  totalAfter: number;  // length after apply
};


/**
 * Log entry for client/server consistency checks.
 *
 * Helps debug situations where the client and server disagree about how
 * many items should be present in a list.
 *
 * - `serverTotal`: number of items on the server (if known),
 * - `clientLength`: number of items currently on the client,
 * - `loading`: whether the client is currently loading/refetching,
 * - `triggeredRefetch`: whether this check triggered a refetch.
 */
export type ConsistencyLog = BaseLog & {
  serverTotal?: number;
  clientLength: number;
  loading?: boolean;
  triggeredRefetch?: boolean;
};
