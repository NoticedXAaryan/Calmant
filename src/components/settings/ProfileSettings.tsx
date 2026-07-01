"use client";

import { useState, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { User, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/app/SectionCard";

export function ProfileSettings() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (session && !name && session.user?.name) {
    setName(session.user.name);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const { error: updateError } = await authClient.updateUser({ name });
      if (updateError) throw new Error(updateError.message || "Failed to update profile");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      setLoading(true);
      try {
        const { error: updateError } = await authClient.updateUser({ image: base64Image });
        if (updateError) throw new Error(updateError.message);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  if (isPending) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SectionCard title="Profile" description="Update your personal details and public profile picture.">
      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="flex h-24 w-24 overflow-hidden shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={40} className="opacity-50" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera size={24} className="text-white" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium leading-none">Profile Picture</h3>
            <p className="text-sm text-muted-foreground">Click the avatar to upload a new picture.</p>
            {session?.user?.image && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  setLoading(true);
                  await authClient.updateUser({ image: "" });
                  setLoading(false);
                }}
              >
                Remove picture
              </Button>
            )}
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t border-border/50">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium leading-none">Full Name</label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Email address</label>
            <Input value={session?.user?.email || ""} disabled className="bg-muted" />
            <p className="text-[0.8rem] text-muted-foreground">Email address cannot be changed currently.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Timezone</label>
            <Input value={Intl.DateTimeFormat().resolvedOptions().timeZone} disabled className="bg-muted" />
            <p className="text-[0.8rem] text-muted-foreground">Automatically detected from browser.</p>
          </div>

          {error && <div className="text-sm font-medium text-destructive">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {success ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" /> : null}
            {success ? "Saved" : "Save changes"}
          </Button>
        </form>
      </div>
    </SectionCard>
  );
}
