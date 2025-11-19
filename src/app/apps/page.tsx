import Link from "next/link";

const apps = [
  {
    slug: "jogos-loteria",
    name: "Jogos de Loteria",
    description: "Gere jogos para diferentes modalidades de loteria.",
  },
  {
    slug: "controle-financeiro",
    name: "Controle Financeiro",
    description: "Gerencie entradas, saídas e acompanhe seu saldo.",
  },
  {
    slug: "lista-compras",
    name: "Lista de Compras",
    description: "Monte listas de compras de mercado simples e rápidas.",
  },
  {
    slug: "consumo-veiculo",
    name: "Consumo de Veículo",
    description: "Calcule o consumo médio do seu carro.",
  },
];

export default function AppsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Hub de Apps</h1>
        <p className="text-sm text-neutral-300">
          Coleção de aplicativos utilitários criados por mim. Todos rodam direto no navegador.
        </p>
      </header>
      <div className="grid sm:grid-cols-2 gap-4">
        {apps.map((app) => (
          <Link
            key={app.slug}
            href={`/apps/${app.slug}`}
            className="border border-neutral-800 rounded-lg p-4 hover:border-emerald-500 hover:-translate-y-0.5 transition bg-neutral-950/60"
          >
            <h2 className="font-medium">{app.name}</h2>
            <p className="text-xs text-neutral-400 mt-1">{app.description}</p>
            <span className="text-emerald-400 text-xs inline-block mt-2">
              Abrir app →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
