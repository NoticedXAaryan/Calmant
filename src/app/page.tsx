"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle2, Zap, Brain, Clock,
  Bell, Repeat, MessageSquare, Star, Sparkles,
  ChevronDown, Moon,
} from "lucide-react";

/* ─── Rotating headline word ─────────────────────────────────────────── */
const WORDS = ["your tasks", "your habits", "your mornings", "your deadlines", "your life"];

function RotatingWord() {
  const [i, setI] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVis(false);
      setTimeout(() => { setI((p) => (p + 1) % WORDS.length); setVis(true); }, 280);
    }, 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-block min-w-[14ch] text-left">
      <AnimatePresence mode="wait">
        {vis && (
          <motion.span
            key={WORDS[i]}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.26 }}
            className="text-white/30"
          >
            {WORDS[i]}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ─── Animated chat demo ──────────────────────────────────────────────── */
const CHAT_SCRIPT = [
  { from: "user",  text: "remind me to send invoice to Alex tomorrow 9am" },
  { from: "bot",   text: "Done ✓ — Send invoice to Alex is on your list for tomorrow at 9 AM." },
  { from: "user",  text: "also dentist call sometime next week, low priority" },
  { from: "bot",   text: "Added ✓ — Call dentist is scheduled for next week, low priority." },
  { from: "brief", text: "☀️ Morning Brief — 4 tasks today. Top priority: Send invoice to Alex (due 9 AM)." },
] as const;

type ScriptMsg = typeof CHAT_SCRIPT[number];

function ChatBubble({ msg, visible }: { msg: ScriptMsg; visible: boolean }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!visible) return;
    let idx = 0;
    const id = setInterval(() => {
      setShown(msg.text.slice(0, idx + 1));
      idx++;
      if (idx >= msg.text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [visible, msg.text]);

  if (!visible && shown === "") return null;
  const isUser = msg.from === "user";

  if (msg.from === "brief") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#16162a] border border-indigo-500/20 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%]">
        <p className="text-[10px] font-bold tracking-wider uppercase text-indigo-400 mb-1">Morning Brief</p>
        <p className="text-white/70 text-xs leading-snug">{shown}</p>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`rounded-2xl px-4 py-2.5 max-w-[82%] text-xs leading-snug ${
        isUser ? "bg-emerald-700/70 text-white rounded-br-sm" : "bg-white/7 text-white/75 rounded-bl-sm"
      }`}>{shown}</div>
    </motion.div>
  );
}

