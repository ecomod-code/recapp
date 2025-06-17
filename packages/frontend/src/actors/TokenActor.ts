// packages/frontend/src/actors/TokenActor.ts

import { Unit, unit } from "itu-utils";
import { Actor, ActorRef, ActorSystem } from "ts-actors";
import Axios from "axios";
import { cookie } from "../utils";

export class TokenActor extends Actor<unknown, Unit> {
  public interval: any;
  private expiresAt: Date;
  // Prevent overlapping refresh calls
  private isRefreshing = false;

  public constructor(name: string, system: ActorSystem) {
    super(name, system);
    this.expiresAt = new Date(); // Initialize with a default value
  }

  public override async afterStart(): Promise<void> {
    this.updateToken();
  }

  public override async beforeShutdown(): Promise<void> {
    clearTimeout(this.interval);
  }

  private updateToken = () => {
    if (this.isRefreshing) {
      return;
    }
    this.isRefreshing = true;

    const hasToken = !!cookie("bearer");
    if (hasToken) {
      Axios.get(import.meta.env.VITE_BACKEND_URI + "/auth/refresh", { withCredentials: true })
        .then(response => {
          // on success: update expiry
          this.expiresAt = new Date(response.data.expires_at);
          this.scheduleNextUpdate(); // Schedule next run on success
        })
        .catch(error => {
          console.error("Failed to refresh token:", error);
          // If the error is a 401, the session is invalid. Force a logout.
          if (error.response && error.response.status === 401) {
            // Redirect to logout to clear the session
            window.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
          } else {
            // For other errors (e.g., network issues), retry after a delay
            setTimeout(() => this.scheduleNextUpdate(), 5000);
          }
        })
        .finally(() => {
          // ➤ allow future refresh attempts
          this.isRefreshing = false;
        });
    } else {
      // No token present: retry in 5s
      this.expiresAt = new Date(Date.now() + 5000);
      this.isRefreshing = false;
      //this.scheduleNextUpdate();
    }
  };

  private scheduleNextUpdate = () => {
    const buffer = 30000; // 30 seconds before expiry
    // compute ms until (expiry – buffer)
    let delay = this.expiresAt.getTime() - Date.now() - buffer;
    // enforce a floor so we never get a 0 or negative timeout
    const MIN_DELAY = 5_000;       // 5 s
    if (delay < MIN_DELAY) delay = MIN_DELAY;

    clearTimeout(this.interval); // Clear previous timeout
    this.interval = setTimeout(this.updateToken, delay);
  };

  public async receive(_from: ActorRef, _message: unknown): Promise<Unit> {
    return unit();
  }
}