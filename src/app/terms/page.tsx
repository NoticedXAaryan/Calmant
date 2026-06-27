import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Terms and Conditions</h1>
        
        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm md:text-base">
          <p className="font-semibold text-foreground">Effective Date: June 27, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or otherwise using the Calmant website, mobile applications, API, and associated services (collectively, the "Service"), you agree to be bound by these Terms and Conditions ("Terms"). These Terms govern your access to and use of the Service and constitute a binding legal agreement between you and Calmant ("Company", "we", "us", or "our").
            </p>
            <p>
              If you do not agree to all of the terms and conditions set forth in this agreement, you must immediately cease all use of the Service. Your continued use of the Service constitutes your acceptance of these Terms, as well as our Privacy Policy, which is incorporated herein by reference.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Description of the Service</h2>
            <p>
              Calmant is a digital productivity and execution companion powered by experimental Artificial Intelligence (AI). It is designed to help users capture, organize, decompose, and schedule tasks via various interfaces, including web and third-party messaging integrations (such as WhatsApp and Telegram).
            </p>
            <p>
              <strong>Experimental Nature:</strong> You acknowledge that the Service utilizes Large Language Models (LLMs) and generative AI technologies that are experimental in nature. These systems may occasionally produce inaccurate, incomplete, or nonsensical outputs (commonly referred to as "hallucinations"), misinterpret user intent, or fail to capture data correctly.
            </p>
          </section>

          <section className="space-y-4 p-6 bg-red-950/20 border-l-4 border-red-500 rounded-r-lg">
            <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest">3. Absolute Disclaimer of Liability & Assumption of Risk</h2>
            <p className="font-bold text-foreground text-lg">
              USING THIS PRODUCT MAKES YOU ENTIRELY AND SOLELY LIABLE FOR ANY AND ALL CONSEQUENCES ARISING FROM ITS USE.
            </p>
            <p>
              <strong>3.1 No Guarantees:</strong> Calmant, its creators, developers, affiliates, and partners take ABSOLUTELY ZERO RESPONSIBILITY for missed deadlines, lost tasks, misinterpreted instructions, scheduling conflicts, financial losses, professional repercussions, or any damages of any kind.
            </p>
            <p>
              <strong>3.2 As Is Basis:</strong> The Service is provided on an strictly "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            <p>
              <strong>3.3 Prohibited Use Cases:</strong> Under no circumstances should you use this Service for mission-critical, medical, legal, financial, life-saving, or highly sensitive commitments where failure could result in personal injury, death, severe financial loss, or legal liability.
            </p>
            <p>
              <strong>3.4 Limitation of Liability:</strong> In no event shall Calmant, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. User Registration and Account Security</h2>
            <p>
              To use certain features of the Service, you must register for an account using Google OAuth or email authentication. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
            </p>
            <p>
              You are entirely responsible for safeguarding the password and authentication methods that you use to access the Service and for any activities or actions under your account. You agree to notify us immediately of any unauthorized access to or use of your account. We will not be liable for any loss or damage arising from your failure to comply with this requirement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Acceptable Use Policy</h2>
            <p>You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Using the Service for any illegal purpose, or in violation of any local, state, national, or international law.</li>
              <li>Violating, or encouraging others to violate, any right of a third party, including by infringing or misappropriating any third-party intellectual property right.</li>
              <li>Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service.</li>
              <li>Imposing an unreasonable or disproportionately large load on our infrastructure, or making automated, programmatic requests to our APIs beyond designated rate limits.</li>
              <li>Uploading invalid data, viruses, worms, or other software agents through the Service.</li>
              <li>Reverse engineering, decompiling, disassembling, or otherwise attempting to derive the source code of the Service.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">6. Third-Party Integrations</h2>
            <p>
              The Service integrates with third-party applications and services (e.g., Telegram, WhatsApp, Google Calendar). Your use of these third-party services is entirely at your own risk and subject to their respective terms of service and privacy policies. Calmant is not responsible for the availability, accuracy, or reliability of these third-party integrations, nor for any data breaches or failures occurring on their platforms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">7. Intellectual Property Rights</h2>
            <p>
              The Service and its original content (excluding User Content), features, functionality, software, design, and branding are and will remain the exclusive property of Calmant and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
            </p>
            <p>
              Our trademarks, trade dress, and brand assets may not be used in connection with any product or service without the prior written consent of Calmant.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">8. Subscription, Billing, and Payments</h2>
            <p>
              If you purchase a premium subscription, you agree to pay all applicable fees and taxes. Subscription fees are billed on a recurring basis (monthly or annually, as selected by you) and are non-refundable, except as expressly provided by applicable law. We reserve the right to change our pricing or billing practices at any time, provided we give you advance notice of any price changes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">9. Termination and Suspension</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
            <p>
              If you wish to terminate your account, you may simply discontinue using the Service or delete your account through the settings dashboard. All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">10. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the applicable jurisdiction, without regard to its conflict of law provisions. Any dispute arising from these Terms or the Service shall be resolved through binding arbitration, rather than in court, except that you may assert claims in small claims court if your claims qualify.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">11. Modifications to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
