import type { TemplateField } from "@/services/forms/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  field: TemplateField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  onFocus?: () => void;
  highlight?: boolean;
};

export function PfaFormField({ field, value, onChange, onFocus, highlight }: Props) {
  const id = `pfa-field-${field.pdfFieldName}`;

  if (field.type === "checkbox") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border p-3",
          highlight ? "border-amber-500/60 bg-amber-500/5" : "border-border/80",
        )}
      >
        <Checkbox
          id={id}
          checked={value === true || value === "true"}
          onCheckedChange={(c) => onChange(Boolean(c))}
          onFocus={onFocus}
        />
        <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
          {field.label}
          {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
    );
  }

  if (field.type === "dropdown" || field.type === "radio") {
    const options = field.options ?? [];
    return (
      <div className={cn("space-y-1.5", highlight && "rounded-lg ring-1 ring-amber-500/50 p-2")}>
        <Label htmlFor={id}>
          {field.label}
          {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v)}
          onOpenChange={(open) => {
            if (open) onFocus?.();
          }}
        >
          <SelectTrigger id={id} onFocus={onFocus}>
            <SelectValue placeholder={field.placeholder ?? "Alege…"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const strVal = value === undefined || value === false ? "" : String(value);
  const multiline = field.isMultiline || (field.maxLength && field.maxLength > 120);

  return (
    <div className={cn("space-y-1.5", highlight && "rounded-lg ring-1 ring-amber-500/50 p-2")}>
      <Label htmlFor={id}>
        {field.label}
        {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          rows={3}
          maxLength={field.maxLength ?? undefined}
        />
      ) : (
        <Input
          id={id}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          maxLength={field.maxLength ?? undefined}
        />
      )}
      {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
    </div>
  );
}
