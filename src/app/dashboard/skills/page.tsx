import { getUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Wrench, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function SkillsPage() {
  const userId = await getUserId();
  
  if (!userId) {
    return <div>Unauthorized</div>;
  }

  const skills = await prisma.skill.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Command Center
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Skills & Capabilities</h1>
          <p className="text-lg text-muted-foreground mt-2">Manage tools and capabilities available to the agent.</p>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.length === 0 ? (
            <div className="col-span-full p-12 border border-dashed rounded-2xl text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Wrench className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No custom skills defined.</p>
                <p className="text-sm text-muted-foreground mt-1">The agent is using base capabilities. Adding custom skills will extend its reach.</p>
              </div>
            </div>
          ) : (
            skills.map(skill => (
              <div key={skill.id} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 shadow-sm hover:border-foreground/20 transition-all flex flex-col">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-[var(--color-calmant-electric-blue)]/10 text-[var(--color-calmant-electric-blue)]">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider
                      ${skill.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                      {skill.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{skill.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    v{skill.version}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(skill.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
