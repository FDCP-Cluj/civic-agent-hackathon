import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { useVault } from "@/store";
import { downloadPdf, generateAntecontractPdf } from "@/services/pdf/antecontract";
import { toast } from "sonner";

export const Route = createFileRoute("/workflow/$id/antecontract")({
  component: AntecontractPage,
});

function AntecontractPage() {
  const { id } = Route.useParams();
  const profile = useVault((s) => s.profile);
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [propertyAddress, setPropertyAddress] = useState(profile.address || "");
  const [cadastralNo, setCadastralNo] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [term, setTerm] = useState("");

  if (id !== "property-sale") {
    return (
      <AppShell>
        <Card className="p-5">
          <p className="text-sm">
            Antecontractul asistat este disponibil pentru fluxul de vânzare imobil.
          </p>
          <Button asChild className="mt-3">
            <Link to="/workflow/$id" params={{ id }}>
              Înapoi la workflow
            </Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  const handleGenerate = async () => {
    if (!propertyAddress.trim() || !price.trim()) {
      toast.error("Completează minim adresa imobilului și prețul.");
      return;
    }
    const bytes = await generateAntecontractPdf({
      vanzator: { ...profile, fullName: profile.fullName || undefined },
      cumparator: { fullName: buyerName || undefined, address: buyerAddress || undefined },
      imobil: {
        adresa: propertyAddress,
        nrCadastral: cadastralNo || undefined,
      },
      pret: price,
      arvuna: deposit || undefined,
      termenAutentificare: term || undefined,
    });
    downloadPdf(bytes, "civis-antecontract-preview.pdf");
    toast.success("Antecontract draft generat.");
  };

  return (
    <AppShell>
      <PageHeader
        title="Antecontract asistat"
        description="Completezi datele esențiale, iar Civis generează un draft PDF pentru revizuire la notar."
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/workflow/$id" params={{ id: "property-sale" }}>
            <ArrowLeft className="size-4" />
            Înapoi
          </Link>
        </Button>
      </PageHeader>

      <Card className="mt-4 p-4 space-y-3">
        <div className="text-sm font-semibold">Date cumpărător</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nume cumpărător</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Adresă cumpărător</Label>
            <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
          </div>
        </div>

        <div className="text-sm font-semibold pt-2">Date imobil</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Adresă imobil</Label>
            <Input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Număr cadastral</Label>
            <Input value={cadastralNo} onChange={(e) => setCadastralNo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Preț</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="85000 EUR"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arvună (opțional)</Label>
            <Input
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="5000 EUR"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Termen autentificare (opțional)</Label>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="30.06.2026"
            />
          </div>
        </div>
      </Card>

      <Button onClick={handleGenerate} className="w-full mt-4">
        <FileDown className="size-4" /> Generează PDF antecontract
      </Button>
    </AppShell>
  );
}
