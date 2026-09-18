"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { EBOOK_DELIVERY_REQUEST_TEXT, WHATSAPP_MARKETING_CONSENT_TEXT } from "@/lib/consent";

type Answers = { name: string; email: string; phone: string; instagram: string; whatsappConsent: boolean; website: string };
type Draft = { id: string; answers: Answers; updatedAt: number; completed?: boolean };
type SyncState = "idle" | "sending" | "registered" | "failed";

const STORAGE_KEY = "x5-ebook-aquisicao-draft-v1";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const empty: Answers = { name: "", email: "", phone: "", instagram: "", whatsappConsent: false, website: "" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!uuid.test(parsed.id || "") || typeof parsed.updatedAt !== "number" || Date.now() - parsed.updatedAt > MAX_AGE || !parsed.answers) return null;
    const answers: Answers = { ...empty };
    for (const key of ["name", "email", "phone", "instagram", "website"] as const) {
      if (typeof parsed.answers[key] === "string") answers[key] = parsed.answers[key];
    }
    answers.whatsappConsent = parsed.answers.whatsappConsent === true;
    return { id: parsed.id!, answers, updatedAt: parsed.updatedAt, completed: parsed.completed === true };
  } catch { return null; }
}

function storeDraft(id: string, answers: Answers, completed = false) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, answers, updatedAt: Date.now(), completed })); } catch { /* Network sync still works. */ }
}

function hasAnswer(answers: Answers) {
  return [answers.name, answers.email, answers.phone, answers.instagram].some(value => value.trim());
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function payload(answers: Answers, id: string, status: "started" | "completed") {
  const params = new URLSearchParams(window.location.search);
  return {
    ...answers,
    sourceLeadId: id,
    status,
    pageUrl: window.location.href,
    referrer: document.referrer,
    utmSource: params.get("utm_source") || "ebook_aquisicao_clientes",
    utmMedium: params.get("utm_medium") || "site",
    utmCampaign: params.get("utm_campaign") || "ebook_27_avenidas",
    ...(status === "started" ? { whatsappConsent: undefined } : {}),
  };
}

function validate(answers: Answers) {
  const errors: Record<string, string> = {};
  if (answers.name.trim().length < 2) errors.name = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) errors.email = "Informe um e-mail válido.";
  if (answers.phone.replace(/\D/g, "").length < 10) errors.phone = "Informe seu WhatsApp com DDD.";
  if (!/^@?[A-Za-z0-9._]{1,30}$/.test(answers.instagram.trim())) errors.instagram = "Informe seu @ do Instagram.";
  return errors;
}

