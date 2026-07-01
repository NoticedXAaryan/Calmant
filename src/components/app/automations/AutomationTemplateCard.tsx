import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Zap, LucideIcon } from "lucide-react";
import { toast } from "sonner";

export interface AutomationTemplate {
  id: string;
  title: string;
  benefit: string;
  triggerText: string;
  actionText: string;
  setupTime: string;
  requiredIntegrations: string[];
  icon: LucideIcon;
}

interface AutomationTemplateCardProps {
  template: AutomationTemplate;
}

export function AutomationTemplateCard({ template }: AutomationTemplateCardProps) {
  const handleEnable = () => {
    toast.info(`Configuring ${template.title}...`);
    // In a real app, this would open a configuration modal
  };

  const Icon = template.icon;

  return (
    <div className="flex flex-col h-full border border-border bg-card rounded-lg overflow-hidden transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="p-5 flex-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary/10 text-primary rounded-md">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{template.title}</h3>
            <p className="text-xs text-muted-foreground">{template.setupTime} setup</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-5 min-h-[40px]">
          {template.benefit}
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 min-w-14 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              When
            </div>
            <div className="text-sm font-medium text-foreground">{template.triggerText}</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 min-w-14 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              Do this
            </div>
            <div className="text-sm font-medium text-foreground">{template.actionText}</div>
          </div>
        </div>

        {template.requiredIntegrations.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Requires:</span>
            {template.requiredIntegrations.map(integration => (
              <span key={integration} className="text-[10px] font-medium px-1.5 py-0.5 bg-muted rounded">
                {integration}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/20 flex gap-3">
        <Button variant="outline" className="flex-1 text-xs" onClick={() => toast.info("Opening preview...")}>
          Preview
        </Button>
        <Button className="flex-1 text-xs" onClick={handleEnable}>
          <Plus className="h-3 w-3 mr-1" /> Use Template
        </Button>
      </div>
    </div>
  );
}
