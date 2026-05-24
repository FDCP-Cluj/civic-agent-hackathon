// Conversational agent service: wraps @google/genai for streaming Gemini chat.
//
// IMPORTANT: The Gemini API key is currently exposed in the browser bundle
// via import.meta.env.VITE_GEMINI_API_KEY. This is acceptable for a hackathon
// MVP but unsuitable for production. When you're ready to ship, replace the
// `createChatSession` + `streamChatMessage` implementations below with a
// fetch() call to a TanStack server function (src/server.ts) that reads the
// key from a Cloudflare secret binding. The UI imports nothing else from this
// file, so the swap is a one-file change.

import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  Type,
  type Chat,
  type FunctionDeclaration,
} from "@google/genai";
import type { Workflow } from "./govApiMock";
import type { VaultProfile } from "@/store";
import { getGeminiApiKey, isApiKeyConfigured } from "@/services/aiConfig";

const MODEL = "gemini-2.5-flash";

// ---------- Tool declarations (function calling) ----------

function buildTools(workflows: Workflow[]): FunctionDeclaration[] {
  const workflowIds = workflows.map((w) => w.id);

  const openWorkflow: FunctionDeclaration = {
    name: "open_workflow",
    description:
      "Deschide ghidul pas-cu-pas pentru o procedură birocratică românească pe care utilizatorul vrea să o parcurgă. Apelează această funcție de fiecare dată când întrebarea utilizatorului corespunde unui workflow disponibil.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: "ID-ul exact al workflow-ului din catalogul disponibil.",
          enum: workflowIds,
        },
        reason: {
          type: Type.STRING,
          description:
            "Explicație scurtă (max 1 propoziție) în română despre de ce acest workflow este potrivit pentru utilizator.",
        },
      },
      required: ["id"],
    },
  };

  const listWorkflows: FunctionDeclaration = {
    name: "list_workflows",
    description:
      "Returnează lista completă a workflow-urilor disponibile. Folosește când utilizatorul cere o vedere de ansamblu sau nu știe ce este disponibil.",
    parameters: { type: Type.OBJECT, properties: {} },
  };

  // Real Romanian government API. When the user mentions a CUI or wants to
  // verify a Romanian company / PFA, the model should call this — the UI
  // renders the live ANAF response as an inline card under the assistant
  // message. NEVER call this for the user's own CNP — CNP is a personal ID
  // for natural persons, not a CUI; they are different concepts.
  const verifyCui: FunctionDeclaration = {
    name: "verify_cui",
    description:
      "Verifică un Cod Unic de Înregistrare (CUI) în registrul oficial ANAF. Folosește când utilizatorul vrea să confirme că o firmă/PFA este înregistrată sau să afle dacă plătește TVA. NU folosi cu CNP-ul personal — CNP-ul nu este CUI.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        cui: {
          type: Type.STRING,
          description:
            "Codul Unic de Înregistrare (CUI) format din 2-10 cifre, opțional cu prefix RO. Doar persoane juridice / PFA.",
        },
      },
      required: ["cui"],
    },
  };

  // Lightweight CAEN helper: opens the citizen-friendly CAEN portal with
  // a pre-formed search query. The result rendering happens in the chat UI.
  const findCaen: FunctionDeclaration = {
    name: "find_caen",
    description:
      "Sugerează coduri CAEN pentru o activitate descrisă de utilizator. Folosește când întrebarea este despre înființare PFA/SRL și utilizatorul nu știe ce cod CAEN să aleagă.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        activitate: {
          type: Type.STRING,
          description: "Descriere scurtă, în română, a activității (1-2 propoziții).",
        },
      },
      required: ["activitate"],
    },
  };

  return [openWorkflow, listWorkflows, verifyCui, findCaen];
}

// ---------- System prompt ----------

