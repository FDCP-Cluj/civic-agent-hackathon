// Small donut chart that surfaces the vault profile completeness on the
// dashboard. Reuses recharts (already a dep). Clicking the chart takes
// the user straight to /vault to fill in the missing pieces.

import { Link } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ArrowRight, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useProfileCompleteness, useVault } from "@/store";

export function ProfileCompleteness() {
  const completeness = useProfileCompleteness();
  const pct = Math.round(completeness * 100);
  const profile = useVault((s) => s.profile);

  // Identify missing fields so the helper text is specific.
  const missing: string[] = [];
  if (!profile.fullName.trim()) missing.push("nume");
  if (!profile.cnp.trim()) missing.push("CNP");
  if (!profile.address.trim()) missing.push("adresă");
  if (!profile.phone.trim()) missing.push("telefon");
  if (!profile.email.trim()) missing.push("email");
  if (!profile.birthDate.trim()) missing.push("data nașterii");

  const data = [
    { name: "filled", value: pct },
    { name: "missing", value: Math.max(0, 100 - pct) },
  ];

  // Don't render when fully empty (looks awkward on first load) — show a
  // simple invitation card instead.
  if (pct === 0) {
    return (
      <Card className="p-4 mt-4 border-dashed">
        <Link to="/vault" className="flex items-center gap-3 group">
          <div className="size-11 rounded-xl bg-accent flex items-center justify-center">
            <UserRound className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Pornește seiful tău local</div>
            <div className="text-xs text-muted-foreground">
              Câteva detalii activează autofill-ul în toate procedurile.
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </Card>
    );
  }

  if (pct === 100) return null; // Hide the nag once the user is done.

  return (
    <Card className="p-4 mt-4 animate-[fade-in_0.3s_ease-out]">
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={20}
                outerRadius={28}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive
              >
                <Cell fill="var(--color-primary)" />
                <Cell fill="var(--color-muted)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold">
            {pct}%
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Seiful tău local · {pct}% complet</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {missing.length > 0
              ? `Mai lipsește: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", …" : ""}`
              : "Adaugă acte cu expirare pentru memento-uri automate."}
          </div>
        </div>
        <Link
          to="/vault"
          className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
        >
          Completează <ArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
