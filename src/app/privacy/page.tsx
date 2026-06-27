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
        <div className="space-y-6 text-muted-foreground">
          <p>Last updated: June 2026</p>
          
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your name and email address. When you use Calmant, we collect the content of the tasks you capture (via text or voice) in order to process and schedule them.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>Your information is used solely to provide and improve the Calmant service. The task data you input may be processed by third-party language models (like Groq) strictly for the purpose of breaking down and understanding your commitments.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Third-Party Integrations</h2>
            <p>If you choose to integrate with Telegram or WhatsApp, you agree to the privacy policies of those respective services. We do not sell your personal data to third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Cookies and Local Storage</h2>
            <p>We use cookies and local storage to manage your session and save your preferences (such as your cookie consent choice). You can disable cookies in your browser, but some features of the service may not function properly.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