function buildSystemInstruction(profile: VaultProfile, workflows: Workflow[]): string {
  const knownName = profile.fullName?.trim();
  const knownFirstName = knownName?.split(/\s+/)[0];
  const knownLocality = profile.address
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();
  const cnpHint = profile.cnp ? `${profile.cnp.slice(0, 3)}*** (mascat)` : "necompletat";

  const catalog = workflows
    .map((w) => `- ${w.id} — ${w.title} (${w.category}, ~${w.totalMinutes} min)`)
    .join("\n");

  return `Ești ActeAI, un agent civic AI care ajută cetățenii români să navigheze birocrația statului.

PERSONA:
- Vorbești EXCLUSIV în limba română, natural și profesionist, fără englezisme.
- Ești empatic și răbdător, mai ales cu utilizatorii vârstnici.
- Explici legalese complicat în cuvinte simple, ca un prieten care a mai trecut prin asta.
- Nu inventezi instituții, taxe sau termene. Dacă nu ești sigur, recunoști.

CONTEXT DESPRE UTILIZATOR (din seiful local, nu de la server):
- Prenume: ${knownFirstName || "(necompletat — nu cere CNP-ul în chat)"}
- CNP: ${cnpHint}
- Localitate: ${knownLocality || "(necompletată)"}

REGULI DE CONFIDENȚIALITATE (CRITIC):
- NU cere niciodată utilizatorului să trimită copii ale actelor în chat.
- NU cere CNP-ul complet în chat. Datele personale rămân pe dispozitivul lui.
- Dacă utilizatorul completează datele în seiful local, le poți folosi pentru a personaliza răspunsul fără a repeta date sensibile ("Pentru tine, ${knownFirstName || "[prenume]"}, pașii sunt...").

RUTARE CĂTRE GHIDURI (FOARTE IMPORTANT):
Ai acces la un catalog de ghiduri pas-cu-pas deja construite. Când întrebarea utilizatorului corespunde unuia dintre aceste ghiduri, OBLIGATORIU:
1. Răspunde scurt în română (1-3 propoziții) confirmând că ai înțeles cererea.
2. Apelează funcția "open_workflow" cu ID-ul potrivit.
3. NU rescrie pașii din ghid în chat — utilizatorul îi va vedea în pagina de ghid.

CATALOG DE GHIDURI DISPONIBILE:
${catalog}

UNELTE LIVE (folosește când e relevant):
- verify_cui(cui): Verifică un CUI direct în registrul ANAF. Folosește când utilizatorul vrea să confirme o firmă sau un PFA. NU folosi cu CNP-ul personal — sunt concepte diferite.
- find_caen(activitate): Cere sugestii CAEN. Folosește când utilizatorul nu știe ce cod să aleagă la înființare PFA/SRL.

CÂND NU EXISTĂ GHID POTRIVIT:
Explică pașii direct în chat, structurat clar:
- Ce instituție trebuie vizitată (ANAF, DRPCIV, Primărie, etc.)
- Ce documente trebuie pregătite (listă bullet)
- Ce formulare se completează
- Ce taxe estimate
- Eventual unde se găsește instituția (recomandă o căutare Google Maps)

VERIFICAREA INFORMAȚIILOR LIVE (Google Search):
Ai acces la Google Search ca instrument. FOLOSEȘTE-L când:
- Răspunzi despre o taxă, un termen, sau o sumă concretă unde precizia contează.
- Utilizatorul întreabă despre o schimbare legislativă recentă.
- Trebuie să confirmi numele exact al unui formular (ex: 212, 070, 700).
NU folosi Google Search când întrebarea este conversațională sau ai deja informația în
catalogul de workflow-uri.

CÂND CITEZI DIN SURSE WEB:
- Prefă explicit surse oficiale (.gov.ro, anaf.ro, drpciv.ro, onrc.ro, mai.gov.ro, ancpi.ro).
- Menționează scurt instituția în text ("Conform anaf.ro...") — UI-ul va afișa lista de surse separat.
- Dacă rezultatele Google nu sunt din surse oficiale, marchează asta clar.

FORMAT RĂSPUNSURI:
- Maxim 4 paragrafe scurte.
- Folosește liste cu bullets când enumerezi acte sau pași.
- Termeni românești corecți: "carte de identitate" nu "ID", "permis de conducere" nu "license", "cazier judiciar" nu "criminal record".
- Marchează cu **bold** denumirea instituției și a documentelor cheie.

LIMITĂRI:
- Nu oferi consultanță juridică formală. Pentru spețe complexe, recomandă un avocat sau notar.
- Nu confirma taxe exacte pentru proceduri care variază (ex: impozit auto). Spune "variabil, verifică la ghișeu".
`;
}

