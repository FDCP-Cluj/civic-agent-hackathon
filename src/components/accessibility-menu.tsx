import { useEffect } from "react";
import { Accessibility, Eye, Contrast, Type, Volume2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAccessibility, useSettings } from "@/store";
import { useReadAloud } from "@/hooks/use-read-aloud";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DYSLEXIC_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap";

/**
 * Ensures the Atkinson Hyperlegible stylesheet is loaded exactly once when the
 * dyslexic font toggle is first turned on. Saves ~30KB of network for users
 * who never need it.
 */
function useEnsureDyslexicFont(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    if (document.getElementById("civis-dyslexic-font")) return;
    const link = document.createElement("link");
    link.id = "civis-dyslexic-font";
    link.rel = "stylesheet";
    link.href = DYSLEXIC_FONT_HREF;
    document.head.appendChild(link);
  }, [active]);
}

/** Mirror three a11y toggles to <html> classes for global CSS effect. */
function useApplyA11yClasses() {
  const seniorMode = useSettings((s) => s.seniorMode);
  const { highContrast, dyslexicFont } = useAccessibility();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("senior-mode", seniorMode);
    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("dyslexic-font", dyslexicFont);
  }, [seniorMode, highContrast, dyslexicFont]);
}

/** Mount this once near the root so accessibility classes stay in sync. */
export function AccessibilityClassSync() {
  const dyslexicFont = useAccessibility((s) => s.dyslexicFont);
  const readAloud = useAccessibility((s) => s.readAloud);
  useApplyA11yClasses();
  useEnsureDyslexicFont(dyslexicFont);
  useReadAloud(readAloud);
  return null;
}

export function AccessibilityMenu({ open, onOpenChange }: Props) {
  const { seniorMode, toggleSenior } = useSettings();
  const { highContrast, setHighContrast, dyslexicFont, setDyslexicFont, readAloud, setReadAloud } =
    useAccessibility();

  const hasSpeech = typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-accent flex items-center justify-center">
              <Accessibility className="size-4 text-primary" aria-hidden />
            </div>
            <div>
              <SheetTitle className="text-base">Accesibilitate</SheetTitle>
              <SheetDescription className="text-xs">
                Personalizează experiența pentru nevoile tale. Setările se salvează automat.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-1">
          <ToggleRow
            icon={Eye}
            title="Mod Senior"
            description="Text mai mare, contrast crescut, butoane mai vizibile."
            checked={seniorMode}
            onChange={toggleSenior}
          />
          <ToggleRow
            icon={Contrast}
            title="Contrast Înalt"
            description="Palete WCAG AAA (≥7:1) — text negru pe alb, butoane intens colorate."
            checked={highContrast}
            onChange={setHighContrast}
          />
          <ToggleRow
            icon={Type}
            title="Font pentru dislexie"
            description="Înlocuiește fontul cu Atkinson Hyperlegible, optimizat pentru lectură."
            checked={dyslexicFont}
            onChange={setDyslexicFont}
          />
          <ToggleRow
            icon={Volume2}
            title="Citește cu voce tare"
            description={
              hasSpeech
                ? "Atinge orice paragraf pentru a-l asculta în limba română."
                : "Nu este disponibilă pe acest browser."
            }
            checked={readAloud && hasSpeech}
            disabled={!hasSpeech}
            onChange={setReadAloud}
          />
        </div>

        <div className="mt-5 pt-4 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
          Civis respectă <code className="font-mono">prefers-reduced-motion</code> automat. Toate
          animațiile decorative sunt dezactivate dacă ai cerut acest lucru în setările sistemului.
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: typeof Eye;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-1",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <div className="size-10 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{title}</div>
          <Switch
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label={title}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
