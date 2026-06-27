"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookie_consent", "all");
    setShow(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem("cookie_consent", "necessary");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm p-4 bg-card border border-border shadow-2xl rounded-xl">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Cookie Preferences</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use cookies to improve your experience. You can accept all cookies or only those necessary for the site to function properly. See our <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={handleAcceptAll} className="w-full">
            Accept All
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAcceptNecessary} className="flex-1">
              Necessary Only
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
