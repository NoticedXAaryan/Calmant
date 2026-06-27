import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>Last updated: June 27, 2026</p>
          
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">1. Agreement to Terms</h2>
            <p>By accessing or using the Calmant website, applications, and services (collectively, the "Service"), you agree to be bound by these Terms of Service. If you do not agree with all of these terms, you are prohibited from using the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
            <p>Calmant is an AI execution companion designed to help users organize, prioritize, and manage tasks. The Service utilizes experimental Artificial Intelligence (AI) and Large Language Models (LLMs) which may occasionally misinterpret data, hallucinate facts, or drop information during processing.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-red-500 uppercase tracking-wider">3. No Liability & Assumption of Risk (Critical)</h2>
            <p className="font-bold text-foreground">Using this product makes you entirely liable for any consequences of its use.</p>
            <p>Calmant, its creators, developers, and affiliates take ZERO responsibility for missed deadlines, lost tasks, misinterpreted instructions, scheduling conflicts, financial losses, or any damages (direct, indirect, incidental, punitive, or consequential) arising from the use of this Service.</p>
            <p>You use Calmant completely at your own risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis without any warranties, express or implied. Do not use this service for mission-critical, medical, legal, financial, life-saving, or highly sensitive commitments.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. User Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use. You agree not to misuse the Service, reverse engineer it, or use it for illegal activities.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">5. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Calmant and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Calmant.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">6. Termination</h2>
            <p>We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice or liability, at our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">7. Changes to Terms</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
