"use client";

import Link from "next/link";
import { MessageSquare, Calendar, Shield, ArrowRight, CheckCircle2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tighter text-zinc-900">
              Calmant.
            </span>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500">
              <a href="#documentation" className="hover:text-zinc-900 transition-colors">Documentation</a>
              <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm rounded-md h-9 px-4 text-sm font-medium">
                Start Execution
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Hero Copy */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              System v2.0 is live
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] mb-6">
              The Executive AI for High-Velocity Operators.
            </h1>
            <p className="text-lg text-zinc-600 leading-relaxed mb-10 max-w-lg">
              Stop fighting your to-do list. Calmant is a voice-controlled executive interface that operates through WhatsApp and Telegram to parse your intent, schedule tasks, and enforce deadlines.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white rounded-md h-12 px-8 text-base font-medium shadow-md">
                  Deploy Calmant
                </Button>
              </Link>
              <a href="#documentation" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-zinc-200 hover:bg-zinc-100 text-zinc-900 rounded-md h-12 px-8 text-base font-medium">
                  Read the Docs
                </Button>
              </a>
            </div>
            
            <div className="mt-10 flex items-center gap-6 text-sm font-medium text-zinc-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> WhatsApp Meta API</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Telegram Bot API</div>
            </div>
          </div>

          {/* Realistic Dashboard Mockup */}
          <div className="relative w-full h-[500px] rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/50 overflow-hidden flex flex-col">
            {/* Window Controls */}
            <div className="h-12 border-b border-zinc-100 bg-zinc-50/50 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <div className="mx-auto flex items-center gap-2 bg-white border border-zinc-200 rounded-md px-32 py-1 text-xs text-zinc-400 font-mono shadow-sm">
                <Shield className="w-3 h-3"/> dashboard.calmant.com
              </div>
            </div>
            
            {/* Dashboard Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-48 border-r border-zinc-100 bg-zinc-50 p-4 flex flex-col gap-1">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">Menu</div>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 bg-zinc-200/50 px-2 py-1.5 rounded-md"><Terminal className="w-4 h-4"/> Command</div>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 px-2 py-1.5 rounded-md"><Calendar className="w-4 h-4"/> Schedule</div>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 px-2 py-1.5 rounded-md"><Shield className="w-4 h-4"/> Security</div>
              </div>
              
              {/* Main Area */}
              <div className="flex-1 bg-white p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">Active Directives</h3>
                    <p className="text-sm text-zinc-500">2 pending tasks extracted from Telegram.</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">AR</div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="border border-zinc-200 rounded-lg p-4 flex items-start gap-4 hover:border-blue-500 transition-colors cursor-pointer bg-white shadow-sm">
                    <div className="mt-1 w-4 h-4 rounded-full border-2 border-zinc-300"></div>
                    <div>
                      <h4 className="font-semibold text-zinc-900 text-sm">Review Apollo Architecture Docs</h4>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3"/> Sent via Telegram voice note
                      </p>
                    </div>
                    <div className="ml-auto text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">Due 10:00 AM</div>
                  </div>

                  <div className="border border-zinc-200 rounded-lg p-4 flex items-start gap-4 hover:border-blue-500 transition-colors cursor-pointer bg-white shadow-sm">
                    <div className="mt-1 w-4 h-4 rounded-full border-2 border-zinc-300"></div>
                    <div>
                      <h4 className="font-semibold text-zinc-900 text-sm">Approve Q3 Financial Projections</h4>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3"/> Extracted from WhatsApp thread
                      </p>
                    </div>
                    <div className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Due 2:00 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Documentation / How it Works */}
      <section id="documentation" className="border-t border-zinc-200 bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-4">Official Documentation</h2>
            <p className="text-lg text-zinc-600 mb-12">
              Calmant is designed to live outside the browser. Configure your preferred messaging platform to issue voice directives directly to the AI agent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Telegram Docs */}
            <div className="border border-zinc-200 rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.08-.19-.09-.05-.21-.02-.3.01-.13.04-2.23 1.43-6.28 4.16-.59.41-1.13.6-1.61.59-.53-.01-1.56-.3-2.32-.55-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.89-2.12 5.87-2.53 2.79-1.16 3.37-1.36 3.75-1.36.08 0 .27.02.39.1.1.07.16.16.18.27.01.07.01.16 0 .24z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Telegram Integration</h3>
              <p className="text-zinc-600 mb-6 text-sm">Long-polling enabled. Fastest way to start executing directives.</p>
              
              <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 text-sm font-mono text-zinc-800 space-y-3">
                <p><span className="text-zinc-400">1.</span> Message <span className="text-blue-600">@BotFather</span> on Telegram.</p>
                <p><span className="text-zinc-400">2.</span> Create a new bot and copy the API Token.</p>
                <p><span className="text-zinc-400">3.</span> Add to your Calmant <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded">.env</code> file:</p>
                <div className="bg-zinc-900 text-zinc-300 p-3 rounded-md overflow-x-auto">
                  <code>TELEGRAM_BOT_TOKEN="your_token_here"</code>
                </div>
                <p><span className="text-zinc-400">4.</span> Navigate to <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded">/api/telegram/init</code> to start.</p>
              </div>
            </div>

            {/* WhatsApp Docs */}
            <div className="border border-zinc-200 rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 21.036c-1.583 0-3.136-.425-4.498-1.232l-.32-.19-3.342.875.89-3.256-.21-.334c-.886-1.41-1.353-3.037-1.353-4.708 0-4.887 3.978-8.865 8.865-8.865 4.884 0 8.862 3.977 8.862 8.864s-3.978 8.846-8.894 8.846zM12.031 4.904c-3.987 0-7.234 3.245-7.234 7.23 0 1.276.333 2.52 1.012 3.65l.135.226-.532 1.947 1.99-.523.22.13c1.096.65 2.308.995 3.553.995 3.986 0 7.233-3.245 7.233-7.233 0-3.984-3.247-7.23-7.377-7.23v.008zM16.03 14.286c-.22-.11-1.295-.64-1.496-.713-.203-.074-.35-.11-.497.11-.148.22-.564.713-.69.86-.128.146-.256.164-.476.054-.22-.11-1.01-.373-1.92-1.184-.71-.634-1.188-1.416-1.326-1.636-.137-.22-.015-.338.095-.448.1-.1.22-.256.33-.383.11-.128.147-.22.22-.367.074-.147.037-.276-.018-.386-.055-.11-.497-1.198-.68-1.64-.18-.426-.363-.368-.497-.375-.128-.007-.276-.007-.424-.007-.148 0-.387.056-.59.276-.202.22-.77.753-.77 1.836 0 1.083.788 2.13 8.98 2.384.148.256.632.966 1.53 1.23.518.152 1.05.13 1.444.078.438-.057 1.295-.53 1.478-1.042.18-.513.18-.952.128-1.043-.052-.09-.2-.146-.42-.256z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Meta WhatsApp API</h3>
              <p className="text-zinc-600 mb-6 text-sm">Official Meta Cloud API integration. Requires developer account.</p>
              
              <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 text-sm font-mono text-zinc-800 space-y-3">
                <p><span className="text-zinc-400">1.</span> Create an App on <span className="text-emerald-600">developers.facebook.com</span>.</p>
                <p><span className="text-zinc-400">2.</span> Add the WhatsApp Product and generate access tokens.</p>
                <p><span className="text-zinc-400">3.</span> Add to your Calmant <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded">.env</code> file:</p>
                <div className="bg-zinc-900 text-zinc-300 p-3 rounded-md overflow-x-auto space-y-1">
                  <code>WHATSAPP_VERIFY_TOKEN="..."</code><br/>
                  <code>WHATSAPP_ACCESS_TOKEN="..."</code><br/>
                  <code>WHATSAPP_PHONE_ID="..."</code>
                </div>
                <p><span className="text-zinc-400">4.</span> Set the webhook URL to <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded">/api/whatsapp/meta/webhook</code> in your Meta dashboard.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tighter text-zinc-900">Calmant.</span>
            <span className="text-sm text-zinc-500">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-500">
            <Link href="/login" className="hover:text-zinc-900">Terminal Login</Link>
            <a href="https://github.com" className="hover:text-zinc-900">GitHub Repository</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
