"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = async () => {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg-0)" }}>
      <div className="w-full max-w-sm">
        <h1
          className="text-3xl mb-2 text-center"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--color-text)" }}
        >
          dripVault
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: "var(--color-text-muted)" }}>
          Your personal style. Simplified.
        </p>

        {sent ? (
          <p className="text-sm text-center" style={{ color: "var(--color-accent)" }}>
            Check your email for a login link.
          </p>
        ) : (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              type="email"
              className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <button onClick={sendMagicLink} className="btn-chrome w-full py-3">
              SEND MAGIC LINK
            </button>
            {error && (
              <p className="text-xs mt-3 text-center" style={{ color: "#ff6b6b" }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
