"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

/** Renders Google's own "Sign in with Google" button — GIS owns its DOM, so
 * this stays a plain ref target rather than hand-built markup. Callers should
 * check `notConfigured` from useAuth() before rendering this — it assumes a
 * client ID is present and gsiReady will eventually turn true. */
export default function GoogleSignInButton({
  size = "medium",
  shape = "pill",
}: {
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill";
}) {
  const { gsiReady } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gsiReady || !containerRef.current || !window.google) return;
    containerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size,
      shape,
      text: "signin_with",
      logo_alignment: "left",
    });
  }, [gsiReady, size, shape]);

  return <div ref={containerRef} />;
}
