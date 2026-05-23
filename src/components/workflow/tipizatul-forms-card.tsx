import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <Card className="p-4 mb-5 border-primary/20 bg-primary/5">
      <div className="flex items-start gap-2 mb-3">
        <FileText className="size-4 text-primary mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold">Formulare oficiale — Tipizatul.eu</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completezi online formularele PDF ale statului, fără cont. Verifică datele înainte de
            depunere.
          </p>
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
