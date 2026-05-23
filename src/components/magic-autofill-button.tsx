import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVault } from "@/store";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "default";
  className?: string;
  workflowId?: string;
};

export function MagicAutofillButton({ size = "sm", className, workflowId }: Props) {
  const navigate = useNavigate();
  const profile = useVault((s) => s.profile);

  const run = () => {
    if (!profile.fullName || !profile.cnp) {
      toast.error("Completează datele în Seiful local mai întâi.");
      navigate({ to: "/vault" });
      return;
    }

    if (workflowId === "pfa-registration") {
      navigate({
        to: "/workflow/$id/pfa",
        params: { id: "pfa-registration" },
        search: { autofill: "1" },
      });
      toast.info("Deschide formularul dorit din dosarul PFA.");
      return;
    }

    navigate({ to: "/vault" });
    toast.info("Magic Autofill este disponibil complet pentru dosarul PFA.");
  };

  return (
    <Button size={size} variant="secondary" onClick={run} className={cn(className)}>
      <Wand2 className="size-4" /> Magic Autofill
    </Button>
  );
}