export function LeadForm() {
  const [answers, setAnswers] = useState<Answers>(empty);
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const idRef = useRef("");
  const answersRef = useRef<Answers>(empty);
  const submittedRef = useRef(false);
  const activeSaveRef = useRef<Promise<void> | null>(null);
  const pendingSaveRef = useRef<Answers | null>(null);
  const lastSavedRef = useRef("");
  const retryTimerRef = useRef<number | null>(null);
  const retrySaveRef = useRef<() => void>(() => undefined);

  const leadId = useCallback(() => {
    if (!idRef.current) idRef.current = crypto.randomUUID();
    return idRef.current;
  }, []);

  const savePartial = useCallback((snapshot: Answers): Promise<void> => {
    if (!hasAnswer(snapshot) || submittedRef.current) return activeSaveRef.current || Promise.resolve();
    const id = leadId();
    storeDraft(id, snapshot);
    const signature = JSON.stringify(snapshot);
    if (signature === lastSavedRef.current && !activeSaveRef.current) return Promise.resolve();
    pendingSaveRef.current = snapshot;
    if (activeSaveRef.current) return activeSaveRef.current;

    const task = (async () => {
      while (pendingSaveRef.current && !submittedRef.current) {
        const next = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (JSON.stringify(next) === lastSavedRef.current) continue;
        try {
          const response = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload(next, id, "started")),
            keepalive: true,
          });
          if (!response.ok) throw new Error("Falha ao salvar o rascunho.");
          lastSavedRef.current = JSON.stringify(next);
        } catch {
          if (!pendingSaveRef.current) pendingSaveRef.current = next;
          if (retryTimerRef.current === null) {
            retryTimerRef.current = window.setTimeout(() => {
              retryTimerRef.current = null;
              retrySaveRef.current();
            }, 5000);
          }
          break;
        }
      }
    })();
    activeSaveRef.current = task;
    void task.finally(() => { activeSaveRef.current = null; }).catch(() => undefined);
    return task;
  }, [leadId]);

  useEffect(() => {
    retrySaveRef.current = () => { void savePartial(answersRef.current).catch(() => undefined); };
  }, [savePartial]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readDraft();
      if (draft) {
        idRef.current = draft.id;
        answersRef.current = draft.answers;
        setAnswers(draft.answers);
        if (draft.completed) {
          submittedRef.current = true;
          setSubmitted(true);
          setSyncState("registered");
        }
      } else leadId();
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [leadId]);

  useEffect(() => {
    if (!ready || submitted || !hasAnswer(answers)) return;
    const timer = window.setTimeout(() => { void savePartial(answers).catch(() => undefined); }, 650);
    return () => window.clearTimeout(timer);
  }, [answers, ready, submitted, savePartial]);

  useEffect(() => {
    const retry = () => { if (!submittedRef.current) void savePartial(answersRef.current).catch(() => undefined); };
    const flush = () => {
      if (submittedRef.current || !hasAnswer(answersRef.current)) return;
      navigator.sendBeacon("/api/leads", new Blob([JSON.stringify(payload(answersRef.current, leadId(), "started"))], { type: "application/json" }));
    };
    window.addEventListener("online", retry);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("pagehide", flush);
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    };
  }, [leadId, savePartial]);

  function update<K extends keyof Answers>(field: K, value: Answers[K]) {
    const next = { ...answersRef.current, [field]: value };
    answersRef.current = next;
    setAnswers(next);
    if (ready) storeDraft(leadId(), next);
    if (errors[field]) setErrors(current => ({ ...current, [field]: "" }));
  }

  async function sendCompleted(snapshot: Answers) {
    setSyncState("sending");
    try {
      await activeSaveRef.current?.catch(() => undefined);
      pendingSaveRef.current = null;
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(snapshot, leadId(), "completed")),
        keepalive: true,
      });
      if (!response.ok) throw new Error("Cadastro não confirmado.");
      storeDraft(leadId(), snapshot, true);
      setSyncState("registered");
    } catch { setSyncState("failed"); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = answersRef.current;
    const nextErrors = validate(snapshot);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    submittedRef.current = true;
    setSubmitted(true);
    void sendCompleted(snapshot);
  }

  if (submitted) return (
    <section className="success-panel" aria-live="polite">
      <div className="success-icon" aria-hidden="true">✓</div>
      <p className="section-kicker">{syncState === "failed" ? "PRECISAMOS DE MAIS UM PASSO" : "PEDIDO RECEBIDO"}</p>
      <h2>{syncState === "failed" ? "Não conseguimos registrar seu pedido." : <>Seu guia está quase pronto<span>.</span></>}</h2>
      <p className="success-copy">O guia <strong>27 Avenidas para Aquisição de Clientes</strong> reúne canais, ações iniciais, métricas e um plano de 14 dias para sua clínica.</p>
      {syncState === "sending" && <p className="sync-status" role="status"><span className="status-spinner" /> Registrando seu pedido…</p>}
      {syncState === "failed" && <div className="sync-status" role="alert">Seus dados ficaram salvos neste navegador. <button type="button" onClick={() => void sendCompleted(answersRef.current)}>Tentar novamente</button></div>}
      {syncState === "registered" && <>
        <a className="primary-button download-button" href="/27-avenidas-aquisicao-clientes.pdf" download><span>BAIXAR EBOOK AGORA</span><span className="button-arrow" aria-hidden="true">↓</span></a>
        <p className="delivery-note">Também registramos seu pedido para receber o material pelo WhatsApp informado.</p>
      </>}
    </section>
  );

  return (
    <form className="lead-form" onSubmit={submit} onBlur={() => { void savePartial(answersRef.current).catch(() => undefined); }} noValidate>
      <p className="section-kicker">GUIA PRÁTICO GRATUITO</p>
      <h2>Encontre o próximo canal para <strong>atrair pacientes<span>.</span></strong></h2>
      <p className="form-intro">Preencha seus dados para receber o guia com 27 avenidas de aquisição, métricas para acompanhar e um plano de ação de 14 dias.</p>
      <div className="fields">
        <label className="field" htmlFor="name"><span>Nome completo <b>*</b></span><input id="name" name="name" autoComplete="name" placeholder="Seu nome completo" maxLength={180} value={answers.name} onChange={event => update("name", event.target.value)} aria-invalid={!!errors.name} /><small className="field-error">{errors.name}</small></label>
        <label className="field" htmlFor="email"><span>E-mail <b>*</b></span><input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" maxLength={240} value={answers.email} onChange={event => update("email", event.target.value)} aria-invalid={!!errors.email} /><small className="field-error">{errors.email}</small></label>
        <label className="field" htmlFor="phone"><span>WhatsApp com DDD <b>*</b></span><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={answers.phone} onChange={event => update("phone", formatPhone(event.target.value))} aria-invalid={!!errors.phone} /><small className="field-error">{errors.phone}</small></label>
        <label className="field" htmlFor="instagram"><span>Qual o @ do Instagram? <b>*</b></span><input id="instagram" name="instagram" autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder="@seuperfil" maxLength={120} value={answers.instagram} onChange={event => update("instagram", event.target.value)} aria-invalid={!!errors.instagram} /><small className="field-error">{errors.instagram}</small></label>
      </div>
      <div className="consent-block"><input id="whatsapp-consent" type="checkbox" checked={answers.whatsappConsent} onChange={event => update("whatsappConsent", event.target.checked)} /><label htmlFor="whatsapp-consent">{WHATSAPP_MARKETING_CONSENT_TEXT}</label></div>
      <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={answers.website} onChange={event => update("website", event.target.value)} /></label>
      <button className="primary-button" type="submit"><span>RECEBER EBOOK GRATUITO</span><span className="button-arrow" aria-hidden="true">→</span></button>
      <p className="delivery-note">{EBOOK_DELIVERY_REQUEST_TEXT}</p>
    </form>
  );
}
