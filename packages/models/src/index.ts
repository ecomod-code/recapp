/**
 * Public entry point for the `@recapp/models` package.
 *
 * This file re-exports:
 * - Core data models (Quiz, User, Comment, Session, Statistics, …)
 *   from `src/data/*`.
 * - Actor message definitions for backend/frontend communication
 *   from `src/messages/*`.
 *
 * Both the backend (Koa + actors) and the frontend (React + ts-actors-react)
 * import their shared types and schemas from this module.
 */

//
// Data models
//
export * from "./data/base";
export * from "./data/quiz";
export * from "./data/user";
export * from "./data/statistics";
export * from "./data/comment";
export * from "./data/session";

//
// Actor message definitions
//
export * from "./messages/sessionStore";
export * from "./messages/fingerprintStore";
export * from "./messages/userStore";
export * from "./messages/commentActor";
export * from "./messages/questionActor";
export * from "./messages/quizActor";
export * from "./messages/quizRunActor";
export * from "./messages/statisticsActor";
