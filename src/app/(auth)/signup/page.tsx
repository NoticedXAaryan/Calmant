"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { signUp, signIn, authClient } from "@/lib/auth-client";
import {
  Zap, Mail, Lock, User, ArrowRight, Loader2,
  Eye, EyeOff, CheckCircle2, MailCheck,
} from "lucide-react";

const PERKS = [
  "Capture tasks by voice or text on WhatsApp or Telegram",
  "AI sorts them by urgency — you never have to",
  "Morning brief and evening review, every day",
  "Habit tracking that doesn't require another app",
];

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const checks = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Contains a number", valid: /\d/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (checks.some((c) => !c.valid)) {
      setError("Please meet the password requirements.");
      setLoading(false);
      return;
    }
    try {
      const result = await signUp.email({
        email,
        password,
        name,
        callbackURL: "/onboarding",
      });
      if (result.error) {
        setError(result.error.message || "Failed to create account");
        setLoading(false);
        return;
      }
      setEmailSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/onboarding",
      });
      setResendSuccess(true);
    } catch {
      // silently fail — user can try again
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] border-r border-white/[0.05] p-14 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 100% 100%, rgba(255,255,255,0.018) 0%, transparent 60%)" }}
        />
        <Link href="/" className="relative flex items-center gap-2.5 z-10">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-black" fill="black" />
          </div>
          <span className="font-bold tracking-tight">Calmant</span>
        </Link>
        <div className="relative z-10 max-w-xs space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight leading-snug mb-2">
              The version of you<br />that doesn&apos;t forget things.
            </h2>
            <p className="text-white/35 text-sm leading-relaxed">
              Free to start. No new app to download. Works in the messengers you already use.
            </p>
          </div>
          <ul className="space-y-3.5">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-white/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] text-white/15 relative z-10">© 2026 Calmant</p>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 overflow-y-auto">
        <AnimatePresence mode="wait">
          {emailSent ? (
            /* ── Email sent confirmation ─────────────────────────────────── */
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[360px]"
            >
              <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-10">
                <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-black" fill="black" />
                </div>
                <span className="font-bold tracking-tight">Calmant</span>
              </Link>

              <div className="mb-6 w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.09] flex items-center justify-center">
                <MailCheck className="w-6 h-6 text-emerald-400" />
              </div>

              <h1 className="text-[1.75rem] font-extrabold tracking-tight mb-2">Check your inbox</h1>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                We sent a verification link to{" "}
                <span className="text-white/80 font-semibold">{email}</span>.
                Click it to activate your account.
              </p>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-4 py-3.5 text-xs text-white/30 leading-relaxed">
                Didn&apos;t get it? Check your spam folder or{" "}
                {resendSuccess ? (
                  <span className="text-emerald-500 font-semibold">email sent!</span>
                ) : (
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={handleResend}
                    className="text-white/60 hover:text-white underline underline-offset-2 transition-colors disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    {resendLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    resend the email
                  </button>
                )}
                .
              </div>

              <p className="text-center text-xs text-white/25 mt-8">
                Wrong email?{" "}
                <button
                  type="button"
                  onClick={() => { setEmailSent(false); setError(""); }}
                  className="text-white/55 hover:text-white transition-colors font-semibold"
                >
                  Go back
                </button>
              </p>
            </motion.div>
          ) : (
            /* ── Sign-up form ────────────────────────────────────────────── */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[360px]"
            >
              <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-10">
                <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-black" fill="black" />
                </div>
                <span className="font-bold tracking-tight">Calmant</span>
              </Link>

              <h1 className="text-[1.75rem] font-extrabold tracking-tight mb-1.5">Create your account</h1>
              <p className="text-white/35 text-sm mb-8">Free to start. Three minutes to set up.</p>

              {/* Google */}
              <button
                type="button"
                disabled={loading}
                onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
                className="w-full flex items-center justify-center gap-3 bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.08] hover:border-white/[0.14] active:scale-[0.98] transition-all rounded-xl px-4 py-2.5 text-sm font-medium mb-5 disabled:opacity-40"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-[11px] text-white/20 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                    <input type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/25 focus:bg-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/15 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/25 focus:bg-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/15 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                    <input type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/25 focus:bg-white/[0.06] rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-white/15 outline-none transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex gap-4 pt-1">
                      {checks.map((c) => (
                        <span key={c.label} className={`flex items-center gap-1.5 text-xs transition-colors ${c.valid ? "text-emerald-500" : "text-white/20"}`}>
                          <CheckCircle2 className="w-3 h-3" />{c.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl bg-red-500/8 border border-red-500/15 px-3.5 py-2.5 text-xs text-red-400/90">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl px-4 py-2.5 text-sm hover:bg-white/90 active:scale-[0.97] transition-all disabled:opacity-50 mt-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create account</span> <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>

              <p className="text-[11px] text-white/15 text-center mt-6 leading-relaxed">
                By signing up you agree to our{" "}
                <span className="underline underline-offset-2 hover:text-white/30 cursor-pointer transition-colors">Terms</span>
                {" "}and{" "}
                <span className="underline underline-offset-2 hover:text-white/30 cursor-pointer transition-colors">Privacy Policy</span>.
              </p>
              <p className="text-center text-xs text-white/25 mt-5">
                Already have an account?{" "}
                <Link href="/login" className="text-white/55 hover:text-white transition-colors font-semibold">Sign in</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