// ---------- Session lifecycle ----------

export type ChatSession = {
  /** Underlying SDK chat instance (private — use streamChatMessage). */
  _chat: Chat;
  /** Snapshot of the workflow ids the session was primed with. */
  workflowIds: string[];
};

export type CreateChatSessionOptions = {
  /**
   * Reserved for backward compatibility. This app relies on function
   * calling tools, and current Gemini API constraints reject combining
   * built-in Google Search with function declarations in one request.
   */
  withGoogleSearch?: boolean;
};

export function createChatSession(
  profile: VaultProfile,
  workflows: Workflow[],
  options: CreateChatSessionOptions = {},
): ChatSession {
  if (!isApiKeyConfigured()) {
    throw new Error("VITE_GEMINI_API_KEY is not configured.");
  }

  const { withGoogleSearch = true } = options;

  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey()! });

  const tools: Array<{
    functionDeclarations?: FunctionDeclaration[];
  }> = [{ functionDeclarations: buildTools(workflows) }];

  if (withGoogleSearch) {
    // Intentionally no-op: Google Search cannot be combined with function
    // calling for this key tier/API mode, and function tools are essential
    // for workflow routing + CAEN/ANAF cards.
    console.info("[acteai] google_search disabled: incompatible with function calling");
  }

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: buildSystemInstruction(profile, workflows),
      tools,
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  });

  return { _chat: chat, workflowIds: workflows.map((w) => w.id) };
}

// ---------- Grounding source extraction ----------
export type GroundingSource = {
  title: string;
  uri: string;
  domain: string;
};

function safeDomain(uri: string): string {
  try {
    const u = new URL(uri);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

// ---------- Streaming send ----------

export type StreamEvent =
  | { type: "text"; value: string }
  | {
      type: "function_call";
      name: "open_workflow";
      args: { id: string; reason?: string };
    }
  | {
      type: "function_call";
      name: "list_workflows";
      args: Record<string, never>;
    }
  | {
      type: "function_call";
      name: "verify_cui";
      args: { cui: string };
    }
  | {
      type: "function_call";
      name: "find_caen";
      args: { activitate: string };
    }
  | { type: "sources"; sources: GroundingSource[] };

/**
 * Async generator that streams a Gemini response chunk-by-chunk.
 *
 * Yields `text` events for each token delta and `function_call` events
 * when the model decides to invoke a tool. The caller is responsible for
 * acting on function calls (e.g. navigating to a workflow page).
 */
export async function* streamChatMessage(
  session: ChatSession,
  userMessage: string,
): AsyncGenerator<StreamEvent, void, unknown> {
  const stream = await session._chat.sendMessageStream({
    message: userMessage,
  });

  const seenCalls = new Set<string>();
  const seenSourceUris = new Set<string>();

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      yield { type: "text", value: text };
    }

    const calls = chunk.functionCalls;
    if (calls && calls.length > 0) {
      for (const call of calls) {
        if (!call.name) continue;
        const dedupeKey = `${call.name}:${JSON.stringify(call.args ?? {})}`;
        if (seenCalls.has(dedupeKey)) continue;
        seenCalls.add(dedupeKey);

        if (call.name === "open_workflow") {
          const args = (call.args ?? {}) as { id?: string; reason?: string };
          if (typeof args.id === "string") {
            yield {
              type: "function_call",
              name: "open_workflow",
              args: { id: args.id, reason: args.reason },
            };
          }
        } else if (call.name === "list_workflows") {
          yield {
            type: "function_call",
            name: "list_workflows",
            args: {},
          };
        } else if (call.name === "verify_cui") {
          const args = (call.args ?? {}) as { cui?: string };
          if (typeof args.cui === "string" && args.cui.trim().length >= 2) {
            yield {
              type: "function_call",
              name: "verify_cui",
              args: { cui: args.cui.trim() },
            };
          }
        } else if (call.name === "find_caen") {
          const args = (call.args ?? {}) as { activitate?: string };
          if (typeof args.activitate === "string" && args.activitate.trim().length > 0) {
            yield {
              type: "function_call",
              name: "find_caen",
              args: { activitate: args.activitate.trim() },
            };
          }
        }
      }
    }

    // Grounding metadata appears on the first candidate, usually on the final
    // chunk of a grounded response. Dedupe by URI so re-emits during streaming
    // don't multiply badges.
    const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && groundingChunks.length > 0) {
      const fresh: GroundingSource[] = [];
      for (const gc of groundingChunks) {
        const web = gc.web;
        if (!web?.uri) continue;
        if (seenSourceUris.has(web.uri)) continue;
        seenSourceUris.add(web.uri);
        fresh.push({
          title: web.title ?? safeDomain(web.uri),
          uri: web.uri,
          domain: safeDomain(web.uri),
        });
      }
      if (fresh.length > 0) {
        yield { type: "sources", sources: fresh };
      }
    }
  }
}

