"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("Verification failed. The link may have expired.");

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage("No verification token found. Please check your email link.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      return;
    }

    authClient.verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setErrorMessage(result.error.message || "Verification failed. The link may have expired.");
          setStatus("error");
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      });
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[360px] text-center"
    >
      {/* Logo */}
      <Link href="/" className="inline-flex items-center gap-2.5 mb-12">
        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-black" fill="black" />
        </div>
        <span className="font-bold tracking-tight text-white">Calmant</span>
      </Link>

      {status === "loading" && (
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Verifying your email…</h1>
          <p className="text-white/35 text-sm">Just a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Email verified!</h1>
          <p className="text-white/35 text-sm leading-relaxed">
            Your Calmant account is now active. You&apos;re all set.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-black font-bold rounded-xl px-6 py-2.5 text-sm hover:bg-white/90 active:scale-[0.97] transition-all mt-2"
          >
            Continue to your account →
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Verification failed</h1>
          <p className="text-white/35 text-sm leading-relaxed">{errorMessage}</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.09] text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-white/[0.10] active:scale-[0.97] transition-all mt-2"
          >
            Back to sign up
          </Link>
        </div>
      )}
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-6 py-16">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
