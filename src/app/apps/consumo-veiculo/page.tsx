"use client";

import { useState } from "react";
import Adsense from "@/components/Adsense";

export default function ConsumoVeiculoPage() {
  const [km, setKm] = useState("");
  const [litros, setLitros] = useState("");
  const [resultado, setResultado] = useState<number | null>(null);

  const calcular = () => {
    const k = parseFloat(km.replace(",", "."));
    const l = parseFloat(litros.replace(",", "."));
    if (!k || !l) {
      setResultado(null);
      return;
    }
    setResultado(k / l);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          Calculadora de Consumo de Veículo
        </h1>
        <p className="text-sm text-neutral-300">
          Informe a distância percorrida e a quantidade de combustível para
          descobrir o consumo médio.
        </p>
      </header>

      <Adsense slot="SEU_AD_SLOT_CONSUMO" className="mb-4" />

      <section className="border border-neutral-800 rounded-lg p-4 bg-neutral-950/60 space-y-4 text-sm">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Distância percorrida (km)</label>
            <input
              value={km}
              onChange={(e) => setKm(e.target.value)}
              type="text"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Combustível gasto (L)</label>
            <input
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              type="text"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={calcular}
              className="w-full px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 font-medium hover:bg-emerald-400 transition"
            >
              Calcular
            </button>
          </div>
        </div>

        {resultado && (
          <p className="text-sm text-neutral-200">
            Consumo médio:{" "}
            <span className="font-semibold text-emerald-400">
              {resultado.toFixed(2)} km/L
            </span>
          </p>
        )}
      </section>

      <Adsense slot="SEU_AD_SLOT_CONSUMO_FOOTER" className="mt-4" />
    </div>
  );
}
