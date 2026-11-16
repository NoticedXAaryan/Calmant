"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { PendingApprovals } from "@/components/app/dashboard/PendingApprovals";

export default function ApprovalsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Review"
        title="Approvals"
        description="Calmant pauses before it sends a message, changes a calendar, or submits a form. Approve or reject each action here."
      />
      <PendingApprovals showEmpty />
    </div>
  );
}
