"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Sparkles, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import VoiceInput from "@/components/VoiceInput";

interface StepVoiceIntroProps {
  data: any;
  updateData: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

type VoicePhase = "intro" | "recording" | "processing" | "review";

interface ParsedPersona {
  name: string;
  bio: string;
  goals: string[];
  skills: string[];
  personality: string[];
  workStyle: string;
}

const PROMPTS = [
  {
    title: "Tell me about yourself",
    subtitle: "Your name, what you do, and what drives you",
    example: "\"I'm Alex, a computer science student interested in AI and startups...\"",
  },
  {
    title: "What are you working on?",
    subtitle: "Your current projects, studies, or career focus",
    example: "\"I'm building a portfolio site and applying for internships at AI companies...\"",
  },
  {
    title: "What's your big picture goal?",
    subtitle: "Where do you want to be in 1-2 years",
    example: "\"I want to land a role at a top AI lab and build my own tools on the side...\"",
  },
];

export function StepVoiceIntro({ data, updateData, onNext, onBack }: StepVoiceIntroProps) {
  const [phase, setPhase] = useState<VoicePhase>("intro");
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [persona, setPersona] = useState<ParsedPersona | null>(null);
  const [editedBio, setEditedBio] = useState("");

  const handleTranscript = useCallback((text: string) => {
    setTranscripts(prev => {
      const updated = [...prev];
      updated[currentPrompt] = text;
      return updated;
    });

    // Move to next prompt or to processing
    if (currentPrompt < PROMPTS.length - 1) {
      setCurrentPrompt(prev => prev + 1);
      setInterimText("");
    } else {
      // All prompts answered — generate persona
      setPhase("processing");
      generatePersona([...transcripts.slice(0, currentPrompt), text]);
    }
  }, [currentPrompt, transcripts]);

  const handleInterimTranscript = useCallback((text: string) => {
    setInterimText(text);
  }, []);

  const generatePersona = async (allTranscripts: string[]) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/onboarding/generate-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcripts: allTranscripts }),
      });

      if (!res.ok) throw new Error("Failed to generate persona");

      const result = await res.json();
      setPersona(result.persona);
      setEditedBio(result.persona.bio);
      updateData({
        name: result.persona.name,
        bio: result.persona.bio,
        goal: result.persona.goals?.[0] || data.goal,
      });
      setPhase("review");
    } catch (err) {
      console.error("Persona generation failed:", err);
      // Fallback: use raw transcripts
      const fallbackBio = allTranscripts.join(" ");
      setPersona({
        name: "",
        bio: fallbackBio,
        goals: [],
        skills: [],
        personality: [],
        workStyle: "",
      });
      setEditedBio(fallbackBio);
      setPhase("review");
    } finally {
      setIsGenerating(false);
    }
  };

  const startVoiceFlow = () => {
    setPhase("recording");
    setCurrentPrompt(0);
    setTranscripts([]);
    setInterimText("");
  };

  const skipToText = () => {
    setPhase("review");
    setPersona({
      name: data.name || "",
      bio: data.bio || "",
      goals: [],
      skills: [],
      personality: [],
      workStyle: "",
    });
    setEditedBio(data.bio || "");
  };

  const handleConfirm = () => {
    updateData({
      name: persona?.name || data.name,
      bio: editedBio || persona?.bio || data.bio,
    });
    onNext();
  };

  const resetFlow = () => {
    setPhase("intro");
    setCurrentPrompt(0);
    setTranscripts([]);
    setInterimText("");
    setPersona(null);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* ── INTRO ────────────────────────────────────── */}
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Let&apos;s get to know you
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your AI chief of staff needs to understand who you are, what you&apos;re
                working on, and where you&apos;re headed. The easiest way? Just talk.
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button
                size="lg"
                onClick={startVoiceFlow}
                className="gap-2 h-12"
              >
                <Mic className="h-5 w-5" />
                Start with voice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipToText}
                className="text-muted-foreground"
              >
                I&apos;d rather type
              </Button>
            </div>

            <div className="grid gap-3 pt-2">
              {PROMPTS.map((prompt, i) => (
                <Card key={i} className="border-dashed">
                  <CardContent className="p-3 text-left">
                    <p className="text-sm font-medium">{prompt.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{prompt.subtitle}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── RECORDING ────────────────────────────────── */}
        {phase === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                {PROMPTS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      i < currentPrompt
                        ? "bg-primary"
                        : i === currentPrompt
                        ? "bg-primary/50"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <h2 className="text-xl font-semibold tracking-tight">
                {PROMPTS[currentPrompt].title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {PROMPTS[currentPrompt].subtitle}
              </p>
            </div>

            {/* Voice recording area */}
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="h-24 w-24 flex items-center justify-center">
                  <VoiceInput
                    onTranscript={handleTranscript}
                    onInterimTranscript={handleInterimTranscript}
                  />
                </div>
              </div>

              {interimText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground max-w-md"
                >
                  {interimText}
                </motion.div>
              )}

              {transcripts[currentPrompt] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border bg-card p-3 text-sm max-w-md"
                >
                  {transcripts[currentPrompt]}
                </motion.div>
              )}
            </div>

            <p className="text-xs text-muted-foreground italic">
              {PROMPTS[currentPrompt].example}
            </p>
          </motion.div>
        )}

        {/* ── PROCESSING ───────────────────────────────── */}
        {phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4 py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
            <div className="space-y-1 text-center">
              <p className="text-lg font-medium">Building your persona...</p>
              <p className="text-sm text-muted-foreground">
                Understanding your goals, skills, and working style
              </p>
            </div>
          </motion.div>
        )}

        {/* ── REVIEW ───────────────────────────────────── */}
        {phase === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold tracking-tight">
                {persona?.name ? `Welcome, ${persona.name}` : "Your profile"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Review and edit your bio. This is what your AI will know about you.
              </p>
            </div>

            <Textarea
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              placeholder="Tell me about yourself, your goals, and what you're working on..."
              className="min-h-[140px] resize-none text-sm"
            />

            {persona && persona.goals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Detected Goals
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {persona.goals.map((goal, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {persona && persona.skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Skills & Expertise
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {persona.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  Back
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFlow} className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Redo
                </Button>
              </div>
              <Button onClick={handleConfirm} className="gap-1">
                Looks good
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
