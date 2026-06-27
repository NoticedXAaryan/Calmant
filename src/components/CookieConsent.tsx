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

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-card border-t border-border shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground flex-1">
          We use cookies to improve your experience and analyze site usage. By clicking "Accept", you agree to our use of cookies.
          For more information, see our <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <Button variant="outline" onClick={handleDecline} className="flex-1 sm:flex-none">
            Decline
          </Button>
          <Button onClick={handleAccept} className="flex-1 sm:flex-none">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
