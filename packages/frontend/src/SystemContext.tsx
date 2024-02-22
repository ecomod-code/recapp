import { createContext } from "react";
import { ActorSystem } from "ts-actors";
import { Maybe, nothing } from "tsmonads";

/**
 * Context to provide access to the local actor system
 */
export const SystemContext = createContext<Maybe<ActorSystem>>(nothing());
