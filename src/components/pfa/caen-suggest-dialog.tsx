import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestCaenWithRag, type RagCaenSuggestion } from "@/services/rag";
import { toast } from "sonner";

export type CaenSelection = {
  code: string;
  title: string;
  activity: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialActivity?: string;
  onSelect: (selection: CaenSelection) => void;
};

export function CaenSuggestDialog({ open, onOpenChange, initialActivity, onSelect }: Props) {
  const [activity, setActivity] = useState(initialActivity ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RagCaenSuggestion | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActivity(initialActivity ?? "");
    setData(null);
    setErrorMessage(null);
  }, [open, initialActivity]);

  const hasMatches = (data?.matches.length ?? 0) > 0;

  async function runSuggestion() {
    if (!activity.trim()) {
      toast.info("Descrie pe scurt activitatea pentru sugestii CAEN.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await suggestCaenWithRag(activity.trim());
      setData(result);
      if (result.matches.length === 0) {
        const msg = "Nu am găsit potriviri CAEN din baza vectorială.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Nu am putut genera sugestiile CAEN din Supabase.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asistent CAEN</DialogTitle>
          <DialogDescription>
            Descrie activitatea și selectează codul CAEN pe care vrei să-l salvezi în dosar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Descriere activitate</Label>
            <Textarea
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              rows={3}
              placeholder="Ex: dezvoltare aplicații web pentru firme mici și mentenanță software."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={runSuggestion} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              Sugerează CAEN
            </Button>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {hasMatches ? (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pt-1">
              {data?.matches.map((match) => (
                <button
                  key={`${match.code}-${match.title}`}
                  type="button"
                  className="w-full rounded-md border border-border/80 p-3 text-left hover:bg-accent/40"
                  onClick={() => {
                    onSelect({ code: match.code, title: match.title, activity: activity.trim() });
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {match.code}
                    </Badge>
                    <span className="font-medium">{match.title}</span>
                  </div>
                  {match.evidence ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{match.evidence}</p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              După generare, selectezi un rezultat și îl aplicăm automat în dosar/PDF.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
