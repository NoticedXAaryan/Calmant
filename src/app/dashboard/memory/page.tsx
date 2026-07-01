import { Brain } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { MemoryOverview } from "@/components/app/memory/MemoryOverview";

export default function MemoryCenterPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Agent Memory"
        description="View and manage what the assistant remembers about you."
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <MemoryOverview />
        </div>
      </div>
    </div>
  );
}
