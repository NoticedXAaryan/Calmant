import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Terms and Conditions</h1>
        <div className="space-y-6 text-muted-foreground">
          <p>Last updated: June 2026</p>
          
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using Calmant, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>Calmant is an AI execution companion designed to help you organize and prioritize tasks. However, it relies on experimental AI technologies (LLMs) which may occasionally misinterpret, hallucinate, or drop information.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-red-500">3. NO LIABILITY / ASSUMPTION OF RISK (IMPORTANT)</h2>
            <p className="font-semibold text-foreground">Using this product makes you entirely liable for any consequences of its use.</p>
            <p>Calmant and its creator take ZERO responsibility for missed deadlines, lost tasks, misinterpreted instructions, or any damages (direct, indirect, incidental, or consequential) arising from the use of this service. You use Calmant completely at your own risk. Do not use this service for mission-critical, life-saving, or highly sensitive commitments. The service is provided "AS IS", without warranty of any kind.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. User Responsibilities</h2>
            <p>You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree not to misuse the service or help anyone else do so.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Termination</h2>
            <p>We may terminate or suspend your access immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
