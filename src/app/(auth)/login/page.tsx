"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { signIn, authClient } from "@/lib/auth-client";
import { Zap, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEmailNotVerified(false);
    setResendSuccess(false);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        const msg = result.error.message ?? "";
        const isUnverified =
          msg.toLowerCase().includes("email") &&
          msg.toLowerCase().includes("verif");
        if (isUnverified) {
          setEmailNotVerified(true);
          setError("Please verify your email before signing in. Check your inbox for the verification link.");
        } else {
          setError(msg || "Invalid email or password");
        }
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/onboarding",
      });
      setResendSuccess(true);
    } catch {
      // silently fail
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
          style={{ background: "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255,255,255,0.018) 0%, transparent 60%)" }}
        />
        <Link href="/" className="relative flex items-center gap-2.5 z-10">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-black" fill="black" />
          </div>
          <span className="font-bold tracking-tight">Calmant</span>
        </Link>
        <div className="relative z-10 space-y-6 max-w-xs">
          <blockquote className="space-y-5">
            <p className="text-[1.35rem] font-bold leading-snug text-white/80 tracking-tight">
              &ldquo;I stopped missing things. My calendar used to feel like a battle I was always losing.&rdquo;
            </p>
            <footer>
              <p className="text-sm font-semibold">Priya S.</p>
              <p className="text-xs text-white/30 mt-0.5">Founder, early-stage startup</p>
            </footer>
          </blockquote>
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-end">
              <span className="text-xs bg-emerald-700/70 text-white rounded-xl rounded-br-sm px-3 py-1.5 max-w-[80%]">
                dentist call next week, low priority
              </span>
            </div>
            <div className="flex justify-start">
              <span className="text-xs bg-white/8 text-white/70 rounded-xl rounded-bl-sm px-3 py-1.5 max-w-[80%]">
                ✓ Added — <span className="text-white/90">Call dentist</span>, next week.
              </span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-white/15 relative z-10">© 2026 Calmant</p>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[360px]"
        >
          <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-black" fill="black" />
            </div>
            <span className="font-bold tracking-tight">Calmant</span>
          </Link>

          <h1 className="text-[1.75rem] font-extrabold tracking-tight mb-1.5">Welcome back</h1>
          <p className="text-white/35 text-sm mb-8">Sign in to pick up where you left off.</p>

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
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailNotVerified(false); setResendSuccess(false); }}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/25 focus:bg-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/15 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-white/25 focus:bg-white/[0.06] rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-white/15 outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/8 border border-red-500/15 px-3.5 py-2.5 text-xs text-red-400/90 space-y-2">
                <p>{error}</p>
                {emailNotVerified && (
                  resendSuccess ? (
                    <p className="text-emerald-500 font-semibold">Verification email sent! Check your inbox.</p>
                  ) : (
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={handleResendVerification}
                      className="flex items-center gap-1.5 text-white/60 hover:text-white underline underline-offset-2 transition-colors disabled:opacity-40 font-medium"
                    >
                      {resendLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      Resend verification email
                    </button>
                  )
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl px-4 py-2.5 text-sm hover:bg-white/90 active:scale-[0.97] transition-all disabled:opacity-50 mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign in</span> <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-white/25 mt-8">
            New here?{" "}
            <Link href="/signup" className="text-white/55 hover:text-white transition-colors font-semibold">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
