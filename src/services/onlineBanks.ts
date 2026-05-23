// Curated list of Romanian banks for PFA / IMM accounts. Ported from
// civic-agent-buian `agent.functions.ts:ONLINE_BANKS`.
//
// `fullyOnline` means the entire onboarding can be completed without a
// branch visit; the rest require at least one in-person or video step.

export type OnlineBank = {
  name: string;
  url: string;
  note: string;
  fullyOnline: boolean;
};

export const ONLINE_BANKS: OnlineBank[] = [
  {
    name: "Revolut Business",
    url: "https://www.revolut.com/business/",
    note: "Cont multi-valutar, deschidere 100% online cu CI + CUI.",
    fullyOnline: true,
  },
  {
    name: "Salt Bank",
    url: "https://salt.bank/business",
    note: "Cont PFA/SRL deschis din aplicație, fără vizită în sucursală.",
    fullyOnline: true,
  },
  {
    name: "ING Business",
    url: "https://www.ing.ro/imm",
    note: "Cont PFA cu programare online; semnare prin video sau în sucursală.",
    fullyOnline: false,
  },
  {
    name: "Banca Transilvania",
    url: "https://www.bancatransilvania.ro/companii/cont-online",
    note: "Pre-deschidere online, finalizare cu vizită la sucursală.",
    fullyOnline: false,
  },
  {
    name: "Raiffeisen Bank",
    url: "https://www.raiffeisen.ro/ro/imm.html",
    note: "Cerere online pentru IMM/PFA, semnare în sucursală.",
    fullyOnline: false,
  },
  {
    name: "Libra Internet Bank",
    url: "https://contonline.librabank.ro/home/",
    note: "Cont PFA cu onboarding parțial online.",
    fullyOnline: false,
  },
];
