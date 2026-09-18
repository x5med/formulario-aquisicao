import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://formulario-aquisicao.vercel.app"),
  title: "27 Avenidas para Aquisição de Clientes | X5 Med",
  description: "Receba gratuitamente o guia prático com 27 canais para atrair pacientes, ações iniciais, métricas e um plano de 14 dias para sua clínica.",
  openGraph: {
    title: "27 Avenidas para Aquisição de Clientes",
    description: "Um mapa prático para diversificar a origem dos pacientes da sua clínica.",
    images: ["/ebook-cover.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={sora.variable}>{children}</body></html>;
}
