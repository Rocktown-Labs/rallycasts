import type { createAuth } from "@rallycaststv/auth";

type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export interface AppEnv {
  Bindings: Env;
  Variables: {
    authSession: AuthSession;
  };
}
