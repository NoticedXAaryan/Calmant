import { Brain } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { MemoryOverview } from "@/components/app/memory/MemoryOverview";

export default function MemoryCenterPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 w-full">
      <PageHeader
        title="Agent Memory"
        description="View and manage what the assistant remembers about you."
      />
      <MemoryOverview />
    </div>
  );
}
