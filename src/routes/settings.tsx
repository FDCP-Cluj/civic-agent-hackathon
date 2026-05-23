import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Settings as SettingsIcon, LogOut, ShieldCheck, ScanLine } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store";
import { SeniorModeToggle } from "@/components/senior-mode-toggle";
import { PageHeader } from "@/components/dashboard/page-header";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const navigate = useNavigate();
  const { email, logout } = useAuth();

  return (
    <AppShell>
      <PageHeader title="Setări" description={email ?? "Cont conectat"}>
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <SettingsIcon className="size-4 text-primary" />
          Preferințe
        </div>
      </PageHeader>

      <Card className="p-4 mb-3 mt-5">
        <SeniorModeToggle />
      </Card>

      <Card className="p-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5 text-success" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Confidențialitate</div>
            <p className="text-xs text-muted-foreground mt-1">
              Documentele tale sunt stocate doar local. Civis nu are acces la actele tale.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <ScanLine className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Explică document</div>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/scan" })}>
                Deschide
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Scanează un document oficial și primește un rezumat în cuvinte simple.
            </p>
          </div>
        </div>
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={() => {
          logout();
          navigate({ to: "/login" });
        }}
      >
        <LogOut className="size-4" /> Deconectare
      </Button>
    </AppShell>
  );
}
