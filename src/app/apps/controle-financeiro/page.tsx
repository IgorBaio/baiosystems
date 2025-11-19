import Adsense from "@/components/Adsense";

export default function ControleFinanceiroPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Controle Financeiro</h1>
        <p className="text-sm text-neutral-300">
          Em breve: seu app de controle financeiro integrado aqui.
        </p>
      </header>

      <Adsense slot="SEU_AD_SLOT_FINANCEIRO" className="mb-4" />

      <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-950/60 text-sm text-neutral-300">
        {/* Aqui você cola seu componente React do controle financeiro */}
        <p>
          Substitua este bloco pelo seu componente de controle financeiro já existente.
        </p>
      </div>
    </div>
  );
}
