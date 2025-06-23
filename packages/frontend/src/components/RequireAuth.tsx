// src/components/RequireAuth.tsx

import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const hasToken = Boolean(document.cookie.match(/(?:^|;\s*)bearer=/));
  const location = useLocation();

  if (!hasToken) {
    // Not logged in → send to login page, remember where we came from
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Logged in → render whatever was passed inside <RequireAuth>…</RequireAuth>
  return <>{children}</>;
}
