"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  payload: any;
  status: string;
  createdAt: string;
}

export function PendingApprovals() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Loading approvals...</div>;
  }

  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 border border-border/50 bg-card p-6 relative">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-4">Pending Approvals</div>
      <div className="space-y-4">
        {approvals.map((req) => (
          <div key={req.id} className="p-4 border border-border bg-background rounded-md flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h3 className="font-semibold">{req.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
              <pre className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-24 overflow-auto">
                {JSON.stringify(req.payload, null, 2)}
              </pre>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-center gap-2 min-w-[120px]">
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                onClick={() => handleAction(req.id, "approve")}
                disabled={processing === req.id}
              >
                {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2"/> Approve</>}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => handleAction(req.id, "reject")}
                disabled={processing === req.id}
              >
                {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2"/> Reject</>}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
