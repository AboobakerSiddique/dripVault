"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAGIC_LINK_COOLDOWN = 60; // seconds - matches Supabase's own resend interval

type Mode = "login" | "register" | "magic";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");

  const [identifier, setIdentifier] = useState(""); // email or username, for login
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleLogin = async () => {
    setError(null);
    setInfo(null);
    if (!identifier.trim() || !password) {
      setError("Enter your email or username and password.");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    let loginEmail = identifier.trim();
    if (!loginEmail.includes("@")) {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc("get_email_by_username", {
        p_username: loginEmail,
      });
      if (rpcError || !resolvedEmail) {
        setError("Invalid username/email or password.");
        setLoading(false);
        return;
      }
      loginEmail = resolvedEmail;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Invalid username/email or password.");
      return;
    }
    router.push("/home");
    router.refresh();
  };

  const handleRegister = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !username.trim() || !password) {
      setError("Fill in email, username, and password.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: available, error: rpcError } = await supabase.rpc("check_username_available", {
      p_username: username.trim(),
    });
    if (rpcError) {
      setError("Couldn't verify username availability. Try again.");
      setLoading(false);
      return;
    }
    if (!available) {
      setError("That username is taken.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/home`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // Supabase returns a user with no identities when the email is
    // already registered, without revealing that directly to the caller.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with that email already exists.");
      return;
    }

    if (data.session) {
      // Email confirmation is off in your Supabase project - signed in immediately.
      router.push("/home");
      router.refresh();
      return;
    }

    setInfo("Account created. Check your email to confirm before logging in.");
    setMode("login");
  };

  const sendMagicLink = async () => {
    if (cooldown > 0) return;
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/home` },
    });
    setLoading(false);
    if (otpError) {
      setError(
        otpError.message.toLowerCase().includes("rate limit")
          ? "Too many email requests right now - Supabase's built-in email sender has a strict free-tier limit. Use username/password login below in the meantime, or see the setup notes for adding free custom SMTP."
          : otpError.message
      );
      return;
    }
    setCooldown(MAGIC_LINK_COOLDOWN);
    setInfo("Check your email for a login link.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg-0)" }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-2">
          <Image src="/logo.png" alt="dripVault" width={264} height={142} priority style={{ width: 220, height: "auto" }} />
        </div>
        <p className="text-sm text-center mb-8" style={{ color: "var(--color-text-muted)" }}>
          Your personal style. Simplified.
        </p>

        <div className="flex mb-6 rounded-full border p-1" style={{ borderColor: "var(--color-border)" }}>
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className="flex-1 py-2 rounded-full text-xs"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
                background: mode === m ? "var(--color-accent)" : "transparent",
                color: mode === m ? "#08080b" : "var(--color-text-muted)",
                fontWeight: 600,
              }}
            >
              {m === "login" ? "LOG IN" : "REGISTER"}
            </button>
          ))}
        </div>

        {mode === "login" && (
          <>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email or username"
              className="w-full mb-3 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <button onClick={handleLogin} disabled={loading} className="btn-chrome w-full py-3 mb-4 disabled:opacity-50">
              {loading ? "LOGGING IN..." : "LOG IN"}
            </button>

            <button
              onClick={() => {
                setMode("magic");
                setError(null);
                setInfo(null);
              }}
              className="text-xs w-full text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              or use a magic link instead
            </button>
          </>
        )}

        {mode === "magic" && (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              type="email"
              className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <button
              onClick={sendMagicLink}
              disabled={loading || cooldown > 0}
              className="btn-chrome w-full py-3 mb-4 disabled:opacity-50"
            >
              {cooldown > 0 ? `RESEND IN ${cooldown}S` : loading ? "SENDING..." : "SEND MAGIC LINK"}
            </button>
            <button
              onClick={() => {
                setMode("login");
                setError(null);
                setInfo(null);
              }}
              className="text-xs w-full text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              back to password login
            </button>
          </>
        )}

        {mode === "register" && (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full mb-3 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full mb-3 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 characters)"
              type="password"
              className="w-full mb-3 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              type="password"
              className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <button onClick={handleRegister} disabled={loading} className="btn-chrome w-full py-3 disabled:opacity-50">
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </>
        )}

        {error && (
          <p className="text-xs mt-4 text-center" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs mt-4 text-center" style={{ color: "var(--color-accent)" }}>
            {info}
          </p>
        )}
      </div>
    </div>
  );
}
export default LoginForm;
