import { useState } from "react";
import { Wand2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVault } from "@/store";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "default";
  className?: string;
};

export function MagicAutofillButton({ size = "sm", className }: Props) {
  const navigate = useNavigate();
  const profile = useVault((s) => s.profile);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  const run = async () => {
    if (!profile.fullName || !profile.cnp) {
      toast.error("Completează datele în Seiful local mai întâi.");
      navigate({ to: "/vault" });
      return;
    }
    setState("loading");
    await new Promise((r) => setTimeout(r, 700));
    setState("success");
    toast.success(`Formular completat cu ${profile.fullName}`, {
      description: `CNP ${profile.cnp.slice(0, 3)}*** preluat din seiful local.`,
    });
    setTimeout(() => setState("idle"), 1800);
  };

  return (
    <Button
      size={size}
      variant="secondary"
      onClick={run}
      disabled={state !== "idle"}
      className={cn(
        "transition-all duration-300",
        state === "success" &&
          "bg-success text-success-foreground hover:bg-success disabled:opacity-100",
        className,
      )}
    >
      {state === "loading" ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Completez…
        </>
      ) : state === "success" ? (
        <>
          <Check className="size-4 animate-[scale-in_0.2s_ease-out]" /> Completat
        </>
      ) : (
        <>
          <Wand2 className="size-4" /> Magic Autofill
        </>
      )}
    </Button>
  );
}
