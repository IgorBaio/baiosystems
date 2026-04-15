"use client";

import { toBlob, toPng } from "html-to-image";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Beer,
  Clock3,
  Download,
  Flame,
  Gauge,
  GlassWater,
  LineChart,
  Play,
  Plus,
  Save,
  Share2,
  ShieldAlert,
  StopCircle,
  Trash2,
  Trophy,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Drink = {
  id: string;
  name: string;
  category: string;
  abv: number;
  defaultVolumeMl: number;
  unitName: string;
};

type SessionEvent = {
  id: string;
  cupNumber: number;
  createdAt: string;
};

type ActiveSession = {
  id: string;
  name: string;
  drink: Drink;
  startedAt: string;
  events: SessionEvent[];
};

type Session = ActiveSession & {
  endedAt: string;
};

type PersistedState = {
  drinks?: Drink[];
  sessions?: Session[];
  activeSession?: ActiveSession | null;
};

type SessionMetrics = {
  durationSeconds: number;
  totalCups: number;
  cupsPerHour: number;
  cupsPerMinute: number;
  avgTimePerCupSeconds: number | null;
  totalVolumeMl: number;
  totalAlcoholMl: number;
  shortestIntervalSeconds: number | null;
  longestIntervalSeconds: number | null;
  peakCupsPerHour: number;
  splits: SplitMetric[];
};

type SplitMetric = {
  index: number;
  label: string;
  cups: number;
  accumulatedCups: number;
  cupsPerHour: number;
};

type Feedback = {
  tone: "error" | "success";
  message: string;
};

const STORAGE_KEY = "brewing-pace-state-v1";

const DEFAULT_DRINKS: Drink[] = [
  {
    id: "drink-beer-can",
    name: "Cerveja lata",
    category: "Cerveja",
    abv: 5,
    defaultVolumeMl: 350,
    unitName: "lata",
  },
  {
    id: "drink-long-neck",
    name: "Long neck",
    category: "Cerveja",
    abv: 4.8,
    defaultVolumeMl: 330,
    unitName: "garrafa",
  },
  {
    id: "drink-wine-glass",
    name: "Vinho tinto",
    category: "Vinho",
    abv: 12,
    defaultVolumeMl: 150,
    unitName: "taça",
  },
  {
    id: "drink-whisky-dose",
    name: "Whisky",
    category: "Destilado",
    abv: 40,
    defaultVolumeMl: 50,
    unitName: "dose",
  },
  {
    id: "drink-gin-tonic",
    name: "Gin tônica",
    category: "Drink",
    abv: 18,
    defaultVolumeMl: 250,
    unitName: "copo",
  },
];

const DEFAULT_DRINK_IDS = new Set(DEFAULT_DRINKS.map((drink) => drink.id));

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sanitizeNumberInput = (value: string) => value.replace(/[^\d.,]/g, "");

const parseLocaleNumber = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatInputNumber = (value: number) =>
  value.toString().replace(".", ",");

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, secs]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  }

  return [minutes, secs]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

