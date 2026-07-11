"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ShieldAlert } from "lucide-react";

export function PrivacyDataSettings() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const { error } = await authClient.deleteUser({
        callbackURL: "/signup",
      });
      
      if (error) {
        toast.error("Failed to delete account: " + error.message);
        setIsDeleting(false);
      } else {
        toast.success("Account deleted successfully.");
        router.push("/signup");
      }
    } catch (e: any) {
      toast.error("An error occurred while deleting account.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Data Export" description="Download a copy of everything Calmant knows about you.">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Export My Data</p>
            <p className="text-xs text-muted-foreground">Get a JSON file containing your tasks, memory graph, and automation logs.</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone" description="Irreversible deletion actions.">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="font-medium text-sm">Clear AI Memory</p>
              <p className="text-xs text-muted-foreground">Wipe all learned preferences and patterns. Does not delete tasks.</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">Clear Memory</Button>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="font-medium text-sm">Clear Run History</p>
              <p className="text-xs text-muted-foreground">Delete the activity logs for AI operations and background workers.</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">Clear Logs</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-destructive">Delete Account</p>
              <p className="text-xs text-destructive/80">Permanently delete your account and all associated data.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" /> {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
