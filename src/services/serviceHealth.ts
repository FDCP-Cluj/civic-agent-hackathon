// Real service-health probes for the Romanian public-portal strip on the
// dashboard. Replaces the static mock in `govApiMock.ts`.
//
// Strategy: HTML `<img>` ping against each portal's favicon. Browsers do
// not apply CORS to image loads, so we can detect "the site responds at
// all" without a backend. A short timeout splits operational / degraded /
// outage. This catches "DNS works, server up" — it cannot detect a portal
// that's up but returning errors at the application layer. We document the
// caveat in the popover note.

import type { ServiceHealth, ServiceStatus } from "./govApiMock";

type Probe = {
  service: string;
  url: string; // public landing page (linked from the popover)
  faviconUrl: string;
  note?: string;
};

const PROBES: Probe[] = [
  {
    service: "ANAF SPV",
    url: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/",
    faviconUrl: "https://www.anaf.ro/favicon.ico",
    note: "Spațiul Privat Virtual — depuneri declarații, e-Factura.",
  },
  {
    service: "ONRC portal",
    url: "https://portal.onrc.ro/",
    faviconUrl: "https://portal.onrc.ro/favicon.ico",
    note: "Rezervare denumire, depunere dosare, stadiu dosar.",
  },
  {
    service: "Ghișeul.ro",
    url: "https://www.ghiseul.ro/",
    faviconUrl: "https://www.ghiseul.ro/favicon.ico",
    note: "Plată taxe locale și impozite cu cardul.",
  },
  {
    service: "ANCPI ePay",
    url: "https://epay.ancpi.ro/epay/",
    faviconUrl: "https://epay.ancpi.ro/favicon.ico",
    note: "Extrase de carte funciară, verificare dosare OCPI.",
  },
  {
    service: "DRPCIV",
    url: "https://www.drpciv.ro/",
    faviconUrl: "https://www.drpciv.ro/favicon.ico",
    note: "Programare înmatriculare auto și permis.",
  },
  {
    service: "ePașapoarte",
    url: "https://www.epasapoarte.ro/",
    faviconUrl: "https://www.epasapoarte.ro/favicon.ico",
    note: "Programare cerere pașaport.",
  },
];

const TIMEOUT_OPERATIONAL_MS = 1500;
const TIMEOUT_DEGRADED_MS = 4000;

/** Ping a single favicon with a hard timeout. */
function probeOne(probe: Probe): Promise<ServiceHealth> {
  return new Promise((resolve) => {
    const started = performance.now();
    const img = new Image();
    let finished = false;

    const finalize = (status: ServiceStatus, extraNote?: string) => {
      if (finished) return;
      finished = true;
      img.src = "";
      resolve({
        service: probe.service,
        status,
        note: extraNote ?? probe.note,
        lastChecked: new Date().toISOString(),
        url: probe.url,
      });
    };

    img.onload = () => {
      const elapsed = performance.now() - started;
      if (elapsed > TIMEOUT_OPERATIONAL_MS) {
        finalize("degraded", `${probe.note ?? ""} Răspuns lent (${Math.round(elapsed)}ms).`.trim());
      } else {
        finalize("operational");
      }
    };
    img.onerror = () => {
      finalize("outage", `${probe.note ?? ""} Portalul nu răspunde la ping.`.trim());
    };

    setTimeout(() => {
      const elapsed = performance.now() - started;
      if (elapsed >= TIMEOUT_DEGRADED_MS) {
        finalize("outage", `${probe.note ?? ""} Timeout la ${Math.round(elapsed)}ms.`.trim());
      } else {
        finalize("degraded", `${probe.note ?? ""} Lent (>${TIMEOUT_OPERATIONAL_MS}ms).`.trim());
      }
    }, TIMEOUT_DEGRADED_MS);

    // Cache-buster ensures we don't get a cached 200 from a previous check.
    img.src = `${probe.faviconUrl}?_t=${Date.now()}`;
  });
}

/** Probe every portal in parallel. */
export async function probeServiceHealth(): Promise<ServiceHealth[]> {
  return Promise.all(PROBES.map(probeOne));
}

export const PROBE_TARGETS = PROBES;
