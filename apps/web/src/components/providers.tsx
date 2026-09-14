import { AuthProvider } from "@better-auth-ui/react";
import { env } from "@rallycaststv/env/web";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";

export default function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient}
      baseURL={env.VITE_SERVER_URL}
      multipleAccountsPerProvider={false}
      navigate={({ replace, to }) => {
        if (/^https?:\/\//u.test(to)) {
          window.location.assign(to);
          return;
        }

        void navigate({ replace, to: to as never });
      }}
      queryClient={queryClient}
      redirectTo="/u"
      socialProviders={["google"]}
    >
      {children}
    </AuthProvider>
  );
}
