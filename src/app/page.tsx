import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <p className="text-sm text-emerald-400 uppercase tracking-[0.2em]">
          Desenvolvedor Backend & Fullstack
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Igor Baio •{" "}
          <span className="text-neutral-400">Baio Systems</span>
        </h1>
        <p className="text-neutral-300 max-w-2xl text-sm sm:text-base">
          Sou desenvolvedor especializado em Go, Java e React, com foco em
          construção de aplicações escaláveis, APIs robustas e experiências
          web/mobile de alta performance. Este site é meu currículo vivo e um
          hub dos apps utilitários que eu construo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/apps"
            className="px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 transition"
          >
            Ver Hub de Apps
          </Link>
          <a
            href="mailto:seu-email@baiosystems.com.br"
            className="px-4 py-2 rounded-md border border-neutral-700 text-sm hover:border-emerald-500 hover:text-emerald-300 transition"
          >
            Fale comigo
          </a>
        </div>
      </section>

      {/* Experiência */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Experiência</h2>
        <div className="space-y-3 text-sm text-neutral-300">
          <div>
            <p className="font-medium">
              Backend Developer • <span className="text-neutral-100">Mercado Livre</span>
            </p>
            <p className="text-xs text-neutral-500">
              Ago 2024 — atual
            </p>
            <p>
              Desenvolvimento de serviços em Go/Java, integrações com serviços
              financeiros, mensageria e arquitetura distribuída.
            </p>
          </div>
          {/* adicione outras experiências aqui */}
        </div>
      </section>

      {/* Skills */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tecnologias</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            "Golang",
            "Java / Spring",
            "React / Next.js",
            "TypeScript",
            "AWS",
            "DynamoDB",
            "PostgreSQL",
            "Docker",
          ].map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-200"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* Hub preview */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Apps em destaque</h2>
        <p className="text-sm text-neutral-300">
          Uma coleção de ferramentas simples e úteis para o dia a dia.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <CardPreview
            title="Jogos de Loteria"
            description="Gere combinações de números para diferentes loterias."
            href="/apps/jogos-loteria"
          />
          <CardPreview
            title="Controle Financeiro"
            description="Registre entradas, saídas e acompanhe o saldo."
            href="/apps/controle-financeiro"
          />
        </div>
      </section>
    </div>
  );
}

type CardProps = { title: string; description: string; href: string };

function CardPreview({ title, description, href }: CardProps) {
  return (
    <a
      href={href}
      className="block border border-neutral-800 rounded-lg p-4 hover:border-emerald-500 hover:-translate-y-0.5 transition bg-neutral-950/60"
    >
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-neutral-400 text-xs mb-2">{description}</p>
      <span className="text-emerald-400 text-xs">Abrir app →</span>
    </a>
  );
}
