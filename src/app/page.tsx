"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  ListChecks,
  MessageCircle,
  MessageSquareText,
  Mic,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "1", label: "next action surfaced" },
  { value: "0", label: "random deadlines saved" },
  { value: "3", label: "channels supported" },
  { value: "24/7", label: "deadline watch" },
];

const problems = [
  "Notifications arrive without context and become background noise.",
  "Dashboards ask overwhelmed users to make even more decisions.",
  "Vague tasks stay vague until the final hour.",
  "Most tools punish failure instead of creating a recovery path.",
];

const workflow = [
  {
    icon: MessageSquareText,
    title: "Capture the messy version",
    body: "Type, paste, or speak the actual sentence in your head. Calmant extracts task, deadline, estimate, reminder intent, and uncertainty.",
  },
  {
    icon: ShieldCheck,
    title: "Confirm before it commits",
    body: "If the wording is ambiguous, Calmant asks targeted questions first. No silent guesses. No phantom 2 AM deadlines.",
  },
  {
    icon: Wand2,
    title: "Break it into the first move",
    body: "Long or stressful work becomes a concrete next action that can be started now, not a motivational paragraph.",
  },
  {
    icon: CalendarCheck,
    title: "Build the rescue plan",
    body: "The planner generates focus blocks ordered by risk, deadline pressure, snoozes, and missing subtasks.",
  },
];

const features = [
  {
    icon: TimerReset,
    title: "Execution cockpit",
    body: "The default screen is not chat. It shows the one task to start, why it matters, and the exact action to take.",
  },
  {
    icon: Mic,
    title: "Live voice capture",
    body: "Click the mic and watch speech appear in the task capture box before you confirm it.",
  },
  {
    icon: TrendingUp,
    title: "Entropy scoring",
    body: "Risk is calculated from time slack, estimated effort, priority, snoozes, and whether the task has been broken down.",
  },
  {
    icon: ListChecks,
    title: "AI breakdowns",
    body: "Break large commitments into small actions with an LLM when available and a deterministic fallback when it is not.",
  },
  {
    icon: BellRing,
    title: "Notification ladder",
    body: "In-app alerts work by default. Email can send confirmations and critical alerts when configured.",
  },
  {
    icon: MessageCircle,
    title: "Messaging-ready",
    body: "Telegram and WhatsApp are presented honestly: available when configured, hidden from false promises when not.",
  },
];

const scenarios = [
  {
    title: "Student before an exam",
    input: "I want to study for my exam tomorrow at 2:00. Remind me in 10 minutes.",
    output: "Calmant asks whether 2:00 is AM or PM and whether 10 minutes is a reminder or a work duration.",
  },
  {
    title: "Founder with a client deadline",
    input: "Need to send investor update by Friday evening, probably 2 hours.",
    output: "It captures the deadline, estimates effort, creates a focus block, and recommends the first writing step.",
  },
  {
    title: "Professional juggling meetings",
    input: "Call Riya next week and prep proposal before the meeting.",
    output: "It separates event and preparation work so planning does not mix attendance with execution.",
  },
];

const channels = [
  { name: "In-app", status: "Always active", body: "The cockpit and alert banner are available without external setup." },
  { name: "Email", status: "Configurable", body: "Send task confirmations and critical alerts when Resend is configured." },
  { name: "Telegram", status: "Bot ready", body: "Works after the app owner configures a bot token and starts the listener." },
  { name: "WhatsApp", status: "Webhook ready", body: "Uses the official Meta API when production credentials are configured." },
];

const sampleTasks = [
  { title: "Study for DBMS exam", due: "Tomorrow, 2:00 PM", score: "0.91", color: "bg-red-500" },
  { title: "Send project invoice", due: "Today, 6:00 PM", score: "0.74", color: "bg-orange-500" },
  { title: "Review pitch notes", due: "Fri, 11:00 AM", score: "0.42", color: "bg-amber-500" },
];

