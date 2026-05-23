// Mock "Bureaucratic API Hub" — simulates fetching latest required documents
// and step-by-step procedures from Romanian state institutions.
//
// All data is researched against publicly available info from each instituție
// (ANAF, DRPCIV, ONRC, ANCPI, AJPIS, DEPABD, Starea Civilă, Primării, Poliție).
// Fees and timelines reflect 2024-2025 norms — verify at the counter, not here.

export type Institution =
  | "ANAF"
  | "DRPCIV"
  | "Politie"
  | "Notar"
  | "Primarie"
  | "Gov.ro"
  | "Starea Civila"
  | "DEPABD"
  | "ANCPI"
  | "AJPIS"
  | "ONRC"
  | "MAI";

export type WorkflowCategory =
  | "auto"
  | "id"
  | "fiscal"
  | "civil"
  | "family"
  | "property"
  | "business";

/**
 * Per-step "agentic" actions the assistant can perform for the citizen.
 * Ported from V2 (civic-agent-buian) `flows-catalog.ts` and adapted to run
 * client-side or via the Gemini chat (no Lovable Gateway / RAG backend).
 *
 *  - open_url        — open a curated external URL.
 *  - deep_link       — open a stable official URL keyed by (workflowId, stepKey).
 *  - find_institution— open Google Maps with a query, scoped to profile city if known.
 *  - online_banks    — show a curated list of banks accepting online onboarding.
 *  - caen_suggest    — ask Gemini for a CAEN code based on user activity.
 *  - explain_step    — ask Gemini to explain this step (falls back to local info[]).
 *  - prefill_pdf     — generate a profile-prefilled PDF (e.g. declarație PFA).
 */
export type StepAction =
  | { kind: "open_url"; url: string; label: string }
  | { kind: "deep_link"; label: string }
  | { kind: "find_institution"; institutionType: string; label: string }
  | { kind: "online_banks"; label?: string }
  | { kind: "caen_suggest"; label?: string }
  | { kind: "explain_step"; topic: string; label?: string }
  | { kind: "prefill_pdf"; template: "declaratie_pfa" | "antecontract"; label: string }
  | { kind: "tipizatul"; procedureId?: string; label: string };

export type WorkflowStep = {
  order: number;
  /** Stable slug used by deep-link tables and action dispatchers. */
  key?: string;
  mode?: "online" | "in_person" | "hybrid";
  title: string;
  institution: Institution;
  description: string;
  documents: string[];
  location: string;
  mapsUrl: string;
  estimatedMinutes: number;
  fee?: string;
  /** Curated bullet-point explanations (ported from V2 `info[]`). */
  info?: string[];
  /** Agentic actions the assistant can perform on this step. */
  actions?: StepAction[];
};

export type DataSource = {
  /** Institution from which this workflow data was last verified. */
  authority: Institution;
  /** Public source URL — citizens can click through to verify themselves. */
  url: string;
  /** ISO date when the workflow was last reviewed against the source. */
  verifiedAt: string;
};

export type Workflow = {
  id: string;
  title: string;
  category: WorkflowCategory;
  summary: string;
  totalMinutes: number;
  steps: WorkflowStep[];
  /** Optional but recommended: where this data came from, for transparency. */
  dataSource?: DataSource;
};

/** All workflow data was last reviewed against the official sources on this date. */
export const WORKFLOWS_LAST_REVIEWED = "2025-03-15";

// ---------- Service health (mock pilot data) ----------
//
// In production this strip would be backed by a real status monitor (uptime probes
// against ANAF SPV, DRPCIV programare portal, ghiseul.ro, epasapoarte.ro, etc.).
// Civis pilot ships this with mock health so reviewers can see the UX surface;
// the same shape is the contract the production monitor must produce.
export type ServiceStatus = "operational" | "degraded" | "outage";

export type ServiceHealth = {
  service: string;
  status: ServiceStatus;
  note?: string;
  /** ISO timestamp. */
  lastChecked: string;
  /** Public landing page citizens can use to confirm for themselves. */
  url: string;
};

// ---------- Civic calendar (real ANAF / ministerial deadlines) ----------
// Sourced from anaf.ro publicat fiscal calendar and gov.ro public notices.
// Dates are intentionally static for the pilot; production should pull from a
// data.gov.ro feed or a maintained YAML file.
export type CivicCalendarEntry = {
  id: string;
  title: string;
  description: string;
  /** ISO date of the deadline (end of day). */
  deadline: string;
  institution: Institution;
  /** Workflow id this deadline relates to, when applicable. */
  relatedWorkflowId?: string;
  /** Public reference URL. */
  url: string;
};

// Each workflow's primary authority + verified source URL.
// These are real, current Romanian public-information pages — citizens can click through.
const WORKFLOW_SOURCES: Record<string, { authority: Institution; url: string }> = {
  "car-registration-2nd-hand": {
    authority: "DRPCIV",
    url: "https://www.drpciv.ro/web/ghidul-cetateanului/inmatricularea-vehiculelor",
  },
  "renew-driver-license": {
    authority: "DRPCIV",
    url: "https://www.drpciv.ro/web/ghidul-cetateanului/permise-de-conducere",
  },
  "foreign-license-exchange": {
    authority: "DRPCIV",
    url: "https://www.drpciv.ro/web/ghidul-cetateanului/permise-de-conducere",
  },
  "passport-issuance": {
    authority: "MAI",
    url: "https://www.epasapoarte.ro",
  },
  "id-change-relocation": {
    authority: "DEPABD",
    url: "https://depabd.mai.gov.ro/cetateni.html",
  },
  "police-clearance": {
    authority: "Politie",
    url: "https://www.politiaromana.ro/ro/utile/cazier-judiciar",
  },
  "birth-certificate": {
    authority: "Starea Civila",
    url: "https://depabd.mai.gov.ro/stare_civila.html",
  },
  "civil-marriage": {
    authority: "Starea Civila",
    url: "https://depabd.mai.gov.ro/stare_civila.html",
  },
  "child-state-allowance": {
    authority: "AJPIS",
    url: "https://www.mmuncii.ro/j33/index.php/ro/familie/beneficii-sociale-de-asistenta-sociala",
  },
  "building-permit": {
    authority: "Primarie",
    url: "https://www.mdlpa.ro/pages/dezvoltareurbanasiamenajarea",
  },
  "cadastral-registration": {
    authority: "ANCPI",
    url: "https://www.ancpi.ro",
  },
  "property-sale": {
    authority: "Notar",
    url: "https://www.uniuneanotarilor.ro",
  },
  "pfa-registration": {
    authority: "ONRC",
    url: "https://www.onrc.ro/index.php/ro/inmatriculari/persoane-fizice",
  },
  "anaf-declaration": {
    authority: "ANAF",
    url: "https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declararea_obligatiilor_fiscale/declaratia_unica/",
  },
  "vanzare-auto": {
    authority: "DRPCIV",
    url: "https://www.drpciv.ro/web/ghidul-cetateanului/inmatricularea-vehiculelor",
  },
};

