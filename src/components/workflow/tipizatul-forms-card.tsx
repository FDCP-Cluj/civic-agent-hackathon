import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  tipizatulBrowseUrl,
  tipizatulFormsForWorkflow,
  tipizatulProcedureUrl,
} from "@/services/tipizatul";

type Props = {
  workflowId: string;
};

export function TipizatulFormsCard({ workflowId }: Props) {
  const forms = tipizatulFormsForWorkflow(workflowId);
  if (forms.length === 0) return null;

  const isPfa = workflowId === "pfa-registration";

  return (
    <Card className="p-4 mb-5 border-border/80 bg-muted/20">
      <div className="flex items-start gap-2 mb-3">
        <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold">
            {isPfa ? "Formulare alternative (extern)" : "Formulare oficiale — Tipizatul.eu"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPfa
              ? "Dosarul PFA se completează în aplicație. Tipizatul rămâne ca fallback dacă preferi site-ul lor."
              : "Completezi online formularele PDF ale statului, fără cont."}
          </p>
          {isPfa && (
            <Button asChild size="sm" className="mt-2">
              <Link to="/workflow/$id/pfa" params={{ id: "pfa-registration" }}>
                Deschide dosarul PFA în aplicație
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {forms.map((form) => (
          <Button key={form.procedureId} asChild variant="outline" size="sm">
            <a
              href={tipizatulProcedureUrl(form.procedureId)}
              target="_blank"
              rel="noreferrer"
              title={form.title}
            >
              {form.label}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ))}
        <Button asChild variant="ghost" size="sm">
          <a href={tipizatulBrowseUrl()} target="_blank" rel="noreferrer">
            Toate formularele
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
