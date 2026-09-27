/**
 * Compatibility shim for the former better-auth server instance.
 *
 * The real auth now lives in the Django backend. Server components / actions
 * that used `auth.api.getSession(...)` keep working via this shim, which reads
 * the JWT from cookies and asks Django who the user is.
 */
import { getSession } from "./auth-helpers";

export const auth = {
  api: {
    // The `headers` arg is accepted for source-compatibility but ignored —
    // getSession() reads the JWT from cookies internally.
    async getSession(_opts?: { headers?: unknown }) {
      return getSession();
    },
  },
};
