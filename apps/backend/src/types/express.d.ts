import type { AuthUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      /** Lo completa el middleware requireAuth. */
      user?: AuthUser;
    }
  }
}

export {};
