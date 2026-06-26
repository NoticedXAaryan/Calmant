"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function VoiceInput({ onTranscript, onInterimTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      let finalTranscript = "";

      rec.onstart = () => {
        finalTranscript = "";
      };

      rec.onresult = (event) => {
        let interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (onInterimTranscript) {
          onInterimTranscript(finalTranscript + interimTranscript);
        }
      };

      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim());
        }
      };

      setRecognition(rec);
    }
    }, 0);
    return () => window.clearTimeout(id);
  }, [onInterimTranscript, onTranscript]);

  const toggle = useCallback(() => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      try {
        recognition.start();
        setListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  }, [recognition, listening]);

  if (!supported) return null;

  return (
    <div className="relative flex items-center justify-center">
      {/* Animated Waveform Background when listening */}
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-0 flex items-center justify-center gap-[2px] rounded-full bg-destructive/10"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: ["20%", "70%", "20%"],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }}
                className="w-1 rounded-full bg-destructive/40"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggle}
        disabled={disabled}
        title={listening ? "Stop listening" : "Use voice"}
        className={`relative z-10 h-8 w-8 shrink-0 rounded-full transition-all duration-300 ${
          listening ? "text-destructive hover:bg-transparent" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    </div>
  );
}
