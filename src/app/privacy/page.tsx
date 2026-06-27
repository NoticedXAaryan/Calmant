import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>Last updated: June 27, 2026</p>
          
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p>Welcome to Calmant. We respect your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website or use our application.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Personal Identification Information:</strong> Name, email address, profile picture (via Google OAuth).</li>
              <li><strong>Task Data:</strong> Voice notes, text messages, and task descriptions you submit to the application directly or via third-party integrations (WhatsApp, Telegram).</li>
              <li><strong>Technical Data:</strong> IP address, browser type, operating system, and usage data via standard analytics tools.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">3. How We Use Your Data</h2>
            <p>We use the data we collect for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, operate, and maintain our Service.</li>
              <li>To process your tasks using third-party AI models (e.g., Groq) to organize and schedule your commitments.</li>
              <li>To improve user experience and analyze how our Service is used.</li>
              <li>To send administrative emails, security alerts, and support messages.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. Third-Party AI Processing</h2>
            <p>Because Calmant relies on AI, your task data is securely transmitted to third-party language model providers via APIs. These providers act as data processors and are restricted from using your personal task data to train their public models, but you acknowledge that your data is sent to external servers for processing.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">5. Cookies & Tracking Technologies</h2>
            <p>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent via our Cookie Consent banner.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">6. Data Security</h2>
            <p>We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet, or method of electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">7. Your Data Rights</h2>
            <p>Depending on your location, you may have rights under GDPR or CCPA to request access to, correction of, or deletion of your personal data. You can exercise these rights by contacting us or managing your account settings.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