const formatCupace = (secondsPerCup: number | null) => {
  if (!secondsPerCup || !Number.isFinite(secondsPerCup)) {
    return "--:-- / copo";
  }

  return `${formatDuration(secondsPerCup)} / copo`;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const getDurationSeconds = (startedAt: string, endedAt?: string) =>
  Math.max(
    0,
    Math.floor(
      (new Date(endedAt ?? new Date().toISOString()).getTime() -
        new Date(startedAt).getTime()) /
        1000,
    ),
  );

const buildSessionMetrics = (
  session: ActiveSession | Session,
  referenceNow?: number,
): SessionMetrics => {
  const endedAt =
    "endedAt" in session
      ? session.endedAt
      : new Date(referenceNow ?? Date.now()).toISOString();
  const durationSeconds = getDurationSeconds(session.startedAt, endedAt);
  const totalCups = session.events.length;
  const cupsPerHour =
    totalCups > 0 && durationSeconds > 0 ? totalCups / (durationSeconds / 3600) : 0;
  const cupsPerMinute =
    totalCups > 0 && durationSeconds > 0 ? totalCups / (durationSeconds / 60) : 0;
  const avgTimePerCupSeconds =
    totalCups > 0 && durationSeconds > 0 ? durationSeconds / totalCups : null;
  const totalVolumeMl = totalCups * session.drink.defaultVolumeMl;
  const totalAlcoholMl = totalVolumeMl * (session.drink.abv / 100);

  const intervals = session.events
    .slice(1)
    .map((event, index) => {
      const previous = session.events[index];
      return Math.floor(
        (new Date(event.createdAt).getTime() - new Date(previous.createdAt).getTime()) /
          1000,
      );
    })
    .filter((value) => value > 0);

  const splitWindowSeconds = 15 * 60;
  const splitCount = Math.max(1, Math.ceil(Math.max(durationSeconds, 1) / splitWindowSeconds));
  const eventOffsets = session.events.map((event) =>
    Math.max(
      0,
      Math.floor(
        (new Date(event.createdAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
      ),
    ),
  );

  let accumulatedCups = 0;
  const splits = Array.from({ length: splitCount }, (_, index) => {
    const rangeStart = index * splitWindowSeconds;
    const rangeEnd = Math.min(durationSeconds, (index + 1) * splitWindowSeconds);
    const segmentDuration = Math.max(1, rangeEnd - rangeStart);
    const cups = eventOffsets.filter(
      (offset) => offset > rangeStart && offset <= rangeEnd,
    ).length;
    accumulatedCups += cups;

    return {
      index: index + 1,
      label: `${formatDuration(rangeStart)}-${formatDuration(rangeEnd)}`,
      cups,
      accumulatedCups,
      cupsPerHour: cups > 0 ? cups / (segmentDuration / 3600) : 0,
    };
  });

  return {
    durationSeconds,
    totalCups,
    cupsPerHour,
    cupsPerMinute,
    avgTimePerCupSeconds,
    totalVolumeMl,
    totalAlcoholMl,
    shortestIntervalSeconds:
      intervals.length > 0 ? Math.min(...intervals) : null,
    longestIntervalSeconds:
      intervals.length > 0 ? Math.max(...intervals) : null,
    peakCupsPerHour:
      splits.length > 0 ? Math.max(...splits.map((split) => split.cupsPerHour)) : 0,
    splits,
  };
};

const getFavoriteDrink = (sessions: Session[]) => {
  const counts = new Map<string, number>();

  sessions.forEach((session) => {
    const current = counts.get(session.drink.name) ?? 0;
    counts.set(session.drink.name, current + 1);
  });

  let winner = "";
  let highestCount = 0;
  counts.forEach((count, name) => {
    if (count > highestCount) {
      winner = name;
      highestCount = count;
    }
  });

  return winner || "Sem histórico";
};

const buildSessionSummaryText = (session: Session, metrics: SessionMetrics) =>
  [
    "Brewing Pace",
    `${session.name} · ${session.drink.name}`,
    `Início: ${formatDateTime(session.startedAt)}`,
    `Fim: ${formatDateTime(session.endedAt)}`,
    `Duração: ${formatDuration(metrics.durationSeconds)}`,
    `Total de copos: ${metrics.totalCups}`,
    `Cupace: ${formatCupace(metrics.avgTimePerCupSeconds)}`,
    `Copos por hora: ${numberFormatter.format(metrics.cupsPerHour)}`,
    `Copos por minuto: ${numberFormatter.format(metrics.cupsPerMinute)}`,
    `Volume total: ${numberFormatter.format(metrics.totalVolumeMl)} ml`,
    `Álcool puro estimado: ${numberFormatter.format(metrics.totalAlcoholMl)} ml`,
    `Menor intervalo: ${
      metrics.shortestIntervalSeconds
        ? formatDuration(metrics.shortestIntervalSeconds)
        : "--:--"
    }`,
    `Maior intervalo: ${
      metrics.longestIntervalSeconds
        ? formatDuration(metrics.longestIntervalSeconds)
        : "--:--"
    }`,
    `Pico de ritmo: ${numberFormatter.format(metrics.peakCupsPerHour)} copos/h`,
  ].join("\n");

const isMobileDevice = () => {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const mobileByUa =
    /android|iphone|ipad|ipod|mobile|windows phone/.test(userAgent);

  return mobileByUa || coarsePointer;
};

const sanitizeDrink = (value: unknown): Drink | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Drink>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.category !== "string" ||
    typeof candidate.unitName !== "string"
  ) {
    return null;
  }

  const abv = Number(candidate.abv);
  const defaultVolumeMl = Number(candidate.defaultVolumeMl);

  if (!Number.isFinite(abv) || !Number.isFinite(defaultVolumeMl)) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    category: candidate.category.trim(),
    abv: Math.max(0, abv),
    defaultVolumeMl: Math.max(1, defaultVolumeMl),
    unitName: candidate.unitName.trim(),
  };
};

const sanitizeEvent = (value: unknown): SessionEvent | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SessionEvent>;

  if (typeof candidate.id !== "string" || typeof candidate.createdAt !== "string") {
    return null;
  }

  const cupNumber = Number(candidate.cupNumber);
  if (!Number.isFinite(cupNumber) || cupNumber < 1) {
    return null;
  }

  return {
    id: candidate.id,
    cupNumber: Math.floor(cupNumber),
    createdAt: candidate.createdAt,
  };
};

const sanitizeActiveSession = (value: unknown): ActiveSession | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ActiveSession>;
  const drink = sanitizeDrink(candidate.drink);

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.startedAt !== "string" ||
    !drink
  ) {
    return null;
  }

  const events = Array.isArray(candidate.events)
    ? candidate.events
        .map((entry) => sanitizeEvent(entry))
        .filter((entry): entry is SessionEvent => Boolean(entry))
    : [];

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    drink,
    startedAt: candidate.startedAt,
    events,
  };
};

