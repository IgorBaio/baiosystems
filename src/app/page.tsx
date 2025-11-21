"use client";

import Link from "next/link";
import { useState } from "react";

type Language = "pt" | "en";
type LocalizedString = {
  pt: string;
  en: string;
};

type Experience = {
  company: string;
  role: LocalizedString;
  area: LocalizedString;
  period: LocalizedString;
  stack: string[];
  description: LocalizedString;
};

type Education = {
  school: string;
  course: LocalizedString;
  period: LocalizedString;
};

const heroHeadline: LocalizedString = {
  pt: "Desenvolvedor Fullstack - React - React Native - Java - Golang",
  en: "Fullstack Developer - React - React Native - Java - Golang",
};

const heroObjective: LocalizedString = {
  pt: "Meu objetivo e fazer um excelente trabalho em equipe, causar impacto real para a empresa e seus clientes e, assim, evoluir constantemente minha carreira profissional. Atuo desde 2019 em squads multidisciplinares construindo produtos de alta disponibilidade para pagamentos, saude e eficiencia operacional.",
  en: "My goal is to excel in team work, drive impact for companies and their customers, and keep evolving my professional career. Since 2019 I have been part of multidisciplinary squads delivering high availability products for payments, healthcare, and operational efficiency.",
};

const heroButtons = {
  hub: { pt: "Ver hub de apps", en: "See apps hub" },
  contact: { pt: "Fale comigo", en: "Contact me" },
};

const sectionTitles = {
  experience: { pt: "Experiencias recentes", en: "Recent experience" },
  education: { pt: "Formacao academica", en: "Education" },
  hardSkills: { pt: "Habilidades tecnicas", en: "Technical skills" },
  softSkills: { pt: "Habilidades comportamentais", en: "Soft skills" },
  apps: { pt: "Apps em destaque", en: "Featured apps" },
};

const experiences: Experience[] = [
  {
    company: "Mercado Livre",
    role: { pt: "Software Engineer", en: "Software Engineer" },
    area: { pt: "Desenvolvedor Backend", en: "Backend Developer" },
    period: { pt: "Ago 2024 - atual", en: "Aug 2024 - present" },
    stack: ["Java", "Spring", "Golang"],
    description: {
      pt: "Atuo em squads de pagamentos construindo microservicos em Java/Spring e Golang, com foco em integracoes financeiras, resiliencia e escalabilidade.",
      en: "Part of the payments squads delivering microservices in Java/Spring and Golang, focused on financial integrations, resilience, and scalability.",
    },
  },
  {
    company: "Compass.UOL",
    role: { pt: "Desenvolvedor Pleno", en: "Mid-level Developer" },
    area: { pt: "Desenvolvedor Fullstack", en: "Fullstack Developer" },
    period: { pt: "Out 2021 - Ago 2024", en: "Oct 2021 - Aug 2024" },
    stack: [
      "React Native",
      "Redux-Saga",
      "React",
      "TypeScript",
      "Java",
      "Spring",
      "AWS Lambda",
    ],
    description: {
      pt: "Lideranca tecnica em apps moveis e backends serverless, entregando features com React Native, Redux/Zustand e APIs em Java/Spring hospedadas na AWS.",
      en: "Provided technical leadership for mobile apps and serverless backends, shipping features with React Native, Redux/Zustand, and Java/Spring APIs running on AWS.",
    },
  },
  {
    company: "Doctuz",
    role: { pt: "Desenvolvedor Junior", en: "Junior Developer" },
    area: { pt: "Desenvolvedor Mobile e Web", en: "Mobile and Web Developer" },
    period: { pt: "Mai 2021 - Set 2021", en: "May 2021 - Sep 2021" },
    stack: ["React Native", "Redux", "React"],
    description: {
      pt: "Criei modulos hibridos para apps de saude e dashboards web que apoiavam equipes medicas.",
      en: "Delivered hybrid modules for healthcare apps and supporting web dashboards for medical teams.",
    },
  },
  {
    company: "Deode Inovacao e Eficiencia",
    role: { pt: "Desenvolvedor Junior", en: "Junior Developer" },
    area: { pt: "Desenvolvedor Mobile", en: "Mobile Developer" },
    period: { pt: "Dez 2020 - Mai 2021", en: "Dec 2020 - May 2021" },
    stack: ["React Native", "Redux"],
    description: {
      pt: "Desenvolvimento de aplicativos corporativos para otimizar processos de campo.",
      en: "Built corporate mobile applications to streamline field operations.",
    },
  },
  {
    company: "Thomson Reuters",
    role: { pt: "Trainee", en: "Trainee" },
    area: { pt: "Desenvolvedor Web Crawler", en: "Web Crawler Developer" },
    period: { pt: "Ago 2019 - Nov 2020", en: "Aug 2019 - Nov 2020" },
    stack: ["C#", ".NET", "Python", "Azure DevOps"],
    description: {
      pt: "Construcao de robos de coleta de dados juridicos e pipelines de processamento em nuvem.",
      en: "Built legal data crawlers and cloud processing pipelines.",
    },
  },
];

const education: Education[] = [
  {
    school: "IF Sudeste MG",
    course: {
      pt: "Bacharelado em Sistemas de Informacao",
      en: "Bachelor in Information Systems",
    },
    period: { pt: "2018 - 2022", en: "2018 - 2022" },
  },
  {
    school: "Descomplica",
    course: {
      pt: "Pos em Projetos de Aplicativos Moveis Multiplataforma",
      en: "Postgraduate in Multi-platform Mobile App Projects",
    },
    period: { pt: "Abr 2022 - Dez 2022", en: "Apr 2022 - Dec 2022" },
  },
  {
    school: "Descomplica",
    course: {
      pt: "MBA em Seguranca da Informacao",
      en: "MBA in Information Security",
    },
    period: { pt: "Mai 2022 - Dez 2022", en: "May 2022 - Dec 2022" },
  },
];

