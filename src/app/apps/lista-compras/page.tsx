"use client";

import { useState } from "react";
import Adsense from "@/components/Adsense";

type Item = {
  id: number;
  name: string;
  done: boolean;
};

export default function ListaComprasPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: input.trim(), done: false },
    ]);
    setInput("");
  };

  const toggleItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Lista de Compras</h1>
        <p className="text-sm text-neutral-300">
          Organize os itens do mercado de forma simples.
        </p>
      </header>

      <Adsense slot="SEU_AD_SLOT_LISTA" className="mb-4" />

      <section className="border border-neutral-800 rounded-lg p-4 bg-neutral-950/60 space-y-4 text-sm">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Adicionar item (ex: Arroz 5kg)"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 outline-none focus:border-emerald-500"
          />
          <button
            onClick={addItem}
            className="px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 font-medium hover:bg-emerald-400 transition"
          >
            Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-neutral-500 text-xs">
              Nenhum item ainda. Comece adicionando o que precisa comprar.
            </p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border border-neutral-800 rounded-md px-3 py-2 bg-neutral-950"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="flex-1 text-left text-sm"
              >
                <span
                  className={
                    item.done
                      ? "line-through text-neutral-500"
                      : "text-neutral-100"
                  }
                >
                  {item.name}
                </span>
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      <Adsense slot="SEU_AD_SLOT_LISTA_FOOTER" className="mt-4" />
    </div>
  );
}
