import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
        
        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
          <p className="font-semibold text-foreground">Effective Date: June 27, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Introduction and Scope</h2>
            <p>
              Welcome to Calmant ("Company", "we", "our", "us"). We respect your privacy and are strongly committed to protecting your personal data. This Privacy Policy describes the types of information we may collect from you or that you may provide when you visit our website, utilize our mobile applications, or interact with our integrations across platforms like Telegram and WhatsApp (collectively, the "Service").
            </p>
            <p>
              This policy also explains our practices for collecting, using, maintaining, protecting, and disclosing that information. Please read this policy carefully to understand our policies and practices regarding your information and how we will treat it. If you do not agree with our policies and practices, your choice is not to use our Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Information We Collect and How We Collect It</h2>
            <p>We collect several types of information from and about users of our Service, including information:</p>
            
            <h3 className="text-xl font-semibold text-foreground mt-4">2.1 Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> When you register for an account (including via Google OAuth), we collect your name, email address, profile picture URL, and an internal authentication token.</li>
              <li><strong>Task and Input Data:</strong> The core of our Service involves processing your personal tasks. We collect all text, voice notes, calendar events, and natural language instructions you submit to the Service either directly through the web app or via our third-party bot integrations.</li>
              <li><strong>Contact Information:</strong> If you contact us for customer support, we retain records and copies of your correspondence, including your email address.</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-4">2.2 Automatically Collected Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Details:</strong> Details of your visits to our Service, including traffic data, location data, logs, and other communication data and the resources that you access and use on the Service.</li>
              <li><strong>Device Information:</strong> Information about your computer, mobile device, and internet connection, including your IP address, operating system, and browser type.</li>
              <li><strong>Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and other tracking technologies to collect information about your browsing activities over time and across third-party websites or other online services. You may manage your cookie preferences through our Cookie Consent banner.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. How We Use Your Information</h2>
            <p>We use information that we collect about you or that you provide to us, including any personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To present our Service and its contents to you.</li>
              <li>To provide you with the AI-driven task processing, breakdown, and scheduling functionalities that form the core value of Calmant.</li>
              <li>To fulfill any other purpose for which you provide it, such as integrating with your Google Calendar or sending task reminders via email.</li>
              <li>To carry out our obligations and enforce our rights arising from any contracts entered into between you and us, including for billing and collection.</li>
              <li>To notify you about changes to our Service, Terms of Service, or this Privacy Policy.</li>
              <li>To improve our Service, troubleshoot issues, and analyze user behavior to enhance the overall user experience.</li>
            </ul>
          </section>

          <section className="space-y-4 p-6 bg-blue-950/20 border-l-4 border-blue-500 rounded-r-lg">
            <h2 className="text-2xl font-black text-blue-500 uppercase tracking-widest">4. Third-Party AI Processing and Data Sharing</h2>
            <p>
              <strong>AI Sub-processors:</strong> Calmant relies on advanced Large Language Models (LLMs) to function. Your task data (including text descriptions and transcribed voice notes) is securely transmitted via API to third-party AI providers (such as Groq, OpenAI, or Anthropic) for the sole purpose of analyzing and formatting the data into structured tasks. 
            </p>
            <p>
              <strong>No Model Training:</strong> We strictly utilize API endpoints from our AI providers that guarantee your personal task data <strong>will not be used to train their public generative models</strong>. Data is only processed ephemerally to generate the required output.
            </p>
            <p>
              <strong>Other Disclosures:</strong> We may disclose aggregated information about our users without restriction. We may disclose personal information to contractors, service providers, and other third parties we use to support our business (e.g., database hosting on Vercel/Neon, email delivery via Resend), provided they are bound by contractual obligations to keep personal information confidential.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Data Security and Retention</h2>
            <p>
              We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. All information you provide to us is stored on secure servers behind firewalls.
            </p>
            <p>
              Unfortunately, the transmission of information via the internet is not completely secure. Although we do our best to protect your personal information, we cannot guarantee the security of your personal information transmitted to our Service. Any transmission of personal information is at your own risk.
            </p>
            <p>
              We retain your personal data and task history for as long as your account is active. If you choose to delete your account, your data will be permanently purged from our primary databases within 30 days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">6. Your Data Privacy Rights (GDPR & CCPA)</h2>
            <p>Depending on your geographic location, you may have specific rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right to Access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> You have the right to request that we correct any information you believe is inaccurate.</li>
              <li><strong>Right to Erasure:</strong> You have the right to request that we erase your personal data, under certain conditions.</li>
              <li><strong>Right to Restrict Processing:</strong> You have the right to request that we restrict the processing of your personal data.</li>
              <li><strong>Right to Data Portability:</strong> You have the right to request that we transfer the data that we have collected to another organization, or directly to you.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at privacy@calmant.app.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">7. Children Under the Age of 13</h2>
            <p>
              Our Service is not intended for children under 13 years of age. No one under age 13 may provide any personal information to or on the Service. We do not knowingly collect personal information from children under 13. If you are under 13, do not use or provide any information on this Service. If we learn we have collected or received personal information from a child under 13 without verification of parental consent, we will delete that information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">8. Changes to Our Privacy Policy</h2>
            <p>
              It is our policy to post any changes we make to our privacy policy on this page. If we make material changes to how we treat our users' personal information, we will notify you through a notice on the Service home page or via email. The date the privacy policy was last revised is identified at the top of the page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
