"use client";

import { useState } from "react";
import Adsense from "@/components/Adsense";

type GameType = "lotofacil" | "megasena";

const CONFIG: Record<
  GameType,
  { label: string; total: number; pick: number }
> = {
  lotofacil: { label: "Lotofácil", total: 25, pick: 15 },
  megasena: { label: "Mega-Sena", total: 60, pick: 6 },
};

function generateGame(total: number, pick: number): number[] {
  const nums = new Set<number>();
  while (nums.size < pick) {
    nums.add(Math.floor(Math.random() * total) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

export default function JogosLoteriaPage() {
  const [gameType, setGameType] = useState<GameType>("lotofacil");
  const [qtd, setQtd] = useState(5);
  const [results, setResults] = useState<number[][]>([]);

  const handleGenerate = () => {
    const cfg = CONFIG[gameType];
    const all: number[][] = [];
    for (let i = 0; i < qtd; i++) {
      all.push(generateGame(cfg.total, cfg.pick));
    }
    setResults(all);
  };

  const cfg = CONFIG[gameType];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Jogos de Loteria</h1>
        <p className="text-sm text-neutral-300">
          Gere combinações aleatórias de números para Lotofácil e Mega-Sena.
          <br />
          <span className="text-xs text-neutral-500">
            Uso apenas recreativo. Isto não garante resultados reais.
          </span>
        </p>
      </header>

      {/* Anúncio no topo do app */}
      {/* <Adsense slot="SEU_AD_SLOT_JOGOS" className="mb-4" /> */}

      <section className="border border-neutral-800 rounded-lg p-4 space-y-4 bg-neutral-950/60">
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <label className="block text-xs text-neutral-400">Tipo de jogo</label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value as GameType)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {Object.entries(CONFIG).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500">
              {cfg.pick} números dentre {cfg.total} disponíveis.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-neutral-400">Quantidade de jogos</label>
            <input
              type="number"
              min={1}
              max={50}
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-neutral-500">
              Limite de 50 jogos por vez.
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="w-full px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 transition"
            >
              Gerar jogos
            </button>
          </div>
        </div>
      </section>

      {results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-200">
            {results.length} jogo(s) gerado(s)
          </h2>
          <div className="space-y-2 text-sm">
            {results.map((game, index) => (
              <div
                key={index}
                className="flex flex-wrap gap-1 border border-neutral-800 rounded-md px-3 py-2 bg-neutral-950/60"
              >
                <span className="text-xs text-neutral-500 mr-2">
                  Jogo {index + 1}:
                </span>
                {game.map((num) => (
                  <span
                    key={num}
                    className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-xs"
                  >
                    {num.toString().padStart(2, "0")}
                  </span>
                ))}
              </div>
            ))}
          </div>
      </section>
      )}

      {/* Anúncio no rodapé do app */}
      {/* <Adsense slot="SEU_AD_SLOT_JOGOS_FOOTER" className="mt-4" /> */}
    </div>
  );
}
