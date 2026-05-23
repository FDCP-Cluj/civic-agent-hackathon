// Local CAEN nomenclature subset + fuzzy keyword search.
//
// The full CAEN Rev. 3 list has ~600 codes. Shipping all of them in the
// browser bundle is wasteful for a citizen-facing app — the top ~70 codes
// here cover the vast majority of PFA activities (IT, freelance trades,
// commerce, services, healthcare, agriculture). Niche codes can be added
// per user request without breaking the API.

export type CaenCode = {
  code: string;
  title: string;
  /** Lowercased keywords used by `findCaen()` for substring matching. */
  keywords: string[];
};

export const CAEN_CODES: CaenCode[] = [
  // --- IT & digital ---
  {
    code: "6201",
    title: "Activități de realizare a softului la comandă",
    keywords: [
      "software",
      "programare",
      "dezvoltare web",
      "developer",
      "frontend",
      "backend",
      "fullstack",
      "react",
      "node",
      "python",
      "aplicatii",
      "cod",
      "it",
      "informatica",
    ],
  },
  {
    code: "6202",
    title: "Activități de consultanță în tehnologia informației",
    keywords: ["consultanta it", "devops", "cloud", "aws", "azure", "consultant tehnic"],
  },
  {
    code: "6203",
    title: "Activități de management al echipamentelor de calcul",
    keywords: ["administrare sisteme", "sysadmin", "infrastructura", "retea", "server"],
  },
  {
    code: "6209",
    title: "Alte activități de servicii privind tehnologia informației",
    keywords: ["service it", "reparatii calculatoare", "asistenta tehnica"],
  },
  {
    code: "6311",
    title: "Prelucrarea datelor, administrare site-uri web și activități conexe",
    keywords: ["hosting", "site", "data", "web hosting", "cloud services"],
  },
  {
    code: "5829",
    title: "Activități de editare a altor produse software",
    keywords: ["produs software", "saas", "aplicatie proprie", "publicare software"],
  },

  // --- Creative & marketing ---
  {
    code: "7311",
    title: "Activități ale agențiilor de publicitate",
    keywords: ["publicitate", "advertising", "campanii", "media buying"],
  },
  {
    code: "7320",
    title: "Activități de studiere a pieței și de sondare a opiniei publice",
    keywords: ["cercetare piata", "marketing research", "sondaje", "studii"],
  },
  {
    code: "7410",
    title: "Activități de design specializat",
    keywords: ["design", "grafica", "ui ux", "branding", "logo", "identitate vizuala"],
  },
  {
    code: "7420",
    title: "Activități fotografice",
    keywords: ["fotograf", "foto", "fotografie", "nunti", "produs"],
  },
  {
    code: "7430",
    title: "Activități de traducere scrisă și orală (interpreți)",
    keywords: ["traducator", "traducere", "interpret", "translator"],
  },
  {
    code: "7022",
    title: "Activități de consultanță pentru afaceri și management",
    keywords: ["consultanta", "business consulting", "management", "strategie", "advisory"],
  },

  // --- Healthcare ---
  {
    code: "8610",
    title: "Activități de asistență spitalicească",
    keywords: ["spital", "asistenta spitaliceasca"],
  },
  {
    code: "8621",
    title: "Activități de asistență medicală generală",
    keywords: ["medic generalist", "cabinet medical", "medicina de familie"],
  },
  {
    code: "8622",
    title: "Activități de asistență medicală specializată",
    keywords: ["medic specialist", "cardiolog", "dermatolog", "ginecolog"],
  },
  {
    code: "8623",
    title: "Activități de asistență stomatologică",
    keywords: ["dentist", "stomatolog", "ortodont"],
  },
  {
    code: "8690",
    title: "Alte activități referitoare la sănătatea umană",
    keywords: ["kinetoterapie", "fizioterapie", "logoped", "psiholog", "nutritionist"],
  },

  // --- Legal & finance ---
  {
    code: "6910",
    title: "Activități juridice",
    keywords: ["avocat", "consultanta juridica", "jurist", "cabinet avocat"],
  },
  {
    code: "6920",
    title: "Activități de contabilitate și audit financiar",
    keywords: ["contabil", "contabilitate", "audit", "expert contabil"],
  },
  {
    code: "6622",
    title: "Activități ale agenților și broker-ilor de asigurări",
    keywords: ["asigurari", "broker", "agent asigurari"],
  },
  {
    code: "6831",
    title: "Agenții imobiliare",
    keywords: ["imobiliar", "agentie imobiliara", "broker imobiliar"],
  },

  // --- Education & training ---
  {
    code: "8551",
    title: "Învățământ în domeniul sportiv și recreativ",
    keywords: ["antrenor", "sport", "fitness", "yoga"],
  },
  {
    code: "8552",
    title: "Învățământ în domeniul cultural",
    keywords: ["profesor muzica", "actorie", "dans", "arta"],
  },
  {
    code: "8553",
    title: "Școli de conducere (pilotaj)",
    keywords: ["scoala soferi", "instructor auto"],
  },
  {
    code: "8559",
    title: "Alte forme de învățământ",
    keywords: ["meditatii", "tutore", "limbi straine", "engleza", "training"],
  },

  // --- Personal services ---
  {
    code: "9602",
    title: "Coafură și alte activități de înfrumusețare",
    keywords: ["coafor", "frizerie", "manichiura", "pedichiura", "salon"],
  },
  {
    code: "9604",
    title: "Activități de întreținere corporală",
    keywords: ["masaj", "spa", "salon de masaj"],
  },
  {
    code: "9609",
    title: "Alte activități de servicii",
    keywords: ["servicii personale", "servicii diverse"],
  },

  // --- Trades & construction ---
  {
    code: "4120",
    title: "Lucrări de construcții a clădirilor",
    keywords: ["constructii", "construit case", "antreprenor"],
  },
  {
    code: "4321",
    title: "Lucrări de instalații electrice",
    keywords: ["electrician", "instalatii electrice"],
  },
  {
    code: "4322",
    title: "Lucrări de instalații sanitare, încălzire și aer condiționat",
    keywords: ["instalator", "sanitare", "incalzire", "aer conditionat", "centrala termica"],
  },
  {
    code: "4332",
    title: "Lucrări de tâmplărie și dulgherie",
    keywords: ["tamplar", "mobila la comanda", "dulgher"],
  },
  {
    code: "4334",
    title: "Lucrări de vopsitorie, zugrăveli și montări de geamuri",
    keywords: ["zugrav", "vopsitor", "renovari", "geamuri"],
  },
  {
    code: "4339",
    title: "Alte lucrări de finisare",
    keywords: ["finisari", "amenajari interioare"],
  },

  // --- Transport ---
  {
    code: "4931",
    title: "Transporturi urbane, suburbane și metropolitane de călători",
    keywords: ["transport persoane", "uber", "bolt"],
  },
  { code: "4932", title: "Transporturi cu taxiuri", keywords: ["taxi", "taximetrie"] },
  {
    code: "4941",
    title: "Transporturi rutiere de mărfuri",
    keywords: ["transport marfa", "camion", "cargo"],
  },
  {
    code: "5320",
    title: "Alte activități poștale și de curier",
    keywords: ["curier", "livrari", "delivery", "glovo", "tazz"],
  },

  // --- Retail & food ---
  {
    code: "4711",
    title:
      "Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse alimentare",
    keywords: ["magazin alimentar", "minimarket"],
  },
  {
    code: "4791",
    title: "Comerț cu amănuntul prin intermediul caselor de comenzi sau prin Internet",
    keywords: ["magazin online", "ecommerce", "vanzari online", "shopify"],
  },
  { code: "5610", title: "Restaurante", keywords: ["restaurant", "bistro", "pizzerie"] },
  {
    code: "5630",
    title: "Baruri și alte activități de servire a băuturilor",
    keywords: ["bar", "pub", "cafenea", "cocktail bar"],
  },
  {
    code: "5621",
    title: "Activități de alimentație (catering) pentru evenimente",
    keywords: ["catering", "evenimente"],
  },

  // --- Agriculture & crafts ---
  { code: "0111", title: "Cultivarea cerealelor", keywords: ["agricultura", "cereale", "ferma"] },
  { code: "0149", title: "Creșterea altor animale", keywords: ["apicultura", "albine", "miere"] },
  {
    code: "0210",
    title: "Silvicultură și alte activități forestiere",
    keywords: ["silvicultura", "padure"],
  },
  {
    code: "3220",
    title: "Fabricarea instrumentelor muzicale",
    keywords: ["instrumente muzicale", "lutier"],
  },
  { code: "3240", title: "Fabricarea jocurilor și jucăriilor", keywords: ["jucarii", "jocuri"] },

  // --- Misc professional ---
  {
    code: "7022",
    title: "Activități de consultanță pentru afaceri și management (HR, strategie)",
    keywords: ["hr", "resurse umane", "recrutare", "headhunting"],
  },
  {
    code: "7111",
    title: "Activități de arhitectură",
    keywords: ["arhitect", "proiectare cladiri"],
  },
  {
    code: "7112",
    title: "Activități de inginerie și consultanță tehnică legate de acestea",
    keywords: ["inginer", "proiectare", "topografie", "cadastru"],
  },
  {
    code: "7120",
    title: "Activități de testări și analize tehnice",
    keywords: ["laborator", "analize tehnice", "calibrare"],
  },
];

export type CaenMatch = CaenCode & { score: number };

/** Returns the top N CAEN codes that match the user's free-form activity. */
export function findCaen(activity: string, limit = 5): CaenMatch[] {
  const q = activity
    .toLocaleLowerCase("ro-RO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter((t) => t.length > 2);

  return CAEN_CODES.map((c) => {
    let score = 0;
    const haystack = (c.title + " " + c.keywords.join(" "))
      .toLocaleLowerCase("ro-RO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    for (const token of tokens) {
      if (haystack.includes(token)) score += 2;
    }
    // Exact substring of the whole query is a strong signal.
    if (haystack.includes(q)) score += 5;
    // Match against keywords array gets a small bonus per hit.
    for (const kw of c.keywords) {
      if (q.includes(kw) || kw.includes(q)) score += 1;
    }

    return { ...c, score };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