// ---------- Regex fallback (safety net) ----------

/**
 * Belt-and-suspenders: if the model forgets to call open_workflow and instead
 * mentions a workflow id verbatim, we can still surface a CTA. Recognizes:
 *   "[[WORKFLOW:car-registration-2nd-hand]]"
 *   "ID: car-registration-2nd-hand"
 *   "workflow car-registration-2nd-hand"
 */
export function extractWorkflowIdFromText(text: string, knownIds: string[]): string | null {
  const marker = /\[\[WORKFLOW:([a-z0-9-]+)\]\]/i.exec(text);
  if (marker && knownIds.includes(marker[1])) return marker[1];

  const lowered = text.toLowerCase();
  for (const id of knownIds) {
    if (lowered.includes(id)) return id;
  }

  const keywordFallbacks: Array<{ id: string; patterns: RegExp[] }> = [
    {
      id: "id-change-relocation",
      patterns: [
        /\b(buletin|carte de identitate|act de identitate|ci)\b/i,
        /(pierdut|furat|expirat|schimb|nou|domicili|mutat|adresa)/i,
      ],
    },
    {
      id: "police-clearance",
      patterns: [/\b(cazier|clearance|antecedente|poli[tț]ie)\b/i],
    },
    {
      id: "foreign-license-exchange",
      patterns: [/(preschimb|schimb).*(permis).*str[ăa]in/i, /foreign.*license/i],
    },
    {
      id: "birth-certificate",
      patterns: [/(certificat.*na[sș]tere|nou.?n[ăa]scut|maternitate|birth certificate)/i],
    },
    {
      id: "civil-marriage",
      patterns: [/(c[ăa]s[ăa]tor|nunt[ăa]|mire|mireas[ăa]|marriage)/i],
    },
    {
      id: "child-state-allowance",
      patterns: [/(aloca[tț]ie|bani.*copil|copil.*bani|child.*allowance)/i],
    },
    {
      id: "building-permit",
      patterns: [/(autoriza[tț]ie.*constru|construire|construit.*cas[ăa]|building.*permit)/i],
    },
    {
      id: "cadastral-registration",
      patterns: [/(intabulare|cadastr|carte.*funciar|ancpi|ocpi)/i],
    },
    {
      id: "pfa-registration",
      patterns: [/(\bpfa\b|persoan[ăa].*fizic[ăa].*autoriz|onrc|caen)/i],
    },
    {
      id: "anaf-declaration",
      patterns: [/(anaf|declara[tț]ie unic[ăa]|impozit|spv|fiscal)/i],
    },
  ];

  for (const fallback of keywordFallbacks) {
    if (!knownIds.includes(fallback.id)) continue;
    if (fallback.patterns.every((pattern) => pattern.test(text))) return fallback.id;
  }

  return null;
}
