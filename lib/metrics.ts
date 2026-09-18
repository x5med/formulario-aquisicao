import { EBOOK_DELIVERY_REQUEST_TEXT, WHATSAPP_MARKETING_CONSENT_TEXT } from "@/lib/consent";

const DEFAULT_URL = "https://metrics.x5med.com.br/api/endomax/integrations/aquisicao-ebook";

export type LeadPayload = {
  sourceLeadId: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  status: "started" | "completed";
  pageUrl: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  whatsappConsent?: boolean;
};

export async function syncLeadToMetrics(lead: LeadPayload) {
  const key = process.env.METRICS_EBOOK_INGEST_KEY?.trim();
  if (!key) throw new Error("METRICS_EBOOK_INGEST_KEY não configurada.");
  const endpoint = process.env.METRICS_EBOOK_INGEST_URL || DEFAULT_URL;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-aquisicao-ebook-key": key },
    body: JSON.stringify({
      ...lead,
      ...(lead.status === "completed" ? {
        formSubmissionId: lead.sourceLeadId,
        consentText: WHATSAPP_MARKETING_CONSENT_TEXT,
        deliveryRequestText: EBOOK_DELIVERY_REQUEST_TEXT,
      } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Metrics recusou o cadastro (${response.status}).`);
  const result = await response.json() as { ok?: boolean; leadId?: string };
  if (!result.ok || !result.leadId) throw new Error("Metrics não confirmou o cadastro.");
  return result.leadId;
}