function SectionHeader({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">{body}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="text-sm font-medium">Today</div>
          <div className="text-xs text-muted-foreground">Execution cockpit</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          critical
        </div>
        <h2 className="text-xl font-semibold">Study for DBMS exam</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4" /> Tomorrow, 2:00 PM
          </span>
          <span className="inline-flex items-center gap-1.5">
            <AlarmClock className="h-4 w-4" /> 90 min estimate
          </span>
        </div>
        <div className="mt-4 rounded-md border border-border bg-card p-3">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Next action</div>
          <p className="mt-2 text-sm font-medium">Open the syllabus and list the exact topics to revise.</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Capture</div>
          <Mic className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-md border border-input bg-card p-3 text-sm text-muted-foreground">
          &quot;Remind me in 10 minutes for my 2:00 exam tomorrow&quot;
        </div>
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <div className="font-medium text-amber-700 dark:text-amber-300">Needs confirmation</div>
          <div className="mt-1 text-muted-foreground">
            Is 2:00 AM or PM? Should the 10 minutes be a reminder or work duration?
          </div>
        </div>
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-background">
        {sampleTasks.map((task) => (
          <div key={task.title} className="grid grid-cols-[20px_minmax(0,1fr)_64px] gap-3 p-3 text-sm">
            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${task.color}`} />
            <div className="min-w-0">
              <div className="truncate font-medium">{task.title}</div>
              <div className="text-xs text-muted-foreground">{task.due}</div>
            </div>
            <div className="font-mono text-xs text-muted-foreground">{task.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Calmant" width={32} height={32} className="rounded-md" priority />
            <span className="text-sm font-semibold tracking-tight">Calmant</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#workflow" className="hover:text-foreground">Workflow</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#channels" className="hover:text-foreground">Channels</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>
                Start
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            AI execution companion for last-minute humans
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
            Stop missing deadlines. Start the next action.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Calmant turns vague commitments into confirmed tasks, prioritizes the risk, and gives you one concrete focus block at a time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Open dashboard
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm text-muted-foreground sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
                <div className="text-xl font-semibold text-foreground">{stat.value}</div>
                {stat.label}
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader
            label="Why reminders fail"
            title="The problem is not memory. It is execution friction."
            body="When someone is stressed, tired, or time blind, a notification is just another decision to ignore. Calmant reduces the decision to one concrete action."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {problems.map((problem) => (
              <div key={problem} className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                <FileCheck2 className="mb-3 h-5 w-5 text-muted-foreground" />
                {problem}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <SectionHeader
          label="Workflow"
          title="From messy sentence to protected focus time."
          body="The system is built for imperfect input. It does not need the user to already know how to plan."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {workflow.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-5 flex items-center justify-between">
                <step.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionHeader
            label="Features"
            title="A real productivity product, not a chatbot skin."
            body="Chat is still available, but the core product is an execution system: parse, confirm, prioritize, plan, and act."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-border bg-card p-5">
                <feature.icon className="mb-4 h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <SectionHeader
          label="Ambiguity handling"
          title="If the input is confusing, the product slows down."
          body="A missed deadline is worse than a confirmation step. Calmant asks focused questions when it is not confident."
        />
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div key={scenario.title} className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-base font-semibold">{scenario.title}</h3>
              <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                &quot;{scenario.input}&quot;
              </div>
              <div className="mt-3 flex gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-muted-foreground">{scenario.output}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="channels" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionHeader
            label="Channels"
            title="Reach users where action actually happens."
            body="The app works on its own, and external channels become available only when they are truly configured."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {channels.map((channel) => (
              <div key={channel.name} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  {channel.status}
                </div>
                <h3 className="text-base font-semibold">{channel.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{channel.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 md:px-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Designed for the moment willpower fails.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Calmant is not trying to make you maintain another perfect system. It exists for the messy last-minute moment when you need a sane next action.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BellRing className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Built for demos, but honest about production.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            In-app planning, capture, scoring, and focus blocks work directly. Email, Telegram, and WhatsApp show real configuration state instead of fake connected badges.
          </p>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Ready to stop guessing what to do next?</h2>
            <p className="mt-2 text-muted-foreground">Open the dashboard and capture one real commitment.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/signup">
              <Button size="lg">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Built for action, not passive reminders.
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
