import { Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/store";

export function SeniorModeToggle() {
  const { seniorMode, toggleSenior } = useSettings();
  return (
    <div className="flex items-start gap-3">
      <div className="size-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
        <Eye className="size-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Mod Senior</div>
          <Switch checked={seniorMode} onCheckedChange={toggleSenior} aria-label="Mod Senior" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Text mai mare, contrast crescut și butoane mai vizibile.
        </p>
      </div>
    </div>
  );
}