const hardSkills = [
  "React",
  "React Native",
  "Next.js",
  "TypeScript",
  "Golang",
  "Java",
  "Spring",
  "Node.js",
  "AWS",
  "Serverless",
  "PostgreSQL",
  "Docker",
  "Jest",
  "CI/CD",
];

const softSkills: LocalizedString[] = [
  { pt: "Proativo", en: "Proactive" },
  { pt: "Lideranca de time", en: "Team leadership" },
  { pt: "Foco em solucao", en: "Solution oriented" },
];

const featuredApps = [
  {
    title: { pt: "Jogos de Loteria", en: "Lottery Games" },
    description: {
      pt: "Gere combinacoes de numeros para diferentes loterias.",
      en: "Generate number combinations for different lotteries.",
    },
    href: "/apps/jogos-loteria",
  },
  {
    title: { pt: "Controle Financeiro", en: "Finance Tracker" },
    description: {
      pt: "Planeje gastos fixos e variaveis com insights automaticos.",
      en: "Plan fixed and variable expenses with automatic insights.",
    },
    href: "/apps/controle-financeiro",
  },
  {
    title: { pt: "Consumo de Veiculo", en: "Vehicle Consumption" },
    description: {
      pt: "Calcule autonomia real e custo por quilometro.",
      en: "Calculate real autonomy and cost per kilometer.",
    },
    href: "/apps/consumo-veiculo",
  },
  {
    title: { pt: "Lista de Compras", en: "Shopping List" },
    description: {
      pt: "Organize itens, quantidades e orcamentos por categoria.",
      en: "Organize items, quantities, and budgets by category.",
    },
    href: "/apps/lista-compras",
  },
];

const appsDescription: LocalizedString = {
  pt: "Hub com ferramentas que desenvolvo para praticar conceitos e ajudar no dia a dia.",
  en: "A hub with tools I build to practice ideas and help everyday tasks.",
};

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("pt");

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-neutral-800 bg-neutral-950/60 p-1 text-xs">
          {(["pt", "en"] as Language[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLanguage(option)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                language === option ? "bg-emerald-500 text-neutral-950" : "text-neutral-300 hover:text-neutral-100"
              }`}
              aria-pressed={language === option}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-6 shadow-lg shadow-black/40">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">
            Igor Baio Soares
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {heroHeadline[language]}
          </h1>
          <p className="text-sm text-neutral-400">
            {language === "pt" ? "Telefone:" : "Phone:"}{" "}
            <a href="tel:+5532999742701" className="text-neutral-200">
              +55 (32) 99974-2701
            </a>{" "}
            - Email:{" "}
            <a href="mailto:igorbaiosoares@gmail.com" className="text-neutral-200">
              igorbaiosoares@gmail.com
            </a>
          </p>
        </div>
        <p className="text-sm text-neutral-300 sm:text-base">{heroObjective[language]}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/apps"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            {heroButtons.hub[language]}
          </Link>
          <a
            href="mailto:igorbaiosoares@gmail.com"
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-emerald-500 hover:text-emerald-300"
          >
            {heroButtons.contact[language]}
          </a>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        <div className="space-y-4">
          <SectionTitle>{sectionTitles.experience[language]}</SectionTitle>
          <div className="space-y-4 text-sm text-neutral-300">
            {experiences.map((experience) => (
              <article
                key={`${experience.company}-${experience.period.pt}`}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{experience.period[language]}</span>
                  <span className="text-neutral-700">-</span>
                  <span>{experience.area[language]}</span>
                </div>
                <h3 className="text-base font-semibold text-neutral-100">
                  {experience.role[language]} - {experience.company}
                </h3>
                <p className="mt-2 text-sm">{experience.description[language]}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-neutral-400">
                  {experience.stack.map((tech) => (
                    <span key={tech} className="rounded-full border border-neutral-800 px-2 py-0.5">
                      {tech}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
            <SectionTitle>{sectionTitles.education[language]}</SectionTitle>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              {education.map((item) => (
                <div key={item.school+item.course[language === "pt" ? "pt" : "en"]}>
                  <p className="font-medium text-neutral-100">{item.school}</p>
                  <p>{item.course[language]}</p>
                  <p className="text-xs text-neutral-500">{item.period[language]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
            <SectionTitle>{sectionTitles.hardSkills[language]}</SectionTitle>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-100">
              {hardSkills.map((skill) => (
                <span key={skill} className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/50 p-5">
            <SectionTitle>{sectionTitles.softSkills[language]}</SectionTitle>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-300">
              {softSkills.map((skill) => (
                <li key={skill.pt}>{skill[language]}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>{sectionTitles.apps[language]}</SectionTitle>
        <p className="text-sm text-neutral-300">{appsDescription[language]}</p>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          {featuredApps.map((app) => (
            <CardPreview
              key={app.href}
              title={app.title[language]}
              description={app.description[language]}
              href={app.href}
              ctaLabel={language === "pt" ? "Abrir app ->" : "Open app ->"}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-neutral-100 tracking-wide">
      {children}
    </h2>
  );
}

type CardProps = { title: string; description: string; href: string; ctaLabel: string };

function CardPreview({ title, description, href, ctaLabel }: CardProps) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-neutral-800 bg-neutral-950/60 p-4 transition hover:-translate-y-0.5 hover:border-emerald-500"
    >
      <h3 className="mb-1 font-medium">{title}</h3>
      <p className="mb-2 text-xs text-neutral-400">{description}</p>
      <span className="text-xs text-emerald-400">{ctaLabel}</span>
    </a>
  );
}
