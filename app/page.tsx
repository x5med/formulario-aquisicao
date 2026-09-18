import Image from "next/image";
import { LeadForm } from "@/components/lead-form";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="brand-panel" aria-labelledby="page-title">
        <div className="brand-grid" aria-hidden="true" />
        <div className="brand-glow" aria-hidden="true" />
        <div className="brand-inner">
          <header className="brand-header">
            <Image src="/x5-logo-branca.png" alt="X5 Med" width={639} height={445} priority className="brand-logo" />
            <span className="header-label">X5 MED · GUIA PARA CLÍNICAS</span>
          </header>

          <div className="brand-main">
            <div className="brand-copy">
              <p className="eyebrow"><span /> DA AULA PARA A PRÁTICA</p>
              <h1 id="page-title">27 avenidas para <em>aquisição de clientes.</em></h1>
              <p className="brand-lead">Diversifique a origem dos pacientes e escolha o próximo canal a testar com método.</p>
              <p className="brand-description">Um mapa prático com ações iniciais, métricas para acompanhar e um plano de 14 dias para sua clínica sair da lista de ideias e entrar em ação.</p>
              <div className="topic-row" aria-label="O que você encontra no ebook">
                <span>Indicação</span><span>Digital</span><span>Parcerias</span><span>Reativação</span>
              </div>
            </div>
            <div className="book-stage">
              <Image src="/ebook-cover.png" alt="Capa do guia 27 Avenidas para Aquisição de Clientes da X5 Med" width={853} height={1200} priority className="book-image" />
              <span className="book-shadow" aria-hidden="true" />
            </div>
          </div>

          <footer className="brand-footer"><span /> CONTEÚDO ADAPTADO DA AULA DE PATRÍCIO DARWISON</footer>
        </div>
      </section>

      <section className="form-panel" aria-label="Cadastro para receber o ebook de aquisição de clientes">
        <div className="form-inner">
          <div className="form-topline"><span>EBOOK GRATUITO</span><span>ENVIO PELO WHATSAPP</span></div>
          <LeadForm />
          <p className="privacy-note">Seus dados registram o pedido do ebook. A autorização para outras mensagens pelo WhatsApp é opcional. <a href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade ↗</a></p>
        </div>
      </section>
    </main>
  );
}