function LiveChat() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(-1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        [400, 1900, 3400, 5100, 6800].forEach((d, i) =>
          setTimeout(() => setStep(i), d)
        );
        obs.disconnect();
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full max-w-[330px] mx-auto">
      <div className="bg-[#0e0e0e] border border-white/8 rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0e0e0e]" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Calmant</p>
            <p className="text-xs text-white/30 mt-0.5">replies instantly</p>
          </div>
        </div>
        <div className="px-4 py-5 space-y-2.5 min-h-[230px] flex flex-col justify-end">
          {CHAT_SCRIPT.map((msg, i) => (
            <ChatBubble key={i} msg={msg} visible={step >= i} />
          ))}
          {step >= 0 && step < CHAT_SCRIPT.length - 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex gap-1 px-3 py-2 bg-white/5 rounded-full w-fit">
              {[0, 1, 2].map((j) => (
                <motion.span key={j} className="w-1.5 h-1.5 rounded-full bg-white/25"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: MessageSquare, tag: "Natural language", title: "Talk, don't type",
    desc: "Send a voice note or a quick message on WhatsApp or Telegram. Calmant reads it, understands it, and turns it into a real task — no forms, no new app to open." },
  { icon: Brain, tag: "AI prioritisation", title: "It knows what matters",
    desc: "Every task gets a priority score based on urgency, deadline pressure, and how long you've been avoiding it. The most important thing is always at the top." },
  { icon: Clock, tag: "Morning Brief", title: "A brief, every morning",
    desc: "Wake up to a short summary of what today looks like. Your top priorities, deadlines, and anything you snoozed yesterday. One message, full picture." },
  { icon: Moon, tag: "Evening Review", title: "A review, every evening",
    desc: "Each night Calmant closes the day. It logs what got done, rolls forward what didn't. You always wake up knowing exactly where you stand." },
  { icon: Repeat, tag: "Habit tracking", title: "Habits that stick",
    desc: "Tell Calmant 'I want to read 20 minutes a day' once. It tracks your streak, nudges you when you miss, and celebrates when you don't." },
  { icon: Bell, tag: "Smart reminders", title: "Reminders with memory",
    desc: "Reminders land in the same chat thread, not some separate app. The same WhatsApp. The same Telegram. No new notification badge to ignore." },
];

const STEPS = [
  { n: "1", title: "Connect your messenger",
    body: "Link WhatsApp or Telegram once. Takes two minutes. After that, the chat is your entire interface.",
    aside: "No app download. No browser extension needed to get started." },
  { n: "2", title: "Say what's on your mind",
    body: "Voice note, typed message, forwarded reminder — Calmant understands plain language and turns it into a structured task.",
    aside: '"Remind me to call the bank on Thursday" is enough.' },
  { n: "3", title: "Calmant sorts the pile",
    body: "Every task gets a priority score. You always know what needs to happen next without any manual effort.",
    aside: "No tags. No drag-and-drop. It just knows." },
  { n: "4", title: "Show up. Do the work.",
    body: "Morning brief before your day starts. Evening review to close it out. The dashboard is there when you need the full picture.",
    aside: "Two check-ins a day. Everything else is automatic." },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "Founder, early-stage startup", stars: 5,
    text: "I stopped missing things. My calendar used to feel like a battle I was always losing. Calmant just… handles it." },
  { name: "Marcus T.", role: "Freelance designer", stars: 5,
    text: "I hated every productivity app I tried. This one works because it lives where I already am — WhatsApp." },
  { name: "Aisha K.", role: "Operations manager", stars: 5,
    text: "The morning brief alone is worth it. I know exactly what my day looks like before I've had coffee." },
];

const STATS = [
  { value: "3 min", label: "average setup time" },
  { value: "94%",   label: "tasks captured first try" },
  { value: "2×",    label: "more tasks done per week" },
  { value: "0",     label: "new apps to install" },
];

const f = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" as const },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
});

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans overflow-x-hidden selection:bg-white/15">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-[#080808]/75 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-black" fill="black" />
            </div>
            <span className="font-bold tracking-tight">Calmant</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#how-it-works" className="hover:text-white/80 transition-colors">How it works</a>
            <a href="#features" className="hover:text-white/80 transition-colors">Features</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-white/40 hover:text-white/80 transition-colors">
              Sign in
            </Link>
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 bg-white text-black text-sm font-semibold rounded-lg px-4 py-2 hover:bg-white/90 active:scale-[0.97] transition-all">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — two column */}
      <section className="relative min-h-svh flex items-center px-6 pt-24 pb-16 overflow-hidden">
        {/* background glow — left-leaning now that layout is split */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 55% at 30% 40%, rgba(255,255,255,0.022) 0%, transparent 65%)" }} />

        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: copy ─────────────────────────────────────────── */}
          <div className="flex flex-col items-start">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/25 mb-6">
              WhatsApp &amp; Telegram · AI-powered
            </motion.p>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="text-[clamp(2.4rem,5vw,4.2rem)] font-extrabold tracking-tight leading-[1.06]">
              Finally in control of<br />
              <RotatingWord />
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-6 text-[1.05rem] text-white/45 leading-[1.7] max-w-[440px]">
              Message Calmant on WhatsApp or Telegram — it turns your words into
              tasks, prioritises them, and keeps you on track without any new app
              to learn.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.44 }}
              className="mt-9 flex flex-col sm:flex-row items-start gap-3">
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-white text-black font-bold rounded-xl px-8 py-3.5 text-[0.95rem] hover:bg-white/90 active:scale-[0.97] transition-all shadow-[0_0_50px_rgba(255,255,255,0.07)]">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-white/35 text-sm hover:text-white/60 transition-colors self-center">
                See how it works <ChevronDown className="w-3.5 h-3.5" />
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-7 flex flex-wrap items-center gap-5 text-xs text-white/25">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Free to start</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> 3 min setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> No new app</span>
            </motion.div>
          </div>

          {/* ── Right: live chat ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <LiveChat />
          </motion.div>

        </div>
      </section>

      <div className="border-t border-white/[0.04]" />

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...f(i * 0.07)}>
              <p className="text-3xl font-black tracking-tight">{s.value}</p>
              <p className="text-sm text-white/35 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="border-t border-white/[0.04]" />

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...f()} className="mb-20">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/25 mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-xl">
              From messy thought<br />to done — in seconds.
            </h2>
          </motion.div>
          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <motion.div key={step.n} {...f(i * 0.06)}
                className="grid md:grid-cols-[1fr_1.4fr] gap-8 md:gap-16 py-10 border-b border-white/[0.04] last:border-0">
                <div className="flex gap-5 items-start">
                  <span className="text-xs font-bold text-white/15 mt-1 w-4 shrink-0">{step.n}</span>
                  <div>
                    <h3 className="text-xl font-bold mb-2 leading-snug">{step.title}</h3>
                    <p className="text-white/45 leading-relaxed text-[0.95rem]">{step.body}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center">
                  <p className="text-white/20 text-sm italic leading-relaxed border-l-2 border-white/8 pl-5">{step.aside}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.04]" />

      {/* Features */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...f()} className="mb-16">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/25 mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight max-w-xl leading-tight">
              Built for real life,<br />not perfect conditions.
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] border border-white/[0.04] rounded-2xl overflow-hidden">
            {FEATURES.map((feat, i) => (
              <motion.div key={feat.title} {...f(i * 0.05)}
                className="bg-[#080808] hover:bg-white/[0.025] transition-colors p-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <feat.icon className="w-4 h-4 text-white/45" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-white/20 bg-white/5 px-2 py-1 rounded-md">
                    {feat.tag}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-[1rem] mb-2">{feat.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.04]" />

      {/* Integrations */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...f()}>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/25 mb-4">Works where you are</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">No new apps. Ever.</h2>
            <p className="text-white/45 text-lg max-w-md mx-auto mb-16">
              Calmant lives inside the apps you use every day. Flip a switch — done.
            </p>
          </motion.div>
          <div className="flex flex-col sm:flex-row justify-center gap-5 max-w-xl mx-auto">
            {[
              {
                name: "WhatsApp",
                sub: "Connect your personal number. Message Calmant like any contact. Voice notes work too.",
                iconColor: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15 hover:border-emerald-500/25",
                badgeColor: "text-emerald-500",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 21.036c-1.583 0-3.136-.425-4.498-1.232l-.32-.19-3.342.875.89-3.256-.21-.334c-.886-1.41-1.353-3.037-1.353-4.708 0-4.887 3.978-8.865 8.865-8.865 4.884 0 8.862 3.977 8.862 8.864s-3.978 8.846-8.894 8.846zm4-6.75c-.22-.11-1.295-.64-1.496-.713-.203-.074-.35-.11-.497.11-.148.22-.564.713-.69.86-.128.147-.256.164-.476.055-.22-.11-1.01-.373-1.92-1.184-.71-.634-1.188-1.416-1.326-1.636-.138-.22-.015-.338.095-.448.1-.1.22-.256.33-.384.11-.128.147-.22.22-.367.074-.146.037-.275-.018-.385-.055-.11-.497-1.198-.68-1.64-.18-.426-.363-.368-.497-.375-.128-.007-.276-.007-.424-.007-.148 0-.387.056-.59.276-.203.22-.77.753-.77 1.836s.788 2.13.898 2.279c.11.148 1.55 2.365 3.755 3.317.525.226.934.36 1.253.461.527.167 1.006.143 1.385.087.422-.063 1.295-.53 1.478-1.042.183-.513.183-.952.128-1.043-.055-.09-.202-.147-.422-.257z"/>
                  </svg>
                ),
              },
              {
                name: "Telegram",
                sub: "Find @CalmantBot and start chatting. Instant response, works anywhere in the world.",
                iconColor: "text-sky-400", bg: "bg-sky-500/8 border-sky-500/15 hover:border-sky-500/25",
                badgeColor: "text-sky-500",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.08-.19-.09-.05-.21-.02-.3.01-.13.04-2.23 1.43-6.28 4.16-.59.41-1.13.6-1.61.59-.53-.01-1.56-.3-2.32-.55-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.89-2.12 5.87-2.53 2.79-1.16 3.37-1.36 3.75-1.36.08 0 .27.02.39.1.1.07.16.16.18.27.01.07.01.16 0 .24z"/>
                  </svg>
                ),
              },
            ].map((p, i) => (
              <motion.div key={p.name} {...f(i * 0.08)}
                className={`flex-1 border rounded-2xl p-7 text-left transition-colors group ${p.bg}`}>
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 ${p.iconColor}`}>
                  {p.icon}
                </div>
                <h3 className={`font-bold text-base mb-2 ${p.iconColor}`}>{p.name}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{p.sub}</p>
                <div className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${p.badgeColor}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.04]" />

      {/* Testimonials */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...f()} className="text-center mb-16">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/25 mb-4">What people say</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Finally feels like it&apos;s<br />
              <span className="text-white/30">working for me.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} {...f(i * 0.08)}
                className="bg-white/[0.02] border border-white/6 rounded-2xl p-7 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-white/55 leading-relaxed flex-1 text-sm">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.04]" />

      {/* CTA */}
      <section className="py-36 px-6 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[400px] rounded-full bg-white/[0.025] blur-3xl" />
        </div>
        <div className="max-w-xl mx-auto text-center relative">
          <motion.div {...f()}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/8 bg-white/[0.03] text-xs font-medium text-white/40 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Free during early access
            </div>
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-5">
              Start today.<br />
              <span className="text-white/25">No chaos, no excuses.</span>
            </h2>
            <p className="text-white/40 text-lg mb-10 leading-relaxed">
              Takes three minutes. Works through an app you already have. No credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-white text-black font-bold rounded-xl px-10 py-4 text-base hover:bg-white/90 active:scale-[0.97] transition-all shadow-[0_0_60px_rgba(255,255,255,0.12)]">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="text-sm text-white/30 hover:text-white/60 transition-colors">
                Already have an account? Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
              <Zap className="w-3 h-3 text-black" fill="black" />
            </div>
            <span className="font-bold tracking-tight text-sm">Calmant</span>
            <span className="text-white/15 text-sm">© 2026</span>
          </div>
          <div className="flex items-center gap-7 text-sm text-white/25">
            <a href="#how-it-works" className="hover:text-white/60 transition-colors">How it works</a>
            <a href="#features" className="hover:text-white/60 transition-colors">Features</a>
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-white/60 transition-colors">Get started</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