const sanitizeSession = (value: unknown): Session | null => {
  const active = sanitizeActiveSession(value);
  if (!active || !value || typeof value !== "object") return null;
  const endedAt = (value as Partial<Session>).endedAt;
  if (typeof endedAt !== "string") return null;
  return {
    ...active,
    endedAt,
  };
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-neutral-50">{title}</h2>
        {description ? (
          <p className="text-sm text-neutral-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "emerald",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  tone?: "emerald" | "amber" | "rose" | "sky";
}) {
  const toneClasses = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-neutral-900/70 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`rounded-2xl border p-2 ${toneClasses[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-neutral-50">{value}</p>
      {helper ? <p className="mt-1 text-xs text-neutral-500">{helper}</p> : null}
    </div>
  );
}

function SplitChart({ splits }: { splits: SplitMetric[] }) {
  const maxCups = Math.max(...splits.map((split) => split.cups), 1);

  return (
    <div className="space-y-3">
      {splits.map((split) => (
        <div key={split.label} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>{split.label}</span>
            <span>
              {split.cups} copos · {numberFormatter.format(split.cupsPerHour)} copos/h
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400"
              style={{ width: `${Math.max(8, (split.cups / maxCups) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BrewingPacePage() {
  const [drinks, setDrinks] = useState<Drink[]>(DEFAULT_DRINKS);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedDrinkId, setSelectedDrinkId] = useState(DEFAULT_DRINKS[0].id);
  const [sessionName, setSessionName] = useState("Sessão de hoje");
  const [drinkName, setDrinkName] = useState(DEFAULT_DRINKS[0].name);
  const [drinkCategory, setDrinkCategory] = useState(DEFAULT_DRINKS[0].category);
  const [abvInput, setAbvInput] = useState(formatInputNumber(DEFAULT_DRINKS[0].abv));
  const [volumeInput, setVolumeInput] = useState(
    formatInputNumber(DEFAULT_DRINKS[0].defaultVolumeMl),
  );
  const [unitName, setUnitName] = useState(DEFAULT_DRINKS[0].unitName);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [now, setNow] = useState(Date.now());
  const summarySnapshotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHasHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as PersistedState;
      const safeDrinks = Array.isArray(parsed.drinks)
        ? parsed.drinks
            .map((entry) => sanitizeDrink(entry))
            .filter((entry): entry is Drink => Boolean(entry))
        : [];
      const safeSessions = Array.isArray(parsed.sessions)
        ? parsed.sessions
            .map((entry) => sanitizeSession(entry))
            .filter((entry): entry is Session => Boolean(entry))
        : [];
      const safeActiveSession = sanitizeActiveSession(parsed.activeSession);

      const initialDrinks = safeDrinks.length > 0 ? safeDrinks : DEFAULT_DRINKS;
      const initialDrink = initialDrinks[0];

      setDrinks(initialDrinks);
      setSessions(
        safeSessions.sort(
          (left, right) =>
            new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime(),
        ),
      );
      setActiveSession(safeActiveSession);
      setSelectedSessionId(safeSessions[0]?.id ?? null);
      setSelectedDrinkId(initialDrink.id);
      setDrinkName(initialDrink.name);
      setDrinkCategory(initialDrink.category);
      setAbvInput(formatInputNumber(initialDrink.abv));
      setVolumeInput(formatInputNumber(initialDrink.defaultVolumeMl));
      setUnitName(initialDrink.unitName);
    } catch {
      // ignore malformed local storage
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        drinks,
        sessions,
        activeSession,
      } satisfies PersistedState),
    );
  }, [activeSession, drinks, hasHydrated, sessions]);

  useEffect(() => {
    if (!activeSession) return;
    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeSession]);

  const orderedSessions = [...sessions].sort(
    (left, right) =>
      new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime(),
  );
  const selectedSession =
    orderedSessions.find((session) => session.id === selectedSessionId) ??
    orderedSessions[0] ??
    null;
  const activeMetrics = activeSession ? buildSessionMetrics(activeSession, now) : null;
  const selectedMetrics = selectedSession ? buildSessionMetrics(selectedSession) : null;
  const totalCupsHistory = orderedSessions.reduce(
    (total, session) => total + session.events.length,
    0,
  );
  const totalAlcoholHistory = orderedSessions.reduce((total, session) => {
    const metrics = buildSessionMetrics(session);
    return total + metrics.totalAlcoholMl;
  }, 0);
  const bestCupaceSession = orderedSessions
    .map((session) => ({
      session,
      metrics: buildSessionMetrics(session),
    }))
    .filter((entry) => entry.metrics.avgTimePerCupSeconds !== null)
    .sort(
      (left, right) =>
        (left.metrics.avgTimePerCupSeconds ?? Number.MAX_SAFE_INTEGER) -
        (right.metrics.avgTimePerCupSeconds ?? Number.MAX_SAFE_INTEGER),
    )[0];
  const strongestSession = orderedSessions
    .map((session) => ({
      session,
      metrics: buildSessionMetrics(session),
    }))
    .sort((left, right) => right.metrics.cupsPerHour - left.metrics.cupsPerHour)[0];
  const comparisonSession =
    selectedSession &&
    (orderedSessions.find(
      (session) =>
        session.id !== selectedSession.id &&
        session.drink.name === selectedSession.drink.name,
    ) ??
      orderedSessions.find((session) => session.id !== selectedSession.id));
  const comparisonMetrics = comparisonSession
    ? buildSessionMetrics(comparisonSession)
    : null;
  const draftAbv = parseLocaleNumber(abvInput);
  const draftVolume = parseLocaleNumber(volumeInput);

  const applyDrinkDraft = (drink: Drink) => {
    setSelectedDrinkId(drink.id);
    setDrinkName(drink.name);
    setDrinkCategory(drink.category);
    setAbvInput(formatInputNumber(drink.abv));
    setVolumeInput(formatInputNumber(drink.defaultVolumeMl));
    setUnitName(drink.unitName);
    setFeedback(null);
  };

  const buildDraftDrink = (): Drink | null => {
    const abv = parseLocaleNumber(abvInput);
    const volume = parseLocaleNumber(volumeInput);

    if (!drinkName.trim()) {
      setFeedback({ tone: "error", message: "Informe o nome da bebida." });
      return null;
    }

    if (!unitName.trim()) {
      setFeedback({ tone: "error", message: "Informe a unidade do consumo." });
      return null;
    }

    if (abv <= 0 || volume <= 0) {
      setFeedback({
        tone: "error",
        message: "Teor alcoólico e volume precisam ser maiores que zero.",
      });
      return null;
    }

    return {
      id: selectedDrinkId,
      name: drinkName.trim(),
      category: drinkCategory.trim() || "Personalizada",
      abv,
      defaultVolumeMl: volume,
      unitName: unitName.trim(),
    };
  };

  const handleDrinkSave = () => {
    const draft = buildDraftDrink();
    if (!draft) return;

    const shouldUpdateCustomDrink =
      selectedDrinkId &&
      drinks.some((drink) => drink.id === selectedDrinkId) &&
      !DEFAULT_DRINK_IDS.has(selectedDrinkId);

    if (shouldUpdateCustomDrink) {
      setDrinks((previous) =>
        previous.map((drink) => (drink.id === draft.id ? draft : drink)),
      );
      setFeedback({
        tone: "success",
        message: `Bebida "${draft.name}" atualizada na sua biblioteca.`,
      });
      return;
    }

    const nextDrink = { ...draft, id: createId() };
    setDrinks((previous) => [nextDrink, ...previous]);
    setSelectedDrinkId(nextDrink.id);
    setFeedback({
      tone: "success",
      message: `Bebida "${nextDrink.name}" salva para as próximas sessões.`,
    });
  };

  const handleDrinkRemove = (drinkId: string) => {
    if (DEFAULT_DRINK_IDS.has(drinkId)) return;

    const fallbackDrink = drinks.find((drink) => drink.id !== drinkId) ?? DEFAULT_DRINKS[0];
    setDrinks((previous) => previous.filter((drink) => drink.id !== drinkId));

    if (selectedDrinkId === drinkId) {
      applyDrinkDraft(fallbackDrink);
    }

    setFeedback({ tone: "success", message: "Bebida removida da biblioteca." });
  };

  const handleSessionStart = () => {
    if (activeSession) {
      setFeedback({
        tone: "error",
        message: "Já existe uma sessão em andamento. Finalize antes de iniciar outra.",
      });
      return;
    }

    const draft = buildDraftDrink();
    if (!draft) return;

    const nextSession: ActiveSession = {
      id: createId(),
      name: sessionName.trim() || `${draft.name} session`,
      drink: { ...draft },
      startedAt: new Date().toISOString(),
      events: [],
    };

    setActiveSession(nextSession);
    setNow(Date.now());
    setFeedback({
      tone: "success",
      message: `Sessão "${nextSession.name}" iniciada.`,
    });
  };

  const handleCupIncrement = () => {
    if (!activeSession) return;

    const nextCupNumber = activeSession.events.length + 1;
    const nextEvent: SessionEvent = {
      id: createId(),
      cupNumber: nextCupNumber,
      createdAt: new Date().toISOString(),
    };

    setActiveSession({
      ...activeSession,
      events: [...activeSession.events, nextEvent],
    });
  };

  const handleUndoCup = () => {
    if (!activeSession || activeSession.events.length === 0) return;

    setActiveSession({
      ...activeSession,
      events: activeSession.events.slice(0, -1),
    });
  };

  const handleSessionFinish = () => {
    if (!activeSession) return;

    const finishedSession: Session = {
      ...activeSession,
      endedAt: new Date().toISOString(),
    };

    setSessions((previous) =>
      [finishedSession, ...previous].sort(
        (left, right) =>
          new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime(),
      ),
    );
    setActiveSession(null);
    setSelectedSessionId(finishedSession.id);
    setFeedback({
      tone: "success",
      message: `Resumo da sessão "${finishedSession.name}" gerado com sucesso.`,
    });
  };

  const handleShareSession = async () => {
    if (!selectedSession || !selectedMetrics || typeof window === "undefined") return;

    const shareText = buildSessionSummaryText(selectedSession, selectedMetrics);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Brewing Pace · ${selectedSession.name}`,
          text: shareText,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setFeedback({
        tone: "success",
        message: "Resumo copiado para a área de transferência.",
      });
    } catch {
      setFeedback({
        tone: "error",
        message: "Não foi possível compartilhar o resumo desta sessão.",
      });
    }
  };

  const handleSaveSession = async () => {
    if (
      !selectedSession ||
      !selectedMetrics ||
      !summarySnapshotRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      const safeName = selectedSession.name
        .toLowerCase()
        .replace(/[^\w-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fileName = `${safeName || "brewing-pace-session"}.png`;
      const mobileDevice = isMobileDevice();

      if (mobileDevice && navigator.share) {
        const blob = await toBlob(summarySnapshotRef.current, {
          cacheBust: true,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          backgroundColor: "#050816",
        });

        if (!blob) {
          throw new Error("snapshot generation failed");
        }

        const imageFile = new File([blob], fileName, { type: "image/png" });

        try {
          await navigator.share({
            title: `Brewing Pace · ${selectedSession.name}`,
            text: "Imagem do resumo da sessão",
            files: [imageFile],
          });
          setFeedback({
            tone: "success",
            message:
              "Imagem enviada para o menu do sistema. Escolha Fotos/Galeria para guardar fora do app Arquivos.",
          });
          return;
        } catch {
          const url = window.URL.createObjectURL(blob);
          window.open(url, "_blank", "noopener,noreferrer");
          window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
          setFeedback({
            tone: "success",
            message:
              "Imagem aberta em nova aba. No celular, use salvar imagem ou compartilhar para Fotos/Galeria.",
          });
          return;
        }
      }

      const dataUrl = await toPng(summarySnapshotRef.current, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: "#050816",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        tone: "success",
        message: "Resumo baixado como imagem PNG.",
      });
    } catch {
      setFeedback({
        tone: "error",
        message: "Não foi possível gerar a imagem do resumo.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(244,63,94,0.16),_transparent_30%),linear-gradient(135deg,_rgba(10,10,10,0.96),_rgba(23,23,23,0.92))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute -right-16 top-6 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-amber-300">
                Brewing Pace
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                O Strava da sua sessão, com cupace, splits e histórico local.
              </h1>
              <p className="text-sm leading-6 text-neutral-300">
                Configure a bebida, inicie o cronômetro, marque cada copo concluído e
                acompanhe métricas em tempo real. O estado fica salvo no navegador,
                inclusive a sessão ativa.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-lg">
              <MetricCard
                icon={Activity}
                label="Sessões"
                value={numberFormatter.format(orderedSessions.length)}
                helper="histórico total"
                tone="amber"
              />
              <MetricCard
                icon={Beer}
                label="Copos"
                value={numberFormatter.format(totalCupsHistory)}
                helper="registrados até agora"
                tone="rose"
              />
              <MetricCard
                icon={Trophy}
                label="Melhor Cupace"
                value={
                  bestCupaceSession
                    ? formatCupace(bestCupaceSession.metrics.avgTimePerCupSeconds)
                    : "--:-- / copo"
                }
                helper={bestCupaceSession?.session.name ?? "sem sessão concluída"}
                tone="emerald"
              />
              <MetricCard
                icon={Flame}
                label="Álcool Estimado"
                value={`${numberFormatter.format(totalAlcoholHistory)} ml`}
                helper="somando todas as sessões"
                tone="sky"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                As métricas são estimativas recreativas baseadas nos seus toques e na
                configuração da bebida. Não servem como medição clínica ou decisão de
                segurança.
              </p>
            </div>
          </div>

          {feedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                feedback.tone === "error"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
        </div>
      </section>

      <SectionCard
        title={activeSession ? "Cockpit da sessão" : "Central da sessão"}
        description="A configuração e a corrida acontecem no mesmo fluxo visual. No desktop, a operação fica concentrada lado a lado."
      >
        <div className="grid gap-6 2xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/70 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                    Setup
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-neutral-50">
                    Configure a sessão
                  </h3>
                </div>
                {activeSession ? (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    Em andamento
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Biblioteca de bebidas
                  </label>
                  <select
                    value={selectedDrinkId}
                    onChange={(event) => {
                      const selectedDrink = drinks.find(
                        (drink) => drink.id === event.target.value,
                      );
                      if (selectedDrink) {
                        applyDrinkDraft(selectedDrink);
                      }
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                  >
                    {drinks.map((drink) => (
                      <option key={drink.id} value={drink.id}>
                        {drink.name} · {drink.defaultVolumeMl} ml · {drink.abv}% ABV
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Nome da sessão
                    </label>
                    <input
                      value={sessionName}
                      onChange={(event) => setSessionName(event.target.value)}
                      placeholder="Ex: Happy hour de sexta"
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Nome da bebida
                    </label>
                    <input
                      value={drinkName}
                      onChange={(event) => setDrinkName(event.target.value)}
                      placeholder="Ex: IPA da casa"
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Categoria
                    </label>
                    <input
                      value={drinkCategory}
                      onChange={(event) => setDrinkCategory(event.target.value)}
                      placeholder="Cerveja, vinho, drink..."
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Unidade
                    </label>
                    <input
                      value={unitName}
                      onChange={(event) => setUnitName(event.target.value)}
                      placeholder="copo, dose, lata..."
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Teor alcoólico (%)
                    </label>
                    <input
                      value={abvInput}
                      onChange={(event) =>
                        setAbvInput(sanitizeNumberInput(event.target.value))
                      }
                      placeholder="5,0"
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Volume por unidade (ml)
                    </label>
                    <input
                      value={volumeInput}
                      onChange={(event) =>
                        setVolumeInput(sanitizeNumberInput(event.target.value))
                      }
                      placeholder="350"
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* <div className="grid gap-3 md:grid-cols-2"> */}
                <div className="grid gap-3 md:grid-cols-1">
                  <button
                    type="button"
                    onClick={handleDrinkSave}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/70 px-4 py-3 text-sm font-medium text-neutral-100 transition hover:border-amber-400/40"
                  >
                    <Save className="h-4 w-4" />
                    Salvar bebida
                  </button>
                  {/*<button
                    type="button"
                    onClick={handleSessionStart}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                  >
                    <Play className="h-4 w-4" />
                    {activeSession ? "Sessão em andamento" : "Iniciar sessão"}
                  </button>*/}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <MetricCard
                icon={LineChart}
                label="Maior Ritmo"
                value={
                  strongestSession
                    ? `${numberFormatter.format(strongestSession.metrics.cupsPerHour)} copos/h`
                    : "--"
                }
                helper={strongestSession?.session.name ?? "sem dados"}
                tone="rose"
              />
              <MetricCard
                icon={Beer}
                label="Bebida Favorita"
                value={getFavoriteDrink(orderedSessions)}
                helper="mais recorrente no histórico"
                tone="amber"
              />
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/65 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                    Biblioteca
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-neutral-50">
                    Bebidas salvas
                  </h3>
                </div>
                {!hasHydrated ? (
                  <span className="text-xs text-neutral-500">Carregando...</span>
                ) : null}
              </div>

              <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                {drinks.map((drink) => (
                  <div
                    key={drink.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => applyDrinkDraft(drink)}
                      className="text-left"
                    >
                      <p className="font-medium text-neutral-100">{drink.name}</p>
                      <p className="text-xs text-neutral-500">
                        {drink.category} · {numberFormatter.format(drink.defaultVolumeMl)} ml ·{" "}
                        {percentageFormatter.format(drink.abv)}% ABV · {drink.unitName}
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyDrinkDraft(drink)}
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                      >
                        Carregar
                      </button>
                      {!DEFAULT_DRINK_IDS.has(drink.id) ? (
                        <button
                          type="button"
                          onClick={() => handleDrinkRemove(drink.id)}
                          className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {activeSession && activeMetrics ? (
              <>
                <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,_rgba(5,150,105,0.16),_rgba(17,24,39,0.94))] p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
                        {activeSession.name}
                      </p>
                      <h3 className="text-3xl font-semibold text-white">
                        Corrida em andamento
                      </h3>
                      <p className="text-sm text-neutral-300">
                        {activeSession.drink.name} · {percentageFormatter.format(activeSession.drink.abv)}% ABV ·{" "}
                        {numberFormatter.format(activeSession.drink.defaultVolumeMl)} ml por {activeSession.drink.unitName}
                      </p>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-black/20 px-6 py-5 text-center xl:min-w-[250px]">
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                        Tempo
                      </p>
                      <p className="mt-2 text-5xl font-semibold text-white">
                        {formatDuration(activeMetrics.durationSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      icon={Beer}
                      label="Copos"
                      value={numberFormatter.format(activeMetrics.totalCups)}
                      helper="toques registrados"
                      tone="amber"
                    />
                    <MetricCard
                      icon={Gauge}
                      label="Copos/Hora"
                      value={numberFormatter.format(activeMetrics.cupsPerHour)}
                      helper="velocidade média"
                      tone="emerald"
                    />
                    <MetricCard
                      icon={Clock3}
                      label="Cupace"
                      value={formatCupace(activeMetrics.avgTimePerCupSeconds)}
                      helper="tempo médio por copo"
                      tone="sky"
                    />
                    <MetricCard
                      icon={GlassWater}
                      label="Álcool Puro"
                      value={`${numberFormatter.format(activeMetrics.totalAlcoholMl)} ml`}
                      helper="estimativa acumulada"
                      tone="rose"
                    />
                  </div>

                  <div className="mt-6 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                    <button
                      type="button"
                      onClick={handleCupIncrement}
                      className="flex min-h-28 items-center justify-center gap-3 rounded-[1.5rem] bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400 px-6 py-5 text-xl font-semibold text-neutral-950 transition hover:scale-[1.01]"
                    >
                      <Plus className="h-5 w-5" />
                      +1 copo
                    </button>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <button
                        type="button"
                        onClick={handleUndoCup}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-4 text-sm font-medium text-neutral-100 transition hover:border-amber-400/50"
                      >
                        <Undo2 className="h-4 w-4" />
                        Desfazer último copo
                      </button>
                      <button
                        type="button"
                        onClick={handleSessionFinish}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
                      >
                        <StopCircle className="h-4 w-4" />
                        Finalizar sessão
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.84fr_1.16fr]">
                  <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/70 p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-neutral-50">Feed da sessão</h3>
                      <p className="text-sm text-neutral-400">
                        Linha do tempo dos copos concluídos.
                      </p>
                    </div>
                    <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                      {activeSession.events.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
                          Nenhum copo registrado ainda. O primeiro toque inaugura a sessão.
                        </p>
                      ) : (
                        activeSession.events
                          .slice()
                          .reverse()
                          .map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-neutral-100">
                                  Copo {event.cupNumber}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  {formatDateTime(event.createdAt)}
                                </p>
                              </div>
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                                #{event.cupNumber}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/70 p-5">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-neutral-50">Splits da sessão</h3>
                        <p className="text-sm text-neutral-400">
                          Blocos de 15 minutos com o ritmo em cada trecho.
                        </p>
                      </div>
                      <SplitChart splits={activeMetrics.splits} />
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/70 p-5">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-neutral-50">Métricas instantâneas</h3>
                        <p className="text-sm text-neutral-400">
                          Indicadores para leitura rápida no meio da sessão.
                        </p>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                          <span className="text-neutral-400">Copos por minuto</span>
                          <span className="font-medium text-neutral-100">
                            {numberFormatter.format(activeMetrics.cupsPerMinute)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                          <span className="text-neutral-400">Menor intervalo</span>
                          <span className="font-medium text-neutral-100">
                            {activeMetrics.shortestIntervalSeconds
                              ? formatDuration(activeMetrics.shortestIntervalSeconds)
                              : "--:--"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                          <span className="text-neutral-400">Maior intervalo</span>
                          <span className="font-medium text-neutral-100">
                            {activeMetrics.longestIntervalSeconds
                              ? formatDuration(activeMetrics.longestIntervalSeconds)
                              : "--:--"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                          <span className="text-neutral-400">Pico da sessão</span>
                          <span className="font-medium text-neutral-100">
                            {numberFormatter.format(activeMetrics.peakCupsPerHour)} copos/h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,_rgba(251,191,36,0.12),_rgba(17,24,39,0.94))] p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
                        Prévia da sessão
                      </p>
                      <h3 className="text-3xl font-semibold text-white">
                        Tudo acontece aqui quando você iniciar
                      </h3>
                      <p className="text-sm text-neutral-300">
                        O cronômetro, os botões da corrida e o feed aparecem neste mesmo painel.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-white/10 bg-black/20 px-6 py-5 text-center xl:min-w-[250px]">
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                        Status
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        Pronto para iniciar
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      icon={Beer}
                      label="Bebida"
                      value={drinkName.trim() || "Sem nome"}
                      helper={drinkCategory.trim() || "categoria"}
                      tone="amber"
                    />
                    <MetricCard
                      icon={GlassWater}
                      label="Volume"
                      value={`${numberFormatter.format(draftVolume || 0)} ml`}
                      helper={unitName.trim() || "unidade"}
                      tone="sky"
                    />
                    <MetricCard
                      icon={Flame}
                      label="Teor"
                      value={`${numberFormatter.format(draftAbv || 0)}%`}
                      helper="ABV configurado"
                      tone="rose"
                    />
                    <MetricCard
                      icon={Clock3}
                      label="Cupace"
                      value="--:-- / copo"
                      helper="aparece após os primeiros registros"
                      tone="emerald"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSessionStart}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-base font-semibold text-neutral-950 transition hover:bg-emerald-400"
                  >
                    <Play className="h-4 w-4" />
                    Iniciar sessão agora
                  </button>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/70 p-5">
                    <h3 className="text-lg font-semibold text-neutral-50">Como a corrida funciona</h3>
                    <div className="mt-4 space-y-3 text-sm text-neutral-300">
                      <p className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                        1. Configure a bebida, o teor alcoólico, o volume e o nome da sessão.
                      </p>
                      <p className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                        2. Inicie a sessão e use o botão grande para marcar cada copo concluído.
                      </p>
                      <p className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-3">
                        3. Finalize para gerar resumo, histórico, comparação, salvar e compartilhar.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900/70 p-5">
                    <h3 className="text-lg font-semibold text-neutral-50">O que entra no resumo final</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-4 text-sm text-neutral-300">
                        <p className="mb-1 font-medium text-neutral-100">Performance</p>
                        <p>Duração, copos por hora, copos por minuto, cupace e pico de ritmo.</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-4 text-sm text-neutral-300">
                        <p className="mb-1 font-medium text-neutral-100">Consumo</p>
                        <p>Volume total, álcool puro estimado e intervalo entre copos.</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-4 text-sm text-neutral-300">
                        <p className="mb-1 font-medium text-neutral-100">Timeline</p>
                        <p>Feed de eventos e splits por blocos de 15 minutos.</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-neutral-950/70 px-4 py-4 text-sm text-neutral-300">
                        <p className="mb-1 font-medium text-neutral-100">Ações</p>
                        <p>Compartilhar resultado e baixar um snapshot em imagem do resumo final.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Resumo da atividade"
        description={
          selectedSession
            ? "Detalhes completos da sessão selecionada, com splits e comparação."
            : "Finalize uma sessão para gerar o resumo ao estilo Strava."
        }
      >
        {!selectedSession || !selectedMetrics ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-neutral-500">
            Nenhuma atividade concluída ainda. Configure uma bebida e inicie a primeira sessão.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleShareSession}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/15"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </button>
              <button
                type="button"
                onClick={handleSaveSession}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/90 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-amber-400/40"
              >
                <Download className="h-4 w-4" />
                Salvar imagem
              </button>
            </div>

            <div
              ref={summarySnapshotRef}
              className="space-y-6 rounded-[1.75rem] border border-white/8 bg-[linear-gradient(145deg,_rgba(7,10,20,0.98),_rgba(18,23,38,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">
                  {selectedSession.drink.name}
                </p>
                <h3 className="text-2xl font-semibold text-neutral-50">
                  {selectedSession.name}
                </h3>
                <p className="text-sm text-neutral-400">
                  Início em {formatDateTime(selectedSession.startedAt)} · fim em{" "}
                  {formatDateTime(selectedSession.endedAt)}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-neutral-900/70 px-5 py-4 text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                  Cupace
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatCupace(selectedMetrics.avgTimePerCupSeconds)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Clock3}
                label="Duração"
                value={formatDuration(selectedMetrics.durationSeconds)}
                helper="tempo total da sessão"
                tone="sky"
              />
              <MetricCard
                icon={Beer}
                label="Total de Copos"
                value={numberFormatter.format(selectedMetrics.totalCups)}
                helper="toques concluídos"
                tone="amber"
              />
              <MetricCard
                icon={Gauge}
                label="Copos/Hora"
                value={numberFormatter.format(selectedMetrics.cupsPerHour)}
                helper="média da sessão"
                tone="emerald"
              />
              <MetricCard
                icon={GlassWater}
                label="Volume Total"
                value={`${numberFormatter.format(selectedMetrics.totalVolumeMl)} ml`}
                helper={`${numberFormatter.format(selectedMetrics.totalAlcoholMl)} ml de álcool puro`}
                tone="rose"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <SectionCard
                title="Parciais da sessão"
                description="Blocos de 15 minutos com o ritmo em cada trecho."
              >
                <SplitChart splits={selectedMetrics.splits} />
              </SectionCard>

              <SectionCard
                title="Comparação"
                description={
                  comparisonSession
                    ? `Referência: ${comparisonSession.name}`
                    : "A comparação aparece quando existir pelo menos uma sessão anterior."
                }
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-900/60 px-4 py-3">
                    <span className="text-neutral-400">Copos por minuto</span>
                    <span className="font-medium text-neutral-100">
                      {numberFormatter.format(selectedMetrics.cupsPerMinute)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-900/60 px-4 py-3">
                    <span className="text-neutral-400">Menor intervalo</span>
                    <span className="font-medium text-neutral-100">
                      {selectedMetrics.shortestIntervalSeconds
                        ? formatDuration(selectedMetrics.shortestIntervalSeconds)
                        : "--:--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-900/60 px-4 py-3">
                    <span className="text-neutral-400">Maior intervalo</span>
                    <span className="font-medium text-neutral-100">
                      {selectedMetrics.longestIntervalSeconds
                        ? formatDuration(selectedMetrics.longestIntervalSeconds)
                        : "--:--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-neutral-900/60 px-4 py-3">
                    <span className="text-neutral-400">Pico de ritmo</span>
                    <span className="font-medium text-neutral-100">
                      {numberFormatter.format(selectedMetrics.peakCupsPerHour)} copos/h
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-neutral-900/60 px-4 py-4 text-neutral-300">
                    {comparisonSession && comparisonMetrics ? (
                      <p>
                        Diferença para a referência:{" "}
                        <span className="font-medium text-neutral-100">
                          {selectedMetrics.totalCups - comparisonMetrics.totalCups >= 0 ? "+" : ""}
                          {selectedMetrics.totalCups - comparisonMetrics.totalCups} copos
                        </span>{" "}
                        e{" "}
                        <span className="font-medium text-neutral-100">
                          {selectedMetrics.cupsPerHour - comparisonMetrics.cupsPerHour >= 0 ? "+" : ""}
                          {numberFormatter.format(
                            selectedMetrics.cupsPerHour - comparisonMetrics.cupsPerHour,
                          )}{" "}
                          copos/h
                        </span>
                        .
                      </p>
                    ) : (
                      <p>Faça mais uma sessão para desbloquear comparações entre atividades.</p>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Histórico"
        description="Lista das sessões concluídas. Toque em uma delas para atualizar o resumo acima."
      >
        <div className="space-y-3">
          {orderedSessions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
              O histórico aparece aqui assim que a primeira sessão for finalizada.
            </p>
          ) : (
            orderedSessions.map((session) => {
              const metrics = buildSessionMetrics(session);
              const selected = selectedSessionId === session.id;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    selected
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/8 bg-neutral-900/55 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-neutral-100">
                        {session.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {session.drink.name} · {formatDateTime(session.endedAt)}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-4 sm:text-right">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Duração
                        </p>
                        <p className="font-medium text-neutral-100">
                          {formatDuration(metrics.durationSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Copos
                        </p>
                        <p className="font-medium text-neutral-100">
                          {metrics.totalCups}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Cupace
                        </p>
                        <p className="font-medium text-neutral-100">
                          {formatCupace(metrics.avgTimePerCupSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Copos/H
                        </p>
                        <p className="font-medium text-neutral-100">
                          {numberFormatter.format(metrics.cupsPerHour)}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </SectionCard>

    </div>
  );
}
