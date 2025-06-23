// packages/frontend/src/actors/TokenActor.ts

import { Unit, unit } from "itu-utils";
import { Actor, ActorRef, ActorSystem } from "ts-actors";
import Axios from "axios";
import { cookie } from "../utils";

export class TokenActor extends Actor<unknown, Unit> {
  public interval: any;
  private expiresAt: Date;

  public constructor(name: string, system: ActorSystem) {
    super(name, system);
    this.expiresAt = new Date(); // Initialize with the current dte and time
  }

  public override async afterStart(): Promise<void> {
    this.updateToken();
  }

  public override async beforeShutdown(): Promise<void> {
    clearTimeout(this.interval);
  }

  private updateToken = () => {
    const hasToken = !!cookie("bearer");
    if (hasToken) {
      Axios.get(import.meta.env.VITE_BACKEND_URI + "/auth/refresh", { withCredentials: true })
        .then(response => {
          console.debug("[TokenActor] /auth/refresh response.data:", response.data);
          // assume response.data.expires_at is ISO or epoch-string
          this.expiresAt = new Date(response.data.expires_at);
          this.scheduleNextUpdate();
        })
        .catch(error => {
          console.error("[TokenActor] Failed to refresh token:", error);
          setTimeout(this.updateToken, 5000); // Retry after 5 seconds
        });
    }
  };

  private scheduleNextUpdate = () => {
    const bufferMs = 30000; // 30 seconds before expiry
    const now = Date.now();
    const expiryMs = this.expiresAt.getTime();

    const delay = expiryMs - now - bufferMs;

    // --- DEBUG LOGGING START ---
    console.debug("[TokenActor] now       =", new Date(now).toISOString());
    console.debug("[TokenActor] expiresAt =", this.expiresAt.toISOString());
    console.debug("[TokenActor] bufferMs  =", bufferMs, "ms");
    console.debug("[TokenActor] raw delay =", delay, "ms");
    // --- DEBUG LOGGING END ---

    clearTimeout(this.interval); // Clear previous timeout

    // clamp to at least 1 s to avoid tight loops
    const safeDelay = Math.max(delay, 1_000);
    if (delay <= 0) {
      console.warn("[TokenActor] Computed delay <= 0, forcing retry in 1 s");
    }
    this.interval = setTimeout(this.updateToken, safeDelay);
  };

  public async receive(_from: ActorRef, _message: unknown): Promise<Unit> {
    return unit();
  }
}