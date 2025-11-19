"use client";

import { useEffect, useMemo, useState } from "react";
import Adsense from "@/components/Adsense";

type BasePreset = {
  id: string;
  label: string;
  hint?: string;
  defaultValue?: number;
};

type Category = {
  id: string;
  label: string;
  hint?: string;
  amount: number;
};

type CustomExpense = {
  id: string;
  name: string;
  amount: number;
};

type PersistedState = {
  monthlyIncome?: number;
  savingsGoal?: number;
  fixedExpenses?: Category[];
  variableExpenses?: Category[];
  customExpenses?: CustomExpense[];
};

const STORAGE_KEY = "controle-financeiro-state-v1";

const FIXED_PRESETS: BasePreset[] = [
  {
    id: "moradia",
    label: "Moradia",
    hint: "Aluguel, financiamento, condominio, IPTU",
    defaultValue: 0,
  },
  {
    id: "energia",
    label: "Energia / Gas",
    hint: "Conta de luz e gas",
    defaultValue: 0,
  },
  {
    id: "agua",
    label: "Agua",
    hint: "Agua, saneamento, coleta de lixo",
    defaultValue: 0,
  },
  {
    id: "internet",
    label: "Internet / Telefonia",
    hint: "Internet, telefone, TV e streaming",
    defaultValue: 0,
  },
  {
    id: "alimentacao",
    label: "Alimentacao basica",
    hint: "Supermercado, feira e hortifruti",
    defaultValue: 0,
  },
  {
    id: "transporte",
    label: "Transporte fixo",
    hint: "Parcelas de veiculo, passes e aplicativos",
    defaultValue: 0,
  },
];

const VARIABLE_PRESETS: BasePreset[] = [
  {
    id: "lazer",
    label: "Lazer & restaurantes",
    hint: "Cinema, delivery, bares, shows",
    defaultValue: 0,
  },
  {
    id: "educacao",
    label: "Educacao",
    hint: "Cursos, livros, mensalidades",
    defaultValue: 0,
  },
  {
    id: "saude",
    label: "Saude",
    hint: "Consultas, remedios, academia",
    defaultValue: 0,
  },
  {
    id: "pets",
    label: "Pets",
    hint: "Racao, banho e tosa, veterinario",
    defaultValue: 0,
  },
  {
    id: "viagens",
    label: "Viagens / reservas",
    hint: "Fundos para ferias e deslocamentos",
    defaultValue: 0,
  },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const buildCategories = (presets: BasePreset[]): Category[] =>
  presets.map((entry) => ({
    id: entry.id,
    label: entry.label,
    hint: entry.hint,
    amount: entry.defaultValue ?? 0,
  }));

const getSafeAmount = (value: number) =>
  Number.isFinite(value) && value >= 0 ? value : 0;

const mergeCategoryState = (presets: BasePreset[], stored?: Category[]) => {
  const base = buildCategories(presets);
  if (!Array.isArray(stored)) return base;
  const storedMap = new Map(
    stored
      .filter(
        (item): item is Category =>
          Boolean(item) && typeof item.id === "string" && Number.isFinite(Number(item.amount)),
      )
      .map((item) => [item.id, getSafeAmount(Number(item.amount))]),
  );
  return base.map((category) => ({
    ...category,
    amount: storedMap.get(category.id) ?? category.amount,
  }));
};

const sanitizeCustomExpenses = (entries?: CustomExpense[]) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(
      (entry): entry is CustomExpense =>
        Boolean(entry) &&
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        entry.name.trim().length > 0 &&
        Number.isFinite(Number(entry.amount)),
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name.trim(),
      amount: getSafeAmount(Number(entry.amount)),
    }))
    .filter((entry) => entry.amount > 0);
};

export default function ControleFinanceiroPage() {
  const [monthlyIncome, setMonthlyIncome] = useState(4500);
  const [savingsGoal, setSavingsGoal] = useState(500);
  const [fixedExpenses, setFixedExpenses] = useState<Category[]>(() =>
    buildCategories(FIXED_PRESETS),
  );
  const [variableExpenses, setVariableExpenses] = useState<Category[]>(() =>
    buildCategories(VARIABLE_PRESETS),
  );
  const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([]);
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((total, item) => total + item.amount, 0),
    [fixedExpenses],
  );
  const totalVariable = useMemo(
    () => variableExpenses.reduce((total, item) => total + item.amount, 0),
    [variableExpenses],
  );
  const totalCustom = useMemo(
    () => customExpenses.reduce((total, item) => total + item.amount, 0),
    [customExpenses],
  );

  const totalExpenses = totalFixed + totalVariable + totalCustom;
  const remaining = monthlyIncome - totalExpenses;
  const percentSpent =
    monthlyIncome > 0 ? Math.min(100, (totalExpenses / monthlyIncome) * 100) : 0;

  const recommendedNeeds = monthlyIncome * 0.5;
  const recommendedWants = monthlyIncome * 0.3;
  const recommendedInvestments = monthlyIncome * 0.2;

  const updateCategoryValue = (
    setter: React.Dispatch<React.SetStateAction<Category[]>>,
    id: string,
    amount: number,
  ) => {
    setter((prev) =>
      prev.map((category) =>
        category.id === id ? { ...category, amount: getSafeAmount(amount) } : category,
      ),
    );
  };

  const handleCustomSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(customAmount.replace(",", "."));
    if (!customName.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomExpenses((prev) => [
      ...prev,
      { id, name: customName.trim(), amount: parsedAmount },
    ]);
    setCustomName("");
    setCustomAmount("");
  };

  const removeCustomExpense = (id: string) => {
    setCustomExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const persisted: PersistedState = JSON.parse(raw);
      if (typeof persisted.monthlyIncome === "number") {
        setMonthlyIncome(getSafeAmount(persisted.monthlyIncome));
      }
      if (typeof persisted.savingsGoal === "number") {
        setSavingsGoal(getSafeAmount(persisted.savingsGoal));
      }
      if (persisted.fixedExpenses) {
        setFixedExpenses(mergeCategoryState(FIXED_PRESETS, persisted.fixedExpenses));
      }
      if (persisted.variableExpenses) {
        setVariableExpenses(mergeCategoryState(VARIABLE_PRESETS, persisted.variableExpenses));
      }
      if (persisted.customExpenses) {
        setCustomExpenses(sanitizeCustomExpenses(persisted.customExpenses));
      }
    } catch {
      // silencioso
    } finally {
      setHasLoadedPersistedState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState || typeof window === "undefined") return;
    const payload: PersistedState = {
      monthlyIncome,
      savingsGoal,
      fixedExpenses,
      variableExpenses,
      customExpenses,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // silencioso
    }
  }, [
    hasLoadedPersistedState,
    monthlyIncome,
    savingsGoal,
    fixedExpenses,
    variableExpenses,
    customExpenses,
  ]);

  const insights: { title: string; content: string }[] = [];
  if (totalFixed > recommendedNeeds) {
    insights.push({
      title: "Necessidades acima do ideal",
      content:
        "Renegocie contratos de moradia, telefonia ou energia para aproximar as despesas fixas do limite de 50% da renda.",
    });
  }
  if (totalVariable + totalCustom > recommendedWants) {
    insights.push({
      title: "Gastos de qualidade de vida no limite",
      content:
        "Ajuste lazer, restaurantes e compras impulsivas para nao comprometer a meta de poupanca.",
    });
  }
  if (remaining < savingsGoal) {
    insights.push({
      title: "Meta de reserva nao atingida",
      content:
        "Revise o planejamento ou reduza despesas ate liberar o valor reservado para investimentos.",
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">
          Inspirado na CalculadoraGastosHtml
        </p>
        <h1 className="text-3xl font-semibold">Controle Financeiro</h1>
        <p className="text-sm leading-relaxed text-neutral-300">
          Evolucao em React/Next da Calculadora de Gastos: cadastre despesas fixas, variaveis e
          extras, acompanhe o consumo da renda e receba alertas automaticos para manter a regra
          50/30/20 equilibrada.
        </p>
      </header>

      <Adsense slot="SEU_AD_SLOT_FINANCEIRO" className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 shadow-xl shadow-black/30">
            <h2 className="mb-4 text-lg font-semibold">Configuracoes do mes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-neutral-300">
                <span>Renda mensal</span>
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={monthlyIncome}
                  onChange={(event) => setMonthlyIncome(getSafeAmount(event.target.valueAsNumber))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-base"
                />
              </label>
              <label className="space-y-2 text-sm text-neutral-300">
                <span>Meta de reserva / investimentos</span>
                <input
                  type="number"
                  min={0}
                  step="50"
                  value={savingsGoal}
                  onChange={(event) => setSavingsGoal(getSafeAmount(event.target.valueAsNumber))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-base"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 shadow-xl shadow-black/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Despesas fixas</h2>
                <p className="text-sm text-neutral-400">
                  Campos classicos da CalculadoraGastosHtml para contas essenciais.
                </p>
              </div>
              <span className="text-sm font-medium text-emerald-400">
                {currency.format(totalFixed)}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2 text-left font-medium">Categoria</th>
                    <th className="py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {fixedExpenses.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <p className="font-medium">{item.label}</p>
                        {item.hint && <p className="text-xs text-neutral-500">{item.hint}</p>}
                      </td>
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={item.amount}
                          onChange={(event) =>
                            updateCategoryValue(
                              setFixedExpenses,
                              item.id,
                              getSafeAmount(event.target.valueAsNumber),
                            )
                          }
                          className="w-32 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 shadow-xl shadow-black/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Despesas variaveis</h2>
                <p className="text-sm text-neutral-400">
                  Itens ajustaveis: lazer, educacao, saude, pets e viagens.
                </p>
              </div>
              <span className="text-sm font-medium text-sky-400">
                {currency.format(totalVariable)}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2 text-left font-medium">Categoria</th>
                    <th className="py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-200">
                  {variableExpenses.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <p className="font-medium">{item.label}</p>
                        {item.hint && <p className="text-xs text-neutral-500">{item.hint}</p>}
                      </td>
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={item.amount}
                          onChange={(event) =>
                            updateCategoryValue(
                              setVariableExpenses,
                              item.id,
                              getSafeAmount(event.target.valueAsNumber),
                            )
                          }
                          className="w-32 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-5 shadow-inner shadow-black/30">
            <h2 className="text-lg font-semibold">Lancamentos extras</h2>
            <p className="mb-4 text-sm text-neutral-400">
              Adicione gastos que nao estavam no modelo original (assinaturas, compras pontuais,
              manutencao etc.).
            </p>
            <form className="grid gap-3 md:grid-cols-[2fr,1fr,auto]" onSubmit={handleCustomSubmit}>
              <input
                type="text"
                placeholder="Descricao"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="5"
                placeholder="Valor"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
              >
                Adicionar
              </button>
            </form>

            {customExpenses.length > 0 && (
              <ul className="mt-4 space-y-2">
                {customExpenses.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      <span className="text-neutral-400">{currency.format(expense.amount)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomExpense(expense.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold">Resumo do mes</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Total de despesas</span>
                <strong>{currency.format(totalExpenses)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Disponivel</span>
                <strong className={remaining >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {currency.format(remaining)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Meta de reserva</span>
                <strong>{currency.format(savingsGoal)}</strong>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{percentSpent.toFixed(0)}% da renda usada</span>
                <span>
                  restante {currency.format(Math.max(remaining, 0))} / meta {currency.format(savingsGoal)}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-900">
                <div
                  className={`h-full rounded-full ${percentSpent > 90 ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${percentSpent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-neutral-400">
                {remaining >= savingsGoal
                  ? "Planejamento dentro da meta para reservas e investimentos."
                  : "Ajuste gastos para liberar mais saldo para investir neste mes."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold">Distribuicao 50/30/20</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between border-b border-neutral-900 pb-2">
                <div>
                  <p className="font-medium">Necessidades (&lt;= 50%)</p>
                  <p className="text-xs text-neutral-500">
                    Recomendado {currency.format(recommendedNeeds)}
                  </p>
                </div>
                <strong className={totalFixed > recommendedNeeds ? "text-red-400" : "text-emerald-400"}>
                  {currency.format(totalFixed)}
                </strong>
              </li>
              <li className="flex items-center justify-between border-b border-neutral-900 pb-2">
                <div>
                  <p className="font-medium">Qualidade de vida (&lt;= 30%)</p>
                  <p className="text-xs text-neutral-500">
                    Recomendado {currency.format(recommendedWants)}
                  </p>
                </div>
                <strong
                  className={
                    totalVariable + totalCustom > recommendedWants ? "text-yellow-300" : "text-emerald-400"
                  }
                >
                  {currency.format(totalVariable + totalCustom)}
                </strong>
              </li>
              <li className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Investimentos (&gt;= 20%)</p>
                  <p className="text-xs text-neutral-500">
                    Recomendado {currency.format(recommendedInvestments)}
                  </p>
                </div>
                <strong className={remaining >= recommendedInvestments ? "text-emerald-400" : "text-red-400"}>
                  {currency.format(Math.max(remaining, 0))}
                </strong>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/40 p-5 shadow-inner shadow-black/30">
            <h2 className="text-lg font-semibold">Alertas inteligentes</h2>
            {insights.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                Tudo equilibrado! Continue alimentando os dados para manter o acompanhamento em dia.
              </p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {insights.map((insight) => (
                  <li
                    key={insight.title}
                    className="rounded-lg border border-neutral-900 bg-neutral-900/70 px-3 py-2"
                  >
                    <p className="font-medium text-amber-300">{insight.title}</p>
                    <p className="text-neutral-400">{insight.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
