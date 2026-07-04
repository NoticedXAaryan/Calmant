"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Mic,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup">
              <Button size="sm" className="h-9 rounded-full px-5 text-sm font-medium">
                Start company
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Subtle ambient glow in background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-6xl px-6 relative z-10 grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Calmant Autonomous Pipeline Live
            </div>
            <h1 className="text-5xl md:text-7xl font-medium tracking-tight text-foreground leading-[1.1]">
              Your personal AI company.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-md">
              Not a chatbot. A digital CEO that intercepts messy brain-dumps, structures tasks, schedules focus blocks, and intervenes before deadlines slip.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-12 rounded-full px-8 text-base">
                  Hire your CEO
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* High-Craft Product Preview */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* The "Device" Frame */}
            <div className="relative rounded-2xl border border-border/50 bg-surface/50 p-2 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-background/80 to-surface/80" />
              
              {/* Inner Screen */}
              <div className="relative rounded-xl border border-border/80 bg-background overflow-hidden flex flex-col h-[500px]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-surface/30">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Execution Cockpit</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">0.91 Entropy</span>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 flex flex-col gap-6">
                  {/* Urgent Task Focus */}
                  <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-accent/5 p-5 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-accent mb-2">Critical Path</div>
                        <h3 className="text-xl font-medium text-foreground">Prepare Investor Update</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-mono bg-background border border-border px-2 py-1 rounded">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Due 6:00 PM</span>
                      </div>
                    </div>
                    
                    <div className="mt-5 border-t border-accent/10 pt-4">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Next Autonomous Action</div>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        Intel agent has scraped Q2 metrics. Focus block scheduled for 4:00 PM. <br/>
                        <span className="font-medium text-primary mt-1 inline-block">→ Drafting email outline now.</span>
                      </p>
                    </div>
                  </div>

                  {/* Task Queue (Stripped down, not cards) */}
                  <div className="flex-1">
                    <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Background Workers</div>
                    <ul className="space-y-4">
                      <li className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Scraping DBMS syllabus</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">Done</span>
                      </li>
                      <li className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin" />
                          <span className="text-sm font-medium text-foreground">Negotiating calendar slot</span>
                        </div>
                        <span className="text-xs font-mono text-primary">In progress</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy / Features (No card soup, editorial layout) */}
      <section className="border-t border-border/50 bg-surface/30 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mb-20">
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6">Designed for the moment willpower fails.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed font-light">
              We abandoned the standard to-do list. When you are overwhelmed, passive lists induce anxiety. Calmant is an execution system built on three principles.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-medium">Capture the mess.</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Speak or type exactly what's in your head. Our AI extracts the intent, deadline, and effort without requiring you to fill out 6 different form fields.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-medium">Zero silent assumptions.</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                If the input is ambiguous, the system slows down. It asks targeted questions rather than guessing, preventing phantom 2 AM deadlines.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-medium">Execute the next move.</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Calmant calculates "Entropy" (urgency based on slack time and effort). The cockpit hides the noise and presents only the exact next action you must take.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Department Architecture (Typography focused) */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-5">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6">7 Departments.<br/>1 CEO.</h2>
              <p className="text-lg text-muted-foreground leading-relaxed font-light mb-8">
                Every request is routed by the CEO to specialized AI workers running in the background. You never have to manually trigger a workflow.
              </p>
              <Link href="/signup">
                <Button variant="outline" className="rounded-full h-10 px-6">
                  See the architecture
                </Button>
              </Link>
            </div>
            
            <div className="lg:col-span-7">
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-12">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-primary font-mono text-sm">01</span>
                    <h4 className="text-lg font-medium">Deadline & Recovery</h4>
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Schedules focus blocks via Google Calendar, manages crisis planning when tasks go overdue.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-primary font-mono text-sm">02</span>
                    <h4 className="text-lg font-medium">Intel & Browser</h4>
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Spins up a headless browser to scrape necessary context and builds your long-term memory graph.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-primary font-mono text-sm">03</span>
                    <h4 className="text-lg font-medium">Omnichannel Comms</h4>
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Operates natively via WhatsApp and Email. Dispatches morning briefings and evening reviews.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-primary font-mono text-sm">04</span>
                    <h4 className="text-lg font-medium">Creator</h4>
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Generates document outlines, synthesizes research, and drafts responses autonomously.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-surface/30">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-8">Ready to hire your AI company?</h2>
          <p className="text-xl text-muted-foreground font-light mb-10 max-w-2xl mx-auto">
            Stop making lists. Start executing. Deploy your CEO in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 rounded-full px-8 text-base w-full sm:w-auto">
                Get started today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Logo />
            <span className="text-border/50">|</span>
            <span>Always on. Always learning.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
