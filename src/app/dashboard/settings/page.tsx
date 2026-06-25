"use client";

import { useState, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { User, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize state once session loads
  if (session && !name && session.user?.name) {
    setName(session.user.name);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const { error: updateError } = await authClient.updateUser({
        name,
      });

      if (updateError) {
        throw new Error(updateError.message || "Failed to update profile");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to Base64 (suitable for quick prototype/local DB without storage bucket)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      setLoading(true);
      try {
        const { error: updateError } = await authClient.updateUser({
          image: base64Image,
        });
        if (updateError) throw new Error(updateError.message);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || "Failed to upload image");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal details and public profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium leading-none">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">
                Click the avatar to upload a new picture.
              </p>
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
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
              <Input
                id="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Your email address cannot be changed.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-500">
                <CheckCircle2 size={16} />
                Profile updated successfully.
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