const RAW_WORKFLOWS: Workflow[] = [
  // ---------- Auto ----------
  {
    id: "car-registration-2nd-hand",
    title: "Înmatriculare mașină second-hand",
    category: "auto",
    summary:
      "Procedura completă pentru înmatricularea unei mașini cumpărate de la o persoană fizică în România.",
    totalMinutes: 240,
    steps: [
      {
        order: 1,
        title: "Contract de vânzare-cumpărare la notar",
        institution: "Notar",
        description:
          "Semnați contractul cu vânzătorul. Notarul autentifică tranzacția și eliberează 3 exemplare.",
        documents: ["CI cumpărător", "CI vânzător", "Carte de identitate auto", "Talon"],
        location: "Birou notarial (orice notar autorizat)",
        mapsUrl: "https://www.google.com/maps/search/notar+public",
        estimatedMinutes: 45,
        fee: "~250 RON",
      },
      {
        order: 2,
        title: "Plata impozitului la Direcția de Taxe Locale",
        institution: "Primarie",
        description:
          "Vânzătorul scoate certificatul fiscal, dvs. înregistrați mașina pe rolul fiscal nou.",
        documents: ["Contract notarial", "CI", "Carte identitate auto"],
        location: "Direcția Taxe și Impozite Locale (sector / oraș)",
        mapsUrl: "https://www.google.com/maps/search/directia+taxe+impozite+locale",
        estimatedMinutes: 60,
        fee: "Variabil (funcție de cilindree)",
      },
      {
        order: 3,
        title: "RCA + ITP valabil",
        institution: "Gov.ro",
        description: "Verificați că ITP este valabil și încheiați polița RCA pe noul proprietar.",
        documents: ["Carte identitate auto", "Contract notarial"],
        location: "Online sau orice broker",
        mapsUrl: "https://www.google.com/maps/search/asigurari+rca",
        estimatedMinutes: 20,
        fee: "300–900 RON / an",
      },
      {
        order: 4,
        title: "Înmatriculare la DRPCIV",
        institution: "DRPCIV",
        description:
          "Depuneți dosarul complet la ghișeu. Primiți numerele noi și certificatul de înmatriculare.",
        documents: [
          "Cerere tip înmatriculare",
          "Contract notarial (original + copie)",
          "Carte identitate auto",
          "Certificat fiscal",
          "RCA valabil",
          "Dovadă plată taxe (ROAR + contravaloare plăcuțe)",
          "CI proprietar",
        ],
        location: "DRPCIV — județul/sectorul de domiciliu",
        mapsUrl: "https://www.google.com/maps/search/DRPCIV",
        estimatedMinutes: 90,
        fee: "~140 RON (plăcuțe + taxe)",
      },
    ],
  },
  {
    id: "renew-driver-license",
    title: "Reînnoire permis de conducere",
    category: "auto",
    summary: "Reînnoirea permisului expirat sau pe cale de a expira (10 ani valabilitate).",
    totalMinutes: 120,
    steps: [
      {
        order: 1,
        title: "Aviz medical",
        institution: "Gov.ro",
        description: "Consultație la cabinet autorizat pentru aviz auto.",
        documents: ["CI", "Permis vechi"],
        location: "Cabinet medical autorizat",
        mapsUrl: "https://www.google.com/maps/search/cabinet+medical+auto",
        estimatedMinutes: 30,
        fee: "~150 RON",
      },
      {
        order: 2,
        title: "Depunere dosar la DRPCIV",
        institution: "DRPCIV",
        description: "Programare online și depunere ghișeu pentru fotografie + semnătură.",
        documents: ["CI", "Permis vechi", "Aviz medical", "Dovadă plată taxă (89 RON)"],
        location: "DRPCIV județean",
        mapsUrl: "https://www.google.com/maps/search/DRPCIV",
        estimatedMinutes: 60,
        fee: "89 RON",
      },
      {
        order: 3,
        title: "Ridicare permis nou",
        institution: "DRPCIV",
        description: "Permisul vine prin poștă în 7–14 zile sau poate fi ridicat de la ghișeu.",
        documents: ["CI"],
        location: "Domiciliu / DRPCIV",
        mapsUrl: "https://www.google.com/maps/search/posta+romana",
        estimatedMinutes: 30,
      },
    ],
  },
  {
    id: "vanzare-auto",
    title: "Vânzare-cumpărare auto",
    category: "auto",
    summary:
      "Flux complet pentru vânzător + cumpărător la tranzacția unui autoturism second-hand în România.",
    totalMinutes: 210,
    steps: [
      {
        order: 1,
        key: "itp",
        mode: "in_person",
        title: "Verificare ITP valabil",
        institution: "Gov.ro",
        description: "ITP trebuie să fie valid în ziua semnării contractului.",
        documents: ["CIV", "Talon", "Număr înmatriculare"],
        location: "Stație ITP autorizată RAR",
        mapsUrl: "https://www.google.com/maps/search/statie+ITP+autorizata",
        estimatedMinutes: 30,
        fee: "~150 RON",
        info: [
          "Dacă ITP expiră în curând, cumpărătorii cer de obicei reînnoirea înainte de vânzare.",
          "Verificarea valabilității se poate face online pe site-ul RAR.",
        ],
        actions: [
          { kind: "open_url", url: "https://www.rarom.ro/", label: "RAR — informații ITP" },
          {
            kind: "find_institution",
            institutionType: "stație ITP autorizată",
            label: "Găsește stație ITP",
          },
        ],
      },
      {
        order: 2,
        key: "fiscal_vanzator",
        mode: "hybrid",
        title: "Certificat fiscal vânzător",
        institution: "Primarie",
        description: "Certificatul fiscal confirmă că nu există datorii locale pentru autoturism.",
        documents: ["CI vânzător", "CIV", "Talon"],
        location: "DITL primărie sau online pe ghiseul.ro",
        mapsUrl: "https://www.google.com/maps/search/directia+taxe+impozite+locale",
        estimatedMinutes: 45,
        fee: "Gratuit",
        info: [
          "Se emite de primăria de domiciliu a vânzătorului.",
          "Valabilitatea este, de regulă, până la finalul lunii emiterii.",
        ],
        actions: [
          { kind: "open_url", url: "https://www.ghiseul.ro", label: "Ghișeul.ro — taxe locale" },
        ],
      },
      {
        order: 3,
        key: "contract",
        mode: "hybrid",
        title: "Contract de vânzare-cumpărare (4 exemplare)",
        institution: "Notar",
        description:
          "Completezi contractul în 4 exemplare: vânzător, cumpărător, primărie vânzător, primărie cumpărător.",
        documents: ["CI părți", "CIV", "Talon", "Certificat fiscal"],
        location: "Notar sau sub semnătură privată",
        mapsUrl: "https://www.google.com/maps/search/notar+public",
        estimatedMinutes: 40,
        info: [
          "Pentru tranzacții simple, contractul sub semnătură privată este suficient.",
          "Datele din contract trebuie să corespundă exact cu CIV și talon.",
        ],
        actions: [
          {
            kind: "explain_step",
            topic: "Ce trebuie să conțină contractul de vânzare-cumpărare auto",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 4,
        key: "fiscal_cumparator",
        mode: "in_person",
        title: "Înregistrare fiscală la cumpărător",
        institution: "Primarie",
        description: "Cumpărătorul înscrie mașina pe rol fiscal la primăria de domiciliu.",
        documents: ["Contract vânzare-cumpărare", "CI cumpărător", "CIV", "Talon"],
        location: "DITL cumpărător",
        mapsUrl: "https://www.google.com/maps/search/directia+taxe+impozite+locale",
        estimatedMinutes: 45,
      },
      {
        order: 5,
        key: "inmatriculare_cumparator",
        mode: "in_person",
        title: "Înmatriculare pe numele cumpărătorului",
        institution: "DRPCIV",
        description:
          "Cumpărătorul depune dosarul la DRPCIV în termenul legal după semnarea contractului.",
        documents: [
          "Contract vânzare-cumpărare",
          "CIV original",
          "CI cumpărător",
          "Dovadă RCA",
          "Dovadă taxe plătite",
        ],
        location: "DRPCIV județean",
        mapsUrl: "https://www.google.com/maps/search/DRPCIV",
        estimatedMinutes: 50,
        fee: "~140 RON",
        actions: [
          {
            kind: "open_url",
            url: "https://www.drpciv.ro/web/ghidul-cetateanului/inmatricularea-vehiculelor",
            label: "DRPCIV — ghid înmatriculare",
          },
        ],
      },
    ],
  },
  {
    id: "foreign-license-exchange",
    title: "Preschimbare permis auto străin",
    category: "auto",
    summary:
      "Conversia unui permis de conducere străin (UE sau non-UE) într-un permis românesc, după stabilirea reședinței.",
    totalMinutes: 180,
    steps: [
      {
        order: 1,
        title: "Aviz medical auto",
        institution: "Gov.ro",
        description:
          "Aviz medical de la cabinet autorizat — obligatoriu indiferent de țara de origine a permisului.",
        documents: ["CI / Permis de ședere", "Permis străin original"],
        location: "Cabinet medical autorizat auto",
        mapsUrl: "https://www.google.com/maps/search/cabinet+medical+auto",
        estimatedMinutes: 30,
        fee: "~150 RON",
      },
      {
        order: 2,
        title: "Traducere legalizată permis străin",
        institution: "Notar",
        description:
          "Permisul trebuie tradus în română și legalizat dacă nu este emis în UE/SEE sau într-o limbă recunoscută.",
        documents: ["Permis străin (original)"],
        location: "Birou traducător autorizat + notar",
        mapsUrl: "https://www.google.com/maps/search/traducator+autorizat",
        estimatedMinutes: 45,
        fee: "~100–200 RON",
      },
      {
        order: 3,
        title: "Programare și depunere dosar la DRPCIV",
        institution: "DRPCIV",
        description:
          "Cetățenii UE/SEE: schimb direct. Non-UE: posibil examen teoretic. Verifică pe drpciv.ro.",
        documents: [
          "CI sau permis de ședere valabil",
          "Permis străin original + traducere legalizată",
          "Aviz medical",
          "Dovadă reședință în România (min. 185 zile/an)",
          "Cerere tip + 2 fotografii",
          "Dovadă plată taxă 89 RON",
        ],
        location: "DRPCIV — județul de reședință",
        mapsUrl: "https://www.google.com/maps/search/DRPCIV",
        estimatedMinutes: 75,
        fee: "89 RON (+ eventual examen ~200 RON)",
      },
      {
        order: 4,
        title: "Ridicare permis românesc",
        institution: "DRPCIV",
        description:
          "Permisul nou se ridică în 7–14 zile lucrătoare. Permisul străin se predă DRPCIV.",
        documents: ["CI"],
        location: "DRPCIV",
        mapsUrl: "https://www.google.com/maps/search/DRPCIV",
        estimatedMinutes: 30,
      },
    ],
  },

  // ---------- Identity ----------
  {
    id: "passport-issuance",
    title: "Eliberare pașaport simplu electronic",
    category: "id",
    summary:
      "Programare online, plata taxei și depunere dosar la Serviciul Pașapoarte. Valabilitate 10 ani (adulți) sau 5 ani (minori 12-18).",
    totalMinutes: 120,
    steps: [
      {
        order: 1,
        title: "Programare online pe epasapoarte.ro",
        institution: "MAI",
        description:
          "Rezervi un slot la Serviciul Pașapoarte din județul de domiciliu. Programările sunt deschise cu ~30 zile în avans.",
        documents: ["Cont epasapoarte.ro", "CNP", "Email valabil"],
        location: "Online — epasapoarte.ro",
        mapsUrl: "https://www.epasapoarte.ro",
        estimatedMinutes: 15,
      },
      {
        order: 2,
        title: "Plata taxei de pașaport",
        institution: "Gov.ro",
        description:
          "Taxa se achită la CEC, Trezorerie, Poștă sau online prin ghiseul.ro. Păstrează dovada de plată.",
        documents: ["CNP", "CI"],
        location: "Online ghiseul.ro / Trezorerie / CEC Bank",
        mapsUrl: "https://www.ghiseul.ro",
        estimatedMinutes: 15,
        fee: "258 RON (adulți, 10 ani) / 234 RON (minori sub 12 ani, 3 ani)",
      },
      {
        order: 3,
        title: "Depunere dosar la Serviciul Pașapoarte",
        institution: "MAI",
        description:
          "Te prezinți la ora programării cu toate actele. Se fac fotografie biometrică și amprente pe loc.",
        documents: [
          "Cartea de identitate (original + copie)",
          "Pașaport vechi (dacă există)",
          "Dovada plății taxei",
          "Certificat naștere (doar la prima eliberare)",
          "Pentru minori: ambii părinți prezenți + acte naștere",
        ],
        location: "Serviciul Pașapoarte — județean (sub MAI/DEPABD)",
        mapsUrl: "https://www.google.com/maps/search/serviciul+pasapoarte",
        estimatedMinutes: 60,
      },
      {
        order: 4,
        title: "Ridicare pașaport sau livrare curier",
        institution: "MAI",
        description:
          "Pașaportul este gata în 14 zile lucrătoare. Poți opta pentru livrare prin curier contra cost.",
        documents: ["CI", "Dovadă programare"],
        location: "Serviciul Pașapoarte / acasă",
        mapsUrl: "https://www.google.com/maps/search/serviciul+pasapoarte",
        estimatedMinutes: 30,
        fee: "Opțional livrare curier ~30 RON",
      },
    ],
  },
  {
    id: "id-change-relocation",
    title: "Schimbare buletin la schimbarea domiciliului",
    category: "id",
    summary:
      "Conform legii, ai 15 zile de la mutare să-ți schimbi cartea de identitate cu noul domiciliu.",
    totalMinutes: 90,
    steps: [
      {
        order: 1,
        title: "Pregătire dosar pentru noul domiciliu",
        institution: "DEPABD",
        description:
          "Strângi documentele care atestă dreptul de a locui la noua adresă (proprietate, chirie sau găzduire).",
        documents: [
          "Cartea de identitate veche",
          "Certificat naștere (original + copie)",
          "Certificat căsătorie / hotărâre divorț (dacă e cazul)",
          "Act proprietate noua locuință SAU contract chirie înregistrat ANAF SAU declarație autentică găzduire de la proprietar",
          "CI proprietar (dacă găzduiește)",
        ],
        location: "Acasă",
        mapsUrl: "https://www.google.com/maps/search/copy+xerox",
        estimatedMinutes: 30,
      },
      {
        order: 2,
        title: "Programare online (opțional dar recomandat)",
        institution: "DEPABD",
        description:
          "Multe DEPABD-uri municipale oferă programare online — evită cozile prelungite.",
        documents: ["CNP", "Email"],
        location: "Online — site DEPABD local sau ghiseul.ro",
        mapsUrl: "https://www.ghiseul.ro",
        estimatedMinutes: 10,
      },
      {
        order: 3,
        title: "Depunere dosar și fotografie la ghișeu",
        institution: "DEPABD",
        description:
          "Te prezinți personal la DEPABD-ul noului domiciliu. Se face poză și semnătură digitală.",
        documents: [
          "Toate actele de mai sus",
          "Dovadă plată taxă CI (7 RON) și taxă viza domiciliu (5 RON)",
          "Eventual certificat naștere copii minori",
        ],
        location: "DEPABD — primăria noului sector/oraș",
        mapsUrl: "https://www.google.com/maps/search/serviciul+evidenta+persoanelor",
        estimatedMinutes: 45,
        fee: "12 RON (7 RON CI + 5 RON viză domiciliu)",
        actions: [
          { kind: "tipizatul", procedureId: "26022", label: "Formular CI — Tipizatul" },
        ],
      },
      {
        order: 4,
        title: "Ridicare CI nouă",
        institution: "DEPABD",
        description:
          "Cartea de identitate nouă este gata în 7–15 zile lucrătoare. Vechea CI este perforată și restituită.",
        documents: ["Dovadă depunere", "CI veche (sau pașaport ca alternativă)"],
        location: "DEPABD",
        mapsUrl: "https://www.google.com/maps/search/serviciul+evidenta+persoanelor",
        estimatedMinutes: 15,
      },
    ],
  },
  {
    id: "police-clearance",
    title: "Obținere cazier judiciar",
    category: "id",
    summary:
      "Certificat de cazier judiciar — necesar pentru angajări, adopții, vize și concursuri publice. Variantă online (rapidă) sau fizică.",
    totalMinutes: 30,
    steps: [
      {
        order: 1,
        title: "Cont ghiseul.ro și autentificare",
        institution: "Politie",
        description:
          "Pentru varianta online ai nevoie de cont ghiseul.ro asociat cu un cont bancar pentru identificare. Alternativ, mergi direct la pas 3 pentru varianta la ghișeu.",
        documents: ["CNP", "Card bancar românesc", "Email"],
        location: "Online — ghiseul.ro",
        mapsUrl: "https://www.ghiseul.ro",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        title: "Cerere online și plată",
        institution: "Politie",
        description:
          "Completezi cererea online, plătești 10 RON și primești certificatul electronic semnat digital în 24–72 ore pe email.",
        documents: ["Cont ghiseul.ro autentificat"],
        location: "ghiseul.ro — secțiunea Cazier judiciar",
        mapsUrl: "https://www.ghiseul.ro",
        estimatedMinutes: 10,
        fee: "10 RON",
      },
      {
        order: 3,
        title: "Alternativă: depunere fizică la secția de Poliție",
        institution: "Politie",
        description:
          "Te prezinți la cea mai apropiată secție de Poliție cu serviciu cazier. Certificatul fizic se eliberează în aceeași zi sau a doua zi.",
        documents: ["CI original", "Cerere tip (se ia de la ghișeu)", "Dovadă plată 10 RON"],
        location: "Orice secție de Poliție cu serviciu cazier",
        mapsUrl: "https://www.google.com/maps/search/sectie+politie+cazier+judiciar",
        estimatedMinutes: 60,
        fee: "10 RON",
      },
    ],
  },

  // ---------- Family ----------
  {
    id: "birth-certificate",
    title: "Certificat de naștere pentru nou-născut",
    category: "family",
    summary:
      "Înregistrarea nașterii la Starea Civilă în maxim 30 de zile de la naștere. Procedură gratuită, dar critică.",
    totalMinutes: 75,
    steps: [
      {
        order: 1,
        title: "Strângere acte de la maternitate și acasă",
        institution: "Starea Civila",
        description:
          "Imediat după externare, asigură-te că ai certificatul medical constatator al nașterii (eliberat de maternitate) și actele părinților.",
        documents: [
          "Certificat medical constatator al nașterii",
          "CI mamă",
          "CI tată (dacă părinții sunt căsătoriți sau recunoaște paternitatea)",
          "Certificat de căsătorie (dacă există)",
        ],
        location: "Acasă / maternitate",
        mapsUrl: "https://www.google.com/maps/search/maternitate",
        estimatedMinutes: 15,
      },
      {
        order: 2,
        title: "Depunere dosar la Starea Civilă",
        institution: "Starea Civila",
        description:
          "Cererea se depune la Starea Civilă din localitatea unde s-a născut copilul. Termen legal: 30 zile (cu excepții).",
        documents: [
          "Toate actele de mai sus",
          "Eventual: declarație paternitate (părinți necăsătoriți, ambii prezenți)",
        ],
        location: "Serviciul Stare Civilă — Primăria locului nașterii",
        mapsUrl: "https://www.google.com/maps/search/primaria+stare+civila",
        estimatedMinutes: 45,
        fee: "Gratuit",
      },
      {
        order: 3,
        title: "Ridicare certificat de naștere",
        institution: "Starea Civila",
        description:
          "Certificatul este eliberat în aceeași zi sau a doua zi. Conține CNP-ul oficial al copilului.",
        documents: ["Dovadă depunere", "CI părinte"],
        location: "Starea Civilă",
        mapsUrl: "https://www.google.com/maps/search/primaria+stare+civila",
        estimatedMinutes: 15,
      },
    ],
  },
  {
    id: "civil-marriage",
    title: "Căsătorie civilă",
    category: "family",
    summary:
      "Procedura completă pentru căsătoria civilă la Starea Civilă, cu cele 10 zile obligatorii de afișaj public.",
    totalMinutes: 180,
    steps: [
      {
        order: 1,
        title: "Programare și verificare disponibilitate",
        institution: "Starea Civila",
        description:
          "Contactezi Starea Civilă din localitatea unde unul dintre miri are domiciliul. Multe primării permit programare online.",
        documents: ["CI ambii miri"],
        location: "Starea Civilă — Primăria de domiciliu",
        mapsUrl: "https://www.google.com/maps/search/primaria+stare+civila",
        estimatedMinutes: 15,
      },
      {
        order: 2,
        title: "Certificat medical prenupțial",
        institution: "Gov.ro",
        description:
          "Ambii miri fac analize la medic de familie sau policlinică. Certificatul este valabil 14 zile de la emitere.",
        documents: ["CI ambii miri"],
        location: "Cabinet medic familie / policlinică",
        mapsUrl: "https://www.google.com/maps/search/medic+familie",
        estimatedMinutes: 60,
        fee: "100–200 RON / persoană (variabil)",
      },
      {
        order: 3,
        title: "Depunere declarație de căsătorie (cu 10 zile înainte)",
        institution: "Starea Civila",
        description:
          "Declarația se depune personal de ambii miri. Începe perioada de afișaj public de 10 zile.",
        documents: [
          "CI ambii miri",
          "Certificate de naștere (original + copie)",
          "Certificat medical prenupțial (valabil 14 zile)",
          "Eventual: hotărâri divorț / certificate deces pentru recăsătoriți",
          "Eventual: convenție matrimonială autentificată la notar (pentru regim separație bunuri)",
        ],
        location: "Starea Civilă",
        mapsUrl: "https://www.google.com/maps/search/primaria+stare+civila",
        estimatedMinutes: 60,
      },
      {
        order: 4,
        title: "Ceremonia + eliberare certificat căsătorie",
        institution: "Starea Civila",
        description:
          "După cele 10 zile, ceremonia oficiată de ofițerul de stare civilă. Doi martori obligatorii cu CI. Certificatul se eliberează imediat.",
        documents: ["CI miri", "CI martori (2 persoane)", "Verighete (simbolic)"],
        location: "Starea Civilă (sala festivă)",
        mapsUrl: "https://www.google.com/maps/search/primaria+stare+civila",
        estimatedMinutes: 45,
        fee: "~75 RON (taxă timbru) + opțional taxă sală festivă",
      },
    ],
  },
  {
    id: "child-state-allowance",
    title: "Alocație de stat pentru copii",
    category: "family",
    summary:
      "Cerere pentru alocația lunară de stat — drept universal pentru copiii cu cetățenie română, plătită până la 18 ani.",
    totalMinutes: 60,
    steps: [
      {
        order: 1,
        title: "Pregătire dosar",
        institution: "AJPIS",
        description:
          "Aduni actele necesare pentru cererea de alocație. Cererea poate fi depusă imediat după obținerea certificatului de naștere.",
        documents: [
          "Certificat naștere copil (original + copie)",
          "CI părinte solicitant",
          "CI celălalt părinte",
          "Extras IBAN pe numele părintelui solicitant",
          "Certificat căsătorie (dacă există)",
        ],
        location: "Acasă",
        mapsUrl: "https://www.google.com/maps/search/copy+xerox",
        estimatedMinutes: 15,
      },
      {
        order: 2,
        title: "Depunere cerere la Primărie sau AJPIS",
        institution: "AJPIS",
        description:
          "Cererea se depune la Serviciul de Asistență Socială din Primărie sau direct la AJPIS județean. Unele județe permit depunere online.",
        documents: [
          "Toate actele de mai sus",
          "Cerere tip (se ia de la ghișeu sau de pe site-ul AJPIS)",
          "Declarație pe propria răspundere că celălalt părinte nu primește alocația",
        ],
        location: "Primărie (Asistență Socială) sau AJPIS județean",
        mapsUrl: "https://www.google.com/maps/search/AJPIS",
        estimatedMinutes: 30,
        fee: "Gratuit",
      },
      {
        order: 3,
        title: "Așteptare aprobare și prima plată",
        institution: "AJPIS",
        description:
          "Cererea este soluționată în max. 60 zile. Plata se face lunar automat în contul indicat, retroactiv de la data nașterii.",
        documents: ["Niciunul — totul electronic"],
        location: "Acasă",
        mapsUrl: "https://www.google.com/maps/search/AJPIS",
        estimatedMinutes: 15,
        fee: "644 RON/lună (0-2 ani) sau 292 RON/lună (peste 2 ani) — cuantum 2024",
      },
    ],
  },

  // ---------- Property ----------
  {
    id: "building-permit",
    title: "Autorizație de construire (casă / gard)",
    category: "property",
    summary:
      "Procedura completă pentru obținerea Autorizației de Construire — de la Certificat de Urbanism la avize și DTAC.",
    totalMinutes: 360,
    steps: [
      {
        order: 1,
        title: "Cerere Certificat de Urbanism (CU)",
        institution: "Primarie",
        description:
          "CU stabilește regimul juridic, economic și tehnic al terenului și lista de avize necesare. Răspuns în 30 zile lucrătoare.",
        documents: [
          "Cerere tip pentru CU",
          "Plan de încadrare în zonă (scara 1:5000 sau 1:2000)",
          "Plan de situație (scara 1:500 sau 1:1000)",
          "Extras carte funciară (max. 30 zile vechime)",
          "Dovadă plată taxă CU (variabilă)",
        ],
        location: "Primăria localității unde se află terenul (Serviciul Urbanism)",
        mapsUrl: "https://www.google.com/maps/search/primaria+urbanism",
        estimatedMinutes: 60,
        fee: "8–30 RON (taxă timbru) + variabil în funcție de suprafață",
      },
      {
        order: 2,
        title: "Obținere avize și acorduri",
        institution: "Primarie",
        description:
          "Pe baza CU obții avize (electrica, apă-canal, gaz, mediu, ISU, sănătate publică etc.). Această fază poate dura 2-3 luni.",
        documents: [
          "Cerere pentru fiecare aviz",
          "CU în copie",
          "Documentații tehnice specifice",
          "Acorduri vecini (pentru construcții la limita proprietății)",
        ],
        location: "Fiecare instituție menționată în CU",
        mapsUrl: "https://www.google.com/maps/search/distributie+electrica+enel",
        estimatedMinutes: 120,
        fee: "Variabil per aviz (50–500 RON / aviz)",
      },
      {
        order: 3,
        title: "Întocmire DTAC (Documentație Tehnică Autorizare Construire)",
        institution: "Gov.ro",
        description:
          "DTAC se întocmește OBLIGATORIU de un arhitect cu drept de semnătură OAR. Include arhitectura, structura, instalațiile și partea economică.",
        documents: ["Contract cu arhitect OAR", "CU și toate avizele"],
        location: "Arhitect cu drept de semnătură OAR",
        mapsUrl: "https://www.google.com/maps/search/arhitect+OAR",
        estimatedMinutes: 60,
        fee: "Onorariu arhitect — 3–8 EUR/mp construit (variabil)",
      },
      {
        order: 4,
        title: "Depunere dosar Autorizație de Construire",
        institution: "Primarie",
        description:
          "Dosarul complet se depune la Primărie. Răspuns oficial în 30 zile lucrătoare.",
        documents: ["DTAC complet", "Toate avizele", "CU", "Extras CF actualizat", "Dovadă plăți"],
        location: "Primăria localității (Serviciul Urbanism)",
        mapsUrl: "https://www.google.com/maps/search/primaria+urbanism",
        estimatedMinutes: 90,
        fee: "0.5% din valoarea autorizată a investiției",
      },
      {
        order: 5,
        title: "Ridicare AC + anunțare începere lucrări",
        institution: "Primarie",
        description:
          "După eliberare, ai obligația să anunți Inspectoratul de Stat în Construcții (ISC) cu min. 5 zile înainte de începerea lucrărilor.",
        documents: ["Autorizația de Construire", "Notificare începere lucrări ISC"],
        location: "Primărie + ISC județean",
        mapsUrl: "https://www.google.com/maps/search/inspectorat+stat+constructii",
        estimatedMinutes: 30,
      },
    ],
  },
  {
    id: "cadastral-registration",
    title: "Intabulare proprietate (cadastru + carte funciară)",
    category: "property",
    summary:
      "Înregistrarea unui imobil în Cartea Funciară prin OCPI/ANCPI — pas obligatoriu pentru orice tranzacție viitoare.",
    totalMinutes: 240,
    steps: [
      {
        order: 1,
        title: "Contractare topograf autorizat ANCPI",
        institution: "ANCPI",
        description:
          "Topograful face ridicarea topografică pe teren și întocmește documentația cadastrală. Doar topografi cu autorizație ANCPI pot lucra.",
        documents: ["Act proprietate (contract, certificat moștenitor etc.)", "CI proprietar"],
        location: "Topograf autorizat ANCPI",
        mapsUrl: "https://www.google.com/maps/search/topograf+autorizat+ANCPI",
        estimatedMinutes: 90,
        fee: "1000–3000 RON (variabil în funcție de suprafață și complexitate)",
      },
      {
        order: 2,
        title: "Verificare și recepție documentație de către topograf",
        institution: "ANCPI",
        description:
          "Topograful depune documentația cadastrală la OCPI. Verificarea durează 7–21 zile lucrătoare.",
        documents: ["Documentația cadastrală întocmită de topograf"],
        location: "OCPI județean (depunere de către topograf)",
        mapsUrl: "https://www.google.com/maps/search/OCPI",
        estimatedMinutes: 30,
        fee: "60 RON (recepție cadastrală)",
      },
      {
        order: 3,
        title: "Cerere intabulare și plată tarif",
        institution: "ANCPI",
        description:
          "După alocarea numărului cadastral, depui cererea de intabulare la OCPI (de obicei prin notar la achiziție, dar și direct).",
        documents: [
          "Cerere intabulare",
          "Act proprietate autentificat",
          "Documentație cadastrală (cu nr. cadastral)",
          "CI",
          "Dovadă plată tarif",
        ],
        location: "OCPI județean sau prin notar / online ancpi.ro",
        mapsUrl: "https://www.google.com/maps/search/OCPI",
        estimatedMinutes: 60,
        fee: "60 RON pentru persoane fizice (sau 0.5% din valoarea declarată la tranzacții)",
      },
      {
        order: 4,
        title: "Eliberare extras de carte funciară",
        institution: "ANCPI",
        description:
          "După intabulare primești extras CF cu numele tău ca proprietar — documentul de bază pentru orice vânzare/credit ipotecar viitor.",
        documents: ["Dovadă cerere intabulare"],
        location: "OCPI / online ancpi.ro",
        mapsUrl: "https://www.ancpi.ro",
        estimatedMinutes: 60,
        fee: "20 RON (extras informativ)",
      },
    ],
  },

  // ---------- Business ----------
  {
    id: "pfa-registration",
    title: "Înregistrare PFA la ONRC",
    category: "business",
    summary:
      "Înregistrarea unei Persoane Fizice Autorizate (PFA) — cea mai populară formă de antreprenoriat individual în România. Info-ul detaliat per pas este preluat din ghidul curatat de civic-agent-buian.",
    totalMinutes: 180,
    steps: [
      {
        order: 1,
        key: "caen_si_denumire",
        title: "Stabilire cod CAEN și rezervare denumire",
        institution: "ONRC",
        description:
          "Identifici codul CAEN principal (max 5 secundare) și rezervi denumirea PFA în portalul ONRC.",
        documents: ["Listă CAEN (caen.ro)", "Diplomă / atestat (dacă codul cere)"],
        location: "Online — caen.ro și onrc.ro (rezervare denumire)",
        mapsUrl: "https://www.onrc.ro",
        estimatedMinutes: 30,
        fee: "72 RON (rezervare denumire ONRC)",
        info: [
          "Codul principal definește activitatea de bază — restul sunt secundare.",
          "CAEN Rev. 3 este în vigoare din 2025; verifică echivalența dacă ai documente vechi.",
          "Pentru profesii liberale (avocat, medic) se folosesc coduri specifice (ex. 6910, 8621).",
          "Denumirea PFA trebuie să conțină numele complet al titularului + sintagma 'PFA' sau 'Persoană Fizică Autorizată'.",
          "Rezervarea e valabilă 3 luni; după aceea trebuie reînnoită.",
        ],
        actions: [
          { kind: "caen_suggest", label: "Sugerează CAEN cu AI" },
          { kind: "deep_link", label: "ONRC — portal rezervare denumire" },
          { kind: "tipizatul", procedureId: "24940", label: "Rezervare denumire — Tipizatul" },
          {
            kind: "explain_step",
            topic: "Cum aleg codul CAEN potrivit pentru PFA",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 2,
        key: "dosar_si_spatiu",
        title: "Pregătire dosar și document spațiu profesional",
        institution: "ONRC",
        description:
          "Ai nevoie de un sediu profesional — proprietate, chirie cu acord proprietar, sau comodat. Pentru apartament: acord asociație + vecini direct afectați.",
        documents: [
          "CI",
          "Document spațiu (extras CF / contract chirie / contract comodat)",
          "Acord proprietar dacă nu ești tu proprietar",
          "Acord asociație vecini (dacă e cazul)",
          "Cazier fiscal (gratuit la ANAF, valabil 30 zile)",
          "Specimen de semnătură (notar sau ghișeul ONRC)",
        ],
        location: "Acasă + ANAF pentru cazier fiscal + notar pentru specimen",
        mapsUrl: "https://www.google.com/maps/search/ANAF",
        estimatedMinutes: 60,
        info: [
          "Dacă ești proprietar: extras CF nu mai vechi de 30 zile.",
          "Dacă închiriezi/împrumuți: contract de comodat sau închiriere semnat de proprietar.",
          "În bloc: acordul asociației de proprietari + acordul vecinilor direct afectați (sus, jos, lateral).",
          "Dacă activitatea NU se desfășoară la sediu (doar adresă administrativă), declari acest lucru — nu mai e nevoie de acordul vecinilor.",
          "Specimen la notar: ~80–150 RON, gata în 10 min. La ghișeul ONRC: gratuit dar necesită deplasare.",
        ],
        actions: [
          {
            kind: "find_institution",
            institutionType: "notar public",
            label: "Găsește notar aproape",
          },
          {
            kind: "explain_step",
            topic: "Acte necesare pentru dovada sediului PFA",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 3,
        key: "depunere_onrc",
        title: "Depunere dosar la ONRC (online sau fizic)",
        institution: "ONRC",
        description:
          "Cea mai rapidă cale: portal.onrc.ro cu semnătură electronică. Dosarul fizic se depune la ORCT județean.",
        documents: [
          "Cerere înregistrare PFA (formular tip)",
          "Anexa 1 (vector fiscal)",
          "Declarație pe propria răspundere",
          "Dovada rezervare denumire",
          "Toate actele din pasul 2",
          "Dovadă plată 144 RON taxă ONRC",
        ],
        location: "Online portal.onrc.ro / ONRC județean",
        mapsUrl: "https://www.google.com/maps/search/ONRC+oficiul+registrului+comertului",
        estimatedMinutes: 60,
        fee: "144 RON (taxă ONRC) + 72 RON rezervare denumire",
        info: [
          "Depunerea online necesită semnătură electronică calificată (certSign, DigiSign, AlfaSign — ~30 EUR/an).",
          "Fără semnătură electronică, dosarul se depune fizic la ORCT din județul sediului.",
          "Termen de soluționare: 3 zile lucrătoare de la depunere completă.",
          "Plata taxei (144 RON) se face online cu cardul sau prin OP.",
        ],
        actions: [
          { kind: "deep_link", label: "ONRC — portal depunere dosar" },
          { kind: "tipizatul", procedureId: "24952", label: "Formulare PFA — Tipizatul" },
          {
            kind: "prefill_pdf",
            template: "declaratie_pfa",
            label: "Generează declarația pe propria răspundere",
          },
          {
            kind: "explain_step",
            topic: "Conținutul dosarului de înregistrare PFA la ONRC",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 4,
        key: "rezolutie_si_cui",
        title: "Așteptare rezoluție și ridicare CUI",
        institution: "ONRC",
        description:
          "Rezoluția vine în 3–5 zile lucrătoare. Primești Certificat de Înregistrare cu CUI (Codul Unic de Înregistrare).",
        documents: ["Niciunul — vine pe email / poștă"],
        location: "Acasă",
        mapsUrl: "https://www.onrc.ro",
        estimatedMinutes: 15,
        info: [
          "Verifici stadiul dosarului online cu numărul de înregistrare primit la depunere.",
          "Cu semnătură electronică, primești certificatul direct în format electronic, semnat de ONRC.",
          "Dacă ai depus fizic, ridici certificatul de la ORCT după aprobare.",
          "CUI-ul îl folosești imediat pentru ANAF, bancă și e-Factura.",
        ],
        actions: [{ kind: "deep_link", label: "ONRC — stadiu dosar" }],
      },
      {
        order: 5,
        key: "anaf_si_cont",
        title: "Înregistrare fiscală ANAF + cont bancar PFA",
        institution: "ANAF",
        description:
          "În 30 zile de la primirea CUI, depui Declarația 070 (vector fiscal) prin SPV și deschizi contul bancar dedicat.",
        documents: [
          "Certificat Înregistrare ONRC",
          "CI",
          "Estimare venituri an curent",
          "Semnătură electronică sau token SPV",
        ],
        location: "ANAF sector/județ sau online SPV + bancă",
        mapsUrl: "https://www.google.com/maps/search/ANAF",
        estimatedMinutes: 45,
        fee: "Gratuit (CAS/CASS ulterior, în funcție de venit)",
        info: [
          "Sistem real: 10% pe profit (venituri − cheltuieli deductibile). Recomandat dacă ai cheltuieli mari.",
          "Normă de venit: impozit fix pe activitate, doar pentru CAEN-uri din nomenclatorul ANAF.",
          "Plafon CAS/CASS 2025: 12 × 4.050 RON = 48.600 RON venit net anual.",
          "Conturi PFA 100% online: Revolut Business, Salt Bank (~30 min). Bănci tradiționale necesită vizită la sucursală.",
          "Obligatoriu e-Factura din 2024 pentru B2B; soluții gratuite: SmartBill Free, FGO, Oblio.",
        ],
        actions: [
          { kind: "deep_link", label: "ANAF — servicii online (SPV)" },
          { kind: "online_banks", label: "Bănci cu deschidere online" },
          {
            kind: "find_institution",
            institutionType: "bancă pentru cont PFA",
            label: "Sucursale aproape",
          },
        ],
      },
    ],
  },

  // ---------- Property sale (ported from civic-agent-buian `vanzare-imobil`) ----------
  {
    id: "property-sale",
    title: "Vânzare-cumpărare imobil",
    category: "property",
    summary:
      "Procedura completă de transfer al proprietății unui imobil (apartament, casă, teren). Pașii și info-ul detaliat sunt preluați din ghidul curatat de civic-agent-buian.",
    totalMinutes: 360,
    steps: [
      {
        order: 1,
        key: "extras_cf",
        title: "Extras de Carte Funciară pentru autentificare",
        institution: "ANCPI",
        description:
          "Solicitat de notar de la ANCPI. Valabil 5 zile lucrătoare. În practică notarul îl ia direct online.",
        documents: ["Număr cadastral sau adresă completă", "CI proprietar"],
        location: "ANCPI ePay (online) / prin notar",
        mapsUrl: "https://epay.ancpi.ro",
        estimatedMinutes: 30,
        fee: "~40 RON (autentificare) / ~20 RON (informativ)",
        info: [
          "În practică notarul îl cere direct online — nu trebuie să te deplasezi.",
          "Conține: descrierea imobilului, proprietarul actual, sarcini (ipoteci, interdicții).",
          "Valabilitate: 5 zile lucrătoare pentru autentificare; după aceea se cere unul nou.",
          "Pentru verificări personale poți obține un extras informativ (~20 RON) — NU e valabil pentru notar.",
        ],
        actions: [
          { kind: "deep_link", label: "ANCPI ePay — extras CF online" },
          {
            kind: "explain_step",
            topic: "Cum obțin extras de carte funciară online",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 2,
        key: "certificat_fiscal",
        title: "Certificat fiscal vânzător",
        institution: "Primarie",
        description:
          "Atestă că imobilul nu are datorii la primărie. Se emite DOAR de primăria pe raza imobilului.",
        documents: ["CI proprietar", "Act de proprietate", "Ultima chitanță impozit (recomandat)"],
        location: "Direcția de Impozite și Taxe Locale (DITL) sau Ghișeul.ro",
        mapsUrl: "https://www.google.com/maps/search/Directia+de+Impozite+si+Taxe+Locale",
        estimatedMinutes: 45,
        fee: "Gratuit",
        info: [
          "Se emite DOAR de primăria pe raza căreia se află imobilul (nu de cea de domiciliu).",
          "Valabilitate: până la finalul lunii în care a fost emis.",
          "Toate impozitele aferente anului în curs trebuie achitate înainte de eliberare.",
          "Multe primării (București, Cluj, Timișoara, Iași) emit online prin Ghișeul.ro sau portal propriu.",
        ],
        actions: [
          { kind: "deep_link", label: "Ghișeul.ro — taxe locale" },
          {
            kind: "find_institution",
            institutionType: "Direcția de Impozite și Taxe Locale",
            label: "Găsește DITL aproape",
          },
          {
            kind: "explain_step",
            topic: "Cum obțin certificatul fiscal de la primărie pentru vânzare imobil",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 3,
        key: "certificat_energetic",
        title: "Certificat de performanță energetică",
        institution: "Primarie",
        description: "Obligatoriu prin Legea 372/2005. Emis de auditor energetic autorizat MDLPA.",
        documents: ["Acces la imobil pentru auditor"],
        location: "Auditor energetic atestat (la fața locului)",
        mapsUrl: "https://www.google.com/maps/search/auditor+energetic+atestat",
        estimatedMinutes: 120,
        fee: "200–500 RON (apartament 200–350, casă 350–500)",
        info: [
          "Obligatoriu prin Legea 372/2005 — fără el actul notarial nu se autentifică.",
          "Valabilitate: 10 ani de la emitere (poate fi reutilizat la următoarea vânzare).",
          "Auditorul vine la fața locului, măsoară și emite certificatul cu clasă energetică A–G.",
          "Registrul auditorilor atestați este public pe site-ul MDLPA.",
        ],
        actions: [
          { kind: "deep_link", label: "MDLPA — registru auditori energetici" },
          {
            kind: "find_institution",
            institutionType: "auditor energetic atestat",
            label: "Găsește auditor energetic",
          },
          {
            kind: "explain_step",
            topic: "Ce este certificatul de performanță energetică și cine îl emite",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 4,
        key: "antecontract",
        title: "Antecontract (promisiune de vânzare-cumpărare)",
        institution: "Notar",
        description:
          "Document care fixează prețul și termenul. Recomandat la notar pentru a putea fi notat în CF.",
        documents: ["CI ambele părți", "Extras CF", "Certificat fiscal"],
        location: "Notar public (recomandat) sau sub semnătură privată",
        mapsUrl: "https://www.google.com/maps/search/notar+public",
        estimatedMinutes: 60,
        fee: "Sub semnătură privată: gratuit. Notar: ~0,5% din valoare",
        info: [
          "Nu e obligatoriu prin lege, dar e standard pentru a bloca tranzacția.",
          "Trebuie să conțină: identificarea părților, identificarea imobilului (nr. cadastral, CF), prețul, termenul de autentificare, condiții suspensive.",
          "Avansul (arvuna) e tipic 10% din preț; se scade din prețul final.",
          "Dacă cumpărătorul renunță, pierde arvuna; dacă vânzătorul renunță, returnează dublul.",
          "Autentificarea la notar (~0,5% din valoare) e recomandată pentru a putea fi notat în CF.",
        ],
        actions: [
          {
            kind: "prefill_pdf",
            template: "antecontract",
            label: "Generează antecontract prefilat",
          },
          {
            kind: "find_institution",
            institutionType: "notar public",
            label: "Găsește notar pentru antecontract",
          },
          {
            kind: "explain_step",
            topic: "Ce trebuie să conțină un antecontract de vânzare imobil",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 5,
        key: "act_notarial",
        title: "Contract de vânzare-cumpărare autentic",
        institution: "Notar",
        description:
          "Semnat la notar — transferă proprietatea. Notarul depune dosarul electronic la OCPI.",
        documents: [
          "CI ambele părți",
          "Extras CF la zi",
          "Certificat fiscal",
          "Certificat energetic",
          "Dovada plății preț (OP / extras cont)",
        ],
        location: "Notar public",
        mapsUrl: "https://www.google.com/maps/search/notar+public",
        estimatedMinutes: 90,
        fee: "Onorariu notar (~1–2,5%) + impozit vânzător (1–3%) + intabulare 0,15%",
        info: [
          "Onorariu notar: ~1–2,5% din prețul declarat, conform grilei UNNPR (degresiv pe tranșe).",
          "Impozit pe venit vânzător: 3% dacă imobilul a fost deținut <3 ani, 1% peste 3 ani (din valoarea care depășește 600.000 RON).",
          "Taxă intabulare OCPI: 0,15% din valoare, suportată de cumpărător.",
          "Pentru căsătoriți: ambii soți semnează (sau procură autentică); pentru moștenire: certificat de moștenitor.",
        ],
        actions: [
          { kind: "deep_link", label: "UNNPR — onorarii notariale" },
          {
            kind: "find_institution",
            institutionType: "notar public",
            label: "Găsește notar aproape",
          },
          {
            kind: "explain_step",
            topic: "Onorarii notariale orientative la vânzare imobil",
            label: "Explică pas cu pas",
          },
        ],
      },
      {
        order: 6,
        key: "intabulare",
        title: "Intabulare la OCPI",
        institution: "ANCPI",
        description:
          "Înscrierea cumpărătorului în Cartea Funciară. Inițiată automat de notar; finalizare în 14 zile (sau 1–2 cu urgență).",
        documents: ["Niciunul — depus electronic de notar"],
        location: "OCPI prin notar (online)",
        mapsUrl: "https://epay.ancpi.ro",
        estimatedMinutes: 15,
        fee: "0,15% din valoare (urgență: dublu)",
        info: [
          "Notarul depune dosarul electronic la OCPI imediat după autentificare — nu trebuie să te deplasezi.",
          "Termen standard: 14 zile lucrătoare. Cu taxă de urgență (dublă): 1–2 zile.",
          "Primești numărul de înregistrare de la notar — îl folosești pentru a urmări stadiul online.",
          "După intabulare, noul extras CF apare pe numele cumpărătorului în 24h în ANCPI ePay.",
          "Dacă apar respingeri (lipsă acte, neconcordanțe), notarul te anunță și remediază.",
        ],
        actions: [
          { kind: "deep_link", label: "ANCPI ePay — verificare dosar" },
          {
            kind: "explain_step",
            topic: "Cum verific stadiul dosarului de intabulare la OCPI",
            label: "Explică pas cu pas",
          },
        ],
      },
    ],
  },

  // ---------- Fiscal ----------
  {
    id: "anaf-declaration",
    title: "Declarație unică ANAF (venituri)",
    category: "fiscal",
    summary: "Depunerea Declarației Unice pentru venituri din activități independente.",
    totalMinutes: 60,
    steps: [
      {
        order: 1,
        title: "Pregătire date fiscale",
        institution: "ANAF",
        description: "Adunați facturile, extrasele și calculați venitul net estimat.",
        documents: ["Facturi emise", "Extrase cont", "Contracte"],
        location: "Acasă / contabil",
        mapsUrl: "https://www.anaf.ro",
        estimatedMinutes: 30,
      },
      {
        order: 2,
        title: "Depunere online SPV ANAF",
        institution: "ANAF",
        description: "Login în Spațiul Privat Virtual, formularul 212.",
        documents: ["CI", "CNP", "Date acces SPV"],
        location: "anaf.ro — SPV",
        mapsUrl: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online",
        estimatedMinutes: 30,
      },
    ],
  },
];

type StepEnrichment = Partial<Pick<WorkflowStep, "mode" | "info" | "actions" | "key">>;
const STEP_ENRICHMENTS: Record<string, Record<number, StepEnrichment>> = {
  "car-registration-2nd-hand": {
    1: {
      mode: "in_person",
      info: [
        "Contractul autentificat simplifică pașii fiscali ulteriori.",
        "Verifică dacă datele din CIV/talon coincid cu identitatea vânzătorului.",
      ],
      actions: [
        {
          kind: "explain_step",
          topic: "Documente obligatorii la contractul de vânzare auto",
          label: "Explică pas cu pas",
        },
      ],
    },
    2: {
      mode: "hybrid",
      actions: [
        { kind: "open_url", url: "https://www.ghiseul.ro", label: "Ghișeul.ro — taxe locale" },
      ],
    },
    3: {
      mode: "hybrid",
      actions: [{ kind: "open_url", url: "https://asfromania.ro", label: "ASF — verificare RCA" }],
    },
    4: {
      key: "inmatriculare_finala",
      mode: "in_person",
      actions: [
        {
          kind: "open_url",
          url: "https://www.drpciv.ro/web/ghidul-cetateanului/inmatricularea-vehiculelor",
          label: "DRPCIV — ghid complet",
        },
      ],
    },
  },
  "renew-driver-license": {
    1: {
      mode: "in_person",
      info: ["Clinica trebuie să fie autorizată pentru fișe auto."],
      actions: [
        {
          kind: "find_institution",
          institutionType: "cabinet medical autorizat auto",
          label: "Găsește clinică auto",
        },
      ],
    },
    2: {
      key: "depunere_drpciv",
      mode: "hybrid",
      actions: [
        {
          kind: "open_url",
          url: "https://www.drpciv.ro/",
          label: "DRPCIV — programări",
        },
      ],
    },
    3: { mode: "hybrid" },
  },
  "passport-issuance": {
    1: {
      key: "programare_epasapoarte",
      mode: "online",
      actions: [
        { kind: "open_url", url: "https://www.epasapoarte.ro", label: "ePașapoarte — programare" },
      ],
    },
    2: {
      mode: "hybrid",
      actions: [
        { kind: "open_url", url: "https://www.ghiseul.ro", label: "Ghișeul.ro — plata taxei" },
      ],
    },
    3: { mode: "in_person" },
    4: { mode: "hybrid" },
  },
  "anaf-declaration": {
    1: {
      mode: "online",
      info: [
        "Separă veniturile estimate de veniturile realizate din anul anterior.",
        "Pregătește devreme datele pentru a evita blocajele din apropierea termenului.",
      ],
      actions: [
        {
          kind: "explain_step",
          topic: "Ce documente sunt utile înainte de completarea declarației unice",
          label: "Explică pregătirea",
        },
        { kind: "tipizatul", procedureId: "26045", label: "Formulare ANAF — Tipizatul" },
      ],
    },
    2: {
      key: "depunere_spv",
      mode: "online",
      actions: [
        {
          kind: "open_url",
          url: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online",
          label: "ANAF SPV — depunere",
        },
        { kind: "tipizatul", label: "Toate formularele fiscale" },
      ],
    },
  },
};

function enrichWorkflow(workflow: Workflow): Workflow {
  const byStep = STEP_ENRICHMENTS[workflow.id];
  if (!byStep) return workflow;
  return {
    ...workflow,
    steps: workflow.steps.map((step) => {
      const enrich = byStep[step.order];
      if (!enrich) return step;
      return {
        ...step,
        ...enrich,
        info: enrich.info ?? step.info,
        actions: enrich.actions ?? step.actions,
      };
    }),
  };
}

// Inject dataSource onto every workflow from the centralized source map.
// Production move: this becomes a build-time merge against a maintained CMS.
const WORKFLOWS: Workflow[] = RAW_WORKFLOWS.map((raw) => {
  const w = enrichWorkflow(raw);
  const src = WORKFLOW_SOURCES[w.id];
  return src
    ? {
        ...w,
        dataSource: { authority: src.authority, url: src.url, verifiedAt: WORKFLOWS_LAST_REVIEWED },
      }
    : w;
});

// ---------- Civic calendar data (real upcoming Romanian deadlines) ----------
// Recurring annual fiscal deadlines published by ANAF and other ministries.
// The dashboard surfaces the next 3 upcoming entries.
const CIVIC_CALENDAR: CivicCalendarEntry[] = [
  {
    id: "anaf-declaratie-unica",
    title: "Declarația Unică ANAF",
    description:
      "Termen anual pentru depunerea Declarației Unice privind impozitul pe venit și contribuțiile sociale (formular 212).",
    deadline: `${new Date().getFullYear()}-05-25T23:59:59`,
    institution: "ANAF",
    relatedWorkflowId: "anaf-declaration",
    url: "https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declararea_obligatiilor_fiscale/declaratia_unica/",
  },
  {
    id: "rovinieta-anuala",
    title: "Rovinieta — verificare valabilitate",
    description:
      "Vinieta auto se verifică prin CNAIR / e-vignette. Plata se face online sau la benzinării autorizate.",
    deadline: `${new Date().getFullYear()}-06-30T23:59:59`,
    institution: "Gov.ro",
    url: "https://www.erovinieta.ro/rovignette-portal-web/",
  },
  {
    id: "impozit-auto-trim-3",
    title: "Impozit auto — trimestrul 3",
    description:
      "A doua tranșă anuală a impozitului auto către primărie. Plata se face la Direcția de Taxe Locale sau pe ghiseul.ro.",
    deadline: `${new Date().getFullYear()}-09-30T23:59:59`,
    institution: "Primarie",
    url: "https://www.ghiseul.ro/ghiseul/public/",
  },
  {
    id: "itp-anual",
    title: "ITP auto — verificare termen",
    description:
      "Inspecția Tehnică Periodică este obligatorie anual (autoturisme >12 ani) sau bianual (5-12 ani). Programare la orice stație RAR autorizată.",
    deadline: `${new Date().getFullYear()}-12-31T23:59:59`,
    institution: "Gov.ro",
    url: "https://www.rarom.ro/",
  },
];

// ---------- Service health (mock pilot, real shape) ----------
function nowIso(): string {
  return new Date().toISOString();
}
const SERVICE_HEALTH_TEMPLATES: Omit<ServiceHealth, "lastChecked">[] = [
  {
    service: "ANAF SPV",
    status: "operational",
    note: "Toate serviciile răspund normal.",
    url: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/",
  },
  {
    service: "DRPCIV București",
    status: "degraded",
    note: "Cozi prelungite la programări. Recomandăm depunere online unde e posibil.",
    url: "https://www.drpciv.ro",
  },
  {
    service: "Ghișeul.ro",
    status: "operational",
    note: "Plățile electronice funcționează normal.",
    url: "https://www.ghiseul.ro",
  },
  {
    service: "ePașapoarte",
    status: "operational",
    note: "Programări disponibile în toate județele.",
    url: "https://www.epasapoarte.ro",
  },
];

// ---------- Public API ----------

export const govApi = {
  async listWorkflows(): Promise<Workflow[]> {
    await delay(150);
    return WORKFLOWS;
  },
  async getWorkflow(id: string): Promise<Workflow | undefined> {
    await delay(200);
    return WORKFLOWS.find((w) => w.id === id);
  },
  async getServiceHealth(): Promise<ServiceHealth[]> {
    await delay(300);
    return SERVICE_HEALTH_TEMPLATES.map((t) => ({ ...t, lastChecked: nowIso() }));
  },
  /** Returns the next `count` upcoming civic deadlines (today inclusive). */
  async getUpcomingDeadlines(count = 3): Promise<CivicCalendarEntry[]> {
    await delay(150);
    const now = Date.now();
    return CIVIC_CALENDAR.map((e) => ({ entry: e, ts: new Date(e.deadline).getTime() }))
      .filter((x) => x.ts >= now)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, count)
      .map((x) => x.entry);
  },
  /** Mock "AI orchestrator" — matches free-text query to closest workflow.
   *  Ordering matters: more specific patterns must come before generic ones. */
  async resolveQuery(query: string): Promise<Workflow | undefined> {
    await delay(450);
    const q = query.toLowerCase();
    const find = (id: string) => WORKFLOWS.find((w) => w.id === id);

    // --- Auto (specific before generic "permis") ---
    if (/(preschimb|permis.*strain|foreign.*license|exchange.*license)/.test(q))
      return find("foreign-license-exchange");
    if (/(v[âa]nd.*ma[sș]in|vanzare.*auto|contract.*auto.*vanzare)/.test(q))
      return find("vanzare-auto");
    if (/(masin|auto|înmatricul|inmatricul|second)/.test(q))
      return find("car-registration-2nd-hand");
    if (/(reînnoire|reinnoire|reînnoiesc|reinnoiesc|expira|permis|drive|condu)/.test(q))
      return find("renew-driver-license");

    // --- Identity ---
    if (/(pașaport|pasaport|passport|epasapoarte|călătorie|calatorie|extern)/.test(q))
      return find("passport-issuance");
    if (
      /(buletin.*nou|schimbare.*buletin|schimbare.*ci|mutare|domicili|reloca|am pierdut.*(buletin|carte))/.test(
        q,
      )
    )
      return find("id-change-relocation");
    if (
      /(cazier|clearance|certificat.*poliți|certificat.*politi|fără.*antecedente|fara.*antecedente)/.test(
        q,
      )
    )
      return find("police-clearance");

    // --- Family ---
    if (/(naștere|nastere|nou.?născut|nounascut|certificat.*nast|birth|maternit)/.test(q))
      return find("birth-certificate");
    if (/(căsători|casatori|nuntă|nunta|mire|mireasă|mireasa|marriage|wedding)/.test(q))
      return find("civil-marriage");
    if (/(aloca[țt]ie|child.?allowance|copil.*bani|bani.*copil|indemniza[țt]ie.*copil)/.test(q))
      return find("child-state-allowance");

    // --- Property ---
    if (
      /(autoriza[țt]ie.*constru|construire|construit.*cas|construit.*gard|building.*permit|primarie.*construc)/.test(
        q,
      )
    )
      return find("building-permit");
    if (
      /(v[âa]nzare.*imobil|vand.*apart|vand.*cas|vand.*teren|cump[ăa]r.*apart|cump[ăa]r.*cas|antecontract|notar.*imobil|tranzac.*imobil)/.test(
        q,
      )
    )
      return find("property-sale");
    if (
      /(intabulare|cadastr|carte.*funciar|ancpi|ocpi|extras.*cf|proprietate.*[îi]nregistr)/.test(q)
    )
      return find("cadastral-registration");

    // --- Business ---
    if (
      /(\bpfa\b|persoan[ăa].*fizic[ăa].*autoriz|sole.*proprietor|onrc|inregistrare.*firm)/.test(q)
    )
      return find("pfa-registration");

    // --- Fiscal ---
    if (/(anaf|venit|declarat|fiscal|impozit|declarație unic|declaratie unica|spv)/.test(q))
      return find("anaf-declaration");

    // Soft default: car registration is the highest-traffic workflow.
    return WORKFLOWS[0];
  },
  /** Mock document explainer — fake OCR + plain-language summary */
  async explainDocument(_fileName: string): Promise<{
    docType: string;
    summary: string;
    keyFields: { label: string; value: string }[];
    signHere: string[];
  }> {
    await delay(2600);
    return {
      docType: "Decizie de impunere ANAF",
      summary:
        "Această decizie vă comunică suma de plată către stat pentru anul fiscal curent. Aveți 45 de zile să o contestați sau să o achitați.",
      keyFields: [
        { label: "Suma de plată", value: "1.247,00 RON" },
        { label: "Termen scadent", value: "25 noiembrie 2025" },
        { label: "Cont IBAN", value: "RO12 TREZ 7042 0A47 0301 XXXX" },
        { label: "Cod fiscal contribuabil", value: "1234567890123" },
      ],
      signHere: ["Pagina 2 — confirmare de primire", "Pagina 3 — semnătură contribuabil"],
    };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
