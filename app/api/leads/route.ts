import { NextResponse } from "next/server";
import { syncLeadToMetrics, type LeadPayload } from "@/lib/metrics";

export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (raw.length > 8_000) return NextResponse.json({ error: "Dados muito grandes." }, { status: 413 });
  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(raw); } catch { /* Validation below handles invalid JSON. */ }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (text(body.website, 100)) return NextResponse.json({ ok: true }, { status: 202 });

  const lead: LeadPayload = {
    sourceLeadId: text(body.sourceLeadId, 36),
    name: text(body.name, 180),
    email: text(body.email, 240).toLowerCase(),
    phone: text(body.phone, 40).replace(/\D/g, ""),
    instagram: text(body.instagram, 120).replace(/^@/, ""),
    status: body.status === "completed" ? "completed" : "started",
    pageUrl: text(body.pageUrl, 500),
    referrer: text(body.referrer, 500),
    utmSource: text(body.utmSource, 120),
    utmMedium: text(body.utmMedium, 120),
    utmCampaign: text(body.utmCampaign, 160),
    ...(body.status === "completed" ? { whatsappConsent: body.whatsappConsent === true } : {}),
  };
  if (!uuid.test(lead.sourceLeadId) || !["started", "completed"].includes(String(body.status))) {
    return NextResponse.json({ error: "Identificação do formulário inválida." }, { status: 400 });
  }
  const hasAnswer = [lead.name, lead.email, lead.phone, lead.instagram].some(Boolean);
  if (!hasAnswer) return NextResponse.json({ error: "Nenhum campo preenchido." }, { status: 400 });
  if (lead.status === "completed" && (
    lead.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)
    || lead.phone.length < 10 || lead.phone.length > 13
    || (lead.instagram.length > 0 && !/^[A-Za-z0-9._]{1,30}$/.test(lead.instagram))
    || typeof body.whatsappConsent !== "boolean" || !/^https?:\/\//i.test(lead.pageUrl)
  )) return NextResponse.json({ error: "Revise nome, e-mail e WhatsApp." }, { status: 400 });

  try {
    const leadId = await syncLeadToMetrics(lead);
    return NextResponse.json({ ok: true, leadId }, { status: lead.status === "completed" ? 201 : 200 });
  } catch (error) {
    console.error("[Aquisição ebook] Falha de sincronização:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível registrar seus dados. Tente novamente." }, { status: 502 });
  }
}
