import { createContext } from "react";
import { ActorSystem } from "ts-actors";

/**
 * Context to provide access to the local actor system
 */
export const SystemContext = createContext<ActorSystem | undefined>(undefined);
