import { Button } from "@/components/ui/button";
import { ArrowRight, User } from "lucide-react";

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <User className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Let's build your execution cockpit.</h1>
      <p className="mt-4 text-base leading-6 text-muted-foreground max-w-md mx-auto">
        Calmant turns deadlines, reminders, and AI assistance into one daily plan. I am your autonomous AI company living on your phone.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full justify-center">
        <Button size="lg" onClick={onNext} className="w-full sm:w-auto h-12 px-8 text-base shadow-md">
          Set up my cockpit
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
