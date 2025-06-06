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
   this.expiresAt = new Date(); // Initialize with a default value
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
         this.expiresAt = new Date(response.data.expires_at);
         this.scheduleNextUpdate();
       })
       .catch(error => {
         console.error("Failed to refresh token:", error);
         setTimeout(this.updateToken, 5000); // Retry after 5 seconds
       });
   }
 };

 private scheduleNextUpdate = () => {
   const buffer = 30000; // 30 seconds before expiry
   const delay = this.expiresAt.getTime() - Date.now() - buffer;
   clearTimeout(this.interval); // Clear previous timeout
   this.interval = setTimeout(this.updateToken, delay);
 };

 public async receive(_from: ActorRef, _message: unknown): Promise<Unit> {
   return unit();
 }
}