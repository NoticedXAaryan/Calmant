"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((err: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function VoiceInput({ onTranscript, onInterimTranscript, disabled }: VoiceInputProps) {
  // State
  const [listening, setListening] = useState(false);
  const [nativeSupported, setNativeSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Callback refs to avoid dependency cycle in useEffect
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onInterimTranscriptRef.current = onInterimTranscript;
  }, [onTranscript, onInterimTranscript]);

  // Init SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setNativeSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      let finalTranscript = "";

      rec.onstart = () => {
        finalTranscript = "";
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (onInterimTranscriptRef.current) {
          onInterimTranscriptRef.current(finalTranscript + interimTranscript);
        }
      };

      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        if (finalTranscript.trim()) {
          onTranscriptRef.current(finalTranscript.trim());
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startFallbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        if (onInterimTranscriptRef.current) {
          onInterimTranscriptRef.current("Transcribing audio...");
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.success && data.text) {
            onTranscriptRef.current(data.text);
          } else {
            if (onInterimTranscriptRef.current) {
              onInterimTranscriptRef.current("Transcription failed.");
            }
          }
        } catch (error) {
          console.error("Transcription error:", error);
          if (onInterimTranscriptRef.current) {
            onInterimTranscriptRef.current("Error during transcription.");
          }
        } finally {
          setIsTranscribing(false);
          // Stop all tracks to release microphone
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setListening(true);
      
      if (onInterimTranscriptRef.current) {
        onInterimTranscriptRef.current("Recording... (Tap mic to stop)");
      }
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
      if (onInterimTranscriptRef.current) {
        onInterimTranscriptRef.current("Microphone access denied.");
      }
    }
  };

  const stopFallbackRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setListening(false);
    }
  };

  const toggle = useCallback(() => {
    if (nativeSupported && recognitionRef.current) {
      // Use native SpeechRecognition
      if (listening) {
        recognitionRef.current.stop();
        setListening(false);
      } else {
        try {
          recognitionRef.current.start();
          setListening(true);
        } catch (err) {
          console.error("Speech recognition error:", err);
        }
      }
    } else {
      // Use fallback MediaRecorder
      if (listening) {
        stopFallbackRecording();
      } else {
        startFallbackRecording();
      }
    }
  }, [listening, nativeSupported]);

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {listening && nativeSupported && (
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
        
        {/* Simple pulse for fallback mode */}
        {listening && !nativeSupported && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 z-0 rounded-full bg-destructive/20"
          />
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggle}
        disabled={disabled || isTranscribing}
        title={listening ? "Stop listening" : "Use voice"}
        className={`relative z-10 h-8 w-8 shrink-0 rounded-full transition-all duration-300 ${
          listening ? "text-destructive hover:bg-transparent" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : listening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
