"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

type BlockType =
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "bullet"
  | "checklist"
  | "quote"
  | "code";

type Block = {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
};

type StoredDocument = {
  version: 1;
  title: string;
  blocks: Block[];
  updatedAt: string;
  driveFileId?: string;
  driveFileName?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  error?: string;
};

type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const STORAGE_KEY = "note-canvas-document-v1";
const SETTINGS_KEY = "note-canvas-settings-v1";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const BLOCK_OPTIONS: Array<{ value: BlockType; label: string }> = [
  { value: "paragraph", label: "Texto" },
  { value: "heading-1", label: "Titulo H1" },
  { value: "heading-2", label: "Titulo H2" },
  { value: "heading-3", label: "Titulo H3" },
  { value: "bullet", label: "Lista" },
  { value: "checklist", label: "Checklist" },
  { value: "quote", label: "Citacao" },
  { value: "code", label: "Codigo" },
];

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createBlock = (type: BlockType = "paragraph", text = ""): Block => ({
  id: createId(),
  type,
  text,
  checked: type === "checklist" ? false : undefined,
});

const getDefaultDocument = (): StoredDocument => ({
  version: 1,
  title: "Documento sem titulo",
  blocks: [
    createBlock("heading-1", "Comece por aqui"),
    createBlock(
      "paragraph",
      "Crie blocos como no Notion, edite localmente no navegador e exporte quando quiser.",
    ),
    createBlock("checklist", "Primeira tarefa"),
  ],
  updatedAt: new Date().toISOString(),
});

const normalizeImportedBlock = (value: unknown): Block | null => {
  if (!value || typeof value !== "object") return null;
  const block = value as Partial<Block>;
  if (typeof block.text !== "string") return null;
  const type = BLOCK_OPTIONS.some((option) => option.value === block.type)
    ? (block.type as BlockType)
    : "paragraph";
  return {
    id: typeof block.id === "string" ? block.id : createId(),
    type,
    text: block.text,
    checked: type === "checklist" ? Boolean(block.checked) : undefined,
  };
};

const sanitizeDocument = (value: unknown): StoredDocument | null => {
  if (!value || typeof value !== "object") return null;
  const doc = value as Partial<StoredDocument>;
  const blocks = Array.isArray(doc.blocks)
    ? doc.blocks.map(normalizeImportedBlock).filter((entry): entry is Block => entry !== null)
    : [];
  return {
    version: 1,
    title: typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : "Documento sem titulo",
    blocks: blocks.length > 0 ? blocks : [createBlock()],
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : new Date().toISOString(),
    driveFileId: typeof doc.driveFileId === "string" ? doc.driveFileId : undefined,
    driveFileName: typeof doc.driveFileName === "string" ? doc.driveFileName : undefined,
  };
};

const markdownFromDocument = (document: StoredDocument) => {
  const sections: string[] = [`# ${document.title}`];

  for (const block of document.blocks) {
    if (!block.text.trim() && block.type !== "checklist") {
      continue;
    }
    switch (block.type) {
      case "heading-1":
        sections.push(`# ${block.text.trim()}`);
        break;
      case "heading-2":
        sections.push(`## ${block.text.trim()}`);
        break;
      case "heading-3":
        sections.push(`### ${block.text.trim()}`);
        break;
      case "bullet":
        sections.push(`- ${block.text}`);
        break;
      case "checklist":
        sections.push(`- [${block.checked ? "x" : " "}] ${block.text}`);
        break;
      case "quote":
        sections.push(
          block.text
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n"),
        );
        break;
      case "code":
        sections.push(["```", block.text, "```"].join("\n"));
        break;
      default:
        sections.push(block.text);
        break;
    }
  }

  return sections.join("\n\n").trim();
};

const parseMarkdown = (source: string): StoredDocument => {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let title = "Documento importado";
  let index = 0;

  const flushParagraph = (buffer: string[]) => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push(createBlock("paragraph", text));
    buffer.length = 0;
  };

  const paragraphBuffer: string[] = [];

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraphBuffer);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph(paragraphBuffer);
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(createBlock("code", codeLines.join("\n")));
      index += 1;
      continue;
    }

    const checklistMatch = trimmed.match(/^-\s\[( |x|X)\]\s(.+)$/);
    if (checklistMatch) {
      flushParagraph(paragraphBuffer);
      blocks.push({
        id: createId(),
        type: "checklist",
        text: checklistMatch[2],
        checked: checklistMatch[1].toLowerCase() === "x",
      });
      index += 1;
      continue;
    }

    const heading3 = trimmed.match(/^###\s(.+)$/);
    if (heading3) {
      flushParagraph(paragraphBuffer);
      blocks.push(createBlock("heading-3", heading3[1]));
      index += 1;
      continue;
    }

    const heading2 = trimmed.match(/^##\s(.+)$/);
    if (heading2) {
      flushParagraph(paragraphBuffer);
      blocks.push(createBlock("heading-2", heading2[1]));
      index += 1;
      continue;
    }

    const heading1 = trimmed.match(/^#\s(.+)$/);
    if (heading1) {
      flushParagraph(paragraphBuffer);
      if (title === "Documento importado") {
        title = heading1[1];
      } else {
        blocks.push(createBlock("heading-1", heading1[1]));
      }
      index += 1;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s(.+)$/);
    if (bulletMatch) {
      flushParagraph(paragraphBuffer);
      blocks.push(createBlock("bullet", bulletMatch[1]));
      index += 1;
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph(paragraphBuffer);
      const quoteLines = [quoteMatch[1]];
      index += 1;
      while (index < lines.length) {
        const next = lines[index].trim();
        const nextQuote = next.match(/^>\s?(.*)$/);
        if (!nextQuote) break;
        quoteLines.push(nextQuote[1]);
        index += 1;
      }
      blocks.push(createBlock("quote", quoteLines.join("\n")));
      continue;
    }

    paragraphBuffer.push(line);
    index += 1;
  }

  flushParagraph(paragraphBuffer);

  return {
    version: 1,
    title,
    blocks: blocks.length > 0 ? blocks : [createBlock("paragraph", source.trim())],
    updatedAt: new Date().toISOString(),
  };
};

const buildDownloadName = (title: string, extension: "json" | "md") =>
  `${title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "note-canvas-documento"}.${extension}`;

const formatDriveDate = (value?: string) => {
  if (!value) return "sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const getEditorBlockClassName = (type: BlockType) => {
  switch (type) {
    case "heading-1":
      return "min-h-14 text-3xl font-semibold tracking-tight text-white";
    case "heading-2":
      return "min-h-12 text-2xl font-semibold text-emerald-300";
    case "heading-3":
      return "min-h-11 text-xl font-semibold text-neutral-100";
    case "bullet":
    case "checklist":
      return "min-h-10 text-base leading-7 text-neutral-200";
    case "quote":
      return "min-h-12 border-l-2 border-emerald-400/50 pl-4 text-base italic leading-7 text-neutral-300";
    case "code":
      return "min-h-32 rounded-2xl bg-neutral-900/80 px-4 py-3 font-mono text-sm leading-6 text-emerald-200";
    default:
      return "min-h-12 text-base leading-8 text-neutral-300";
  }
};

const renderPreviewBlock = (block: Block) => {
  if (!block.text.trim() && block.type !== "checklist") return null;

  if (block.type === "heading-1") {
    return (
      <h4 key={block.id} className="text-3xl font-semibold tracking-tight text-white">
        {block.text}
      </h4>
    );
  }

  if (block.type === "heading-2") {
    return (
      <h4 key={block.id} className="text-2xl font-semibold text-emerald-300">
        {block.text}
      </h4>
    );
  }

  if (block.type === "heading-3") {
    return (
      <h4 key={block.id} className="text-xl font-semibold text-neutral-100">
        {block.text}
      </h4>
    );
  }

  if (block.type === "bullet") {
    return (
      <div key={block.id} className="flex gap-3 text-base leading-7 text-neutral-200">
        <span className="pt-1 text-emerald-300">•</span>
        <p className="whitespace-pre-wrap">{block.text}</p>
      </div>
    );
  }

  if (block.type === "checklist") {
    return (
      <div key={block.id} className="flex gap-3 text-base leading-7 text-neutral-200">
        <span className="pt-1 text-emerald-300">{block.checked ? "☑" : "☐"}</span>
        <p className={block.checked ? "whitespace-pre-wrap text-neutral-500 line-through" : "whitespace-pre-wrap"}>
          {block.text || "Item sem texto"}
        </p>
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote
        key={block.id}
        className="border-l-2 border-emerald-400/50 pl-4 text-base italic leading-7 text-neutral-300"
      >
        {block.text}
      </blockquote>
    );
  }

  if (block.type === "code") {
    return (
      <pre
        key={block.id}
        className="overflow-x-auto rounded-2xl bg-neutral-900 p-4 text-sm leading-6 text-emerald-200"
      >
        <code>{block.text}</code>
      </pre>
    );
  }

  return (
    <p key={block.id} className="whitespace-pre-wrap text-base leading-8 text-neutral-300">
      {block.text}
    </p>
  );
};

export default function NoteCanvasPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documentState, setDocumentState] = useState<StoredDocument>(getDefaultDocument);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Editor local pronto.");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const markdownPreview = useMemo(
    () => markdownFromDocument(documentState),
    [documentState],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const savedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as { googleClientId?: string };
        if (typeof parsedSettings.googleClientId === "string") {
          setGoogleClientId(parsedSettings.googleClientId);
        }
      }
      if (saved) {
        const parsed = sanitizeDocument(JSON.parse(saved));
        if (parsed) {
          setDocumentState(parsed);
        }
      }
    } catch {
      setStatusMessage("Falha ao carregar o cache local. Um documento novo foi iniciado.");
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documentState));
  }, [documentState, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded || typeof window === "undefined") return;
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ googleClientId: googleClientId.trim() }),
    );
  }, [googleClientId, hasLoaded]);

  const updateDocument = (updater: (current: StoredDocument) => StoredDocument) => {
    setDocumentState((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    updateDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === id
          ? {
              ...block,
              ...patch,
              checked:
                (patch.type ?? block.type) === "checklist"
                  ? Boolean(patch.checked ?? block.checked)
                  : undefined,
            }
          : block,
      ),
    }));
  };

  const addBlockAfter = (afterId?: string, type: BlockType = "paragraph") => {
    updateDocument((current) => {
      const next = createBlock(type);
      if (!afterId) {
        return { ...current, blocks: [...current.blocks, next] };
      }
      const index = current.blocks.findIndex((block) => block.id === afterId);
      if (index === -1) return { ...current, blocks: [...current.blocks, next] };
      const blocks = [...current.blocks];
      blocks.splice(index + 1, 0, next);
      return { ...current, blocks };
    });
  };

  const removeBlock = (id: string) => {
    updateDocument((current) => {
      const remaining = current.blocks.filter((block) => block.id !== id);
      return { ...current, blocks: remaining.length > 0 ? remaining : [createBlock()] };
    });
  };

  const resetDocument = () => {
    setDocumentState(getDefaultDocument());
    setStatusMessage("Novo documento criado localmente.");
  };

  const downloadFile = (content: string, extension: "json" | "md", mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadName(documentState.title, extension);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    downloadFile(JSON.stringify(documentState, null, 2), "json", "application/json");
    setStatusMessage("Arquivo .json exportado para o computador.");
  };

  const handleExportMarkdown = () => {
    downloadFile(markdownPreview, "md", "text/markdown;charset=utf-8");
    setStatusMessage("Arquivo Markdown exportado para o computador.");
  };

  const handleImportedText = (text: string, name: string) => {
    const normalizedName = name.toLowerCase();
    try {
      const nextDocument = normalizedName.endsWith(".json")
        ? sanitizeDocument(JSON.parse(text))
        : parseMarkdown(text);
      if (!nextDocument) {
        setStatusMessage("Nao foi possivel importar este arquivo.");
        return;
      }
      setDocumentState({
        ...nextDocument,
        driveFileId: undefined,
        driveFileName: undefined,
        updatedAt: new Date().toISOString(),
      });
      setStatusMessage(`Arquivo ${name} importado com sucesso.`);
    } catch {
      setStatusMessage("Falha ao ler o arquivo importado.");
    }
  };

  const handleLocalImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      handleImportedText(text, file.name);
    } finally {
      event.target.value = "";
    }
  };

  const getAccessToken = async (forceConsent = false) => {
    if (!googleClientId.trim()) {
      throw new Error("Informe um Google OAuth Client ID para usar o Drive.");
    }
    if (!googleScriptReady || !window.google?.accounts?.oauth2) {
      throw new Error("SDK do Google ainda nao foi carregado.");
    }
    if (driveToken && !forceConsent) {
      return driveToken;
    }
    return await new Promise<string>((resolve, reject) => {
      const client = window.google?.accounts?.oauth2?.initTokenClient({
        client_id: googleClientId.trim(),
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error("Nao foi possivel autenticar com o Google Drive."));
            return;
          }
          setDriveToken(response.access_token);
          resolve(response.access_token);
        },
      });
      client?.requestAccessToken({ prompt: forceConsent || !driveToken ? "consent" : "" });
    });
  };

  const createMultipartBody = (payload: string, metadata: Record<string, string>) => {
    const boundary = `note-canvas-${Math.random().toString(36).slice(2)}`;
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      payload,
      `--${boundary}--`,
    ].join("\r\n");

    return {
      boundary,
      body,
    };
  };

  const fetchDriveFiles = async (token?: string) => {
    const accessToken = token ?? (await getAccessToken());
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/json' and trashed=false&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Falha ao listar arquivos do Google Drive.");
    }

    const payload = (await response.json()) as { files?: DriveFile[] };
    const files = (payload.files ?? []).filter((file) => file.name.endsWith(".json"));
    setDriveFiles(files);
    return files;
  };

  const handleDriveExport = async () => {
    setDriveBusy(true);
    try {
      const accessToken = await getAccessToken();
      const payload = JSON.stringify(documentState, null, 2);
      const fileName = buildDownloadName(documentState.title, "json");
      const { boundary, body } = createMultipartBody(payload, {
        name: documentState.driveFileName ?? fileName,
      });
      const endpoint = documentState.driveFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${documentState.driveFileId}?uploadType=multipart`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const method = documentState.driveFileId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (!response.ok) {
        throw new Error("Falha ao exportar para o Google Drive.");
      }

      const file = (await response.json()) as DriveFile;
      setDocumentState((current) => ({
        ...current,
        driveFileId: file.id,
        driveFileName: file.name,
        updatedAt: new Date().toISOString(),
      }));
      await fetchDriveFiles(accessToken);
      setStatusMessage(`Documento enviado para o Google Drive como ${file.name}.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Erro ao exportar para o Google Drive.",
      );
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveImport = async (fileId: string) => {
    setDriveBusy(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Falha ao importar do Google Drive.");
      }

      const text = await response.text();
      const imported = sanitizeDocument(JSON.parse(text));
      if (!imported) {
        throw new Error("O arquivo selecionado nao possui um formato valido do NoteCanvas.");
      }
      const matchedFile = driveFiles.find((file) => file.id === fileId);
      setDocumentState({
        ...imported,
        driveFileId: fileId,
        driveFileName: matchedFile?.name ?? imported.driveFileName,
        updatedAt: new Date().toISOString(),
      });
      setStatusMessage(`Documento ${matchedFile?.name ?? ""} carregado do Google Drive.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Erro ao importar do Google Drive.",
      );
    } finally {
      setDriveBusy(false);
    }
  };

  const refreshDriveFiles = async () => {
    setDriveBusy(true);
    try {
      const token = await getAccessToken();
      const files = await fetchDriveFiles(token);
      setStatusMessage(
        files.length > 0
          ? "Arquivos do Google Drive atualizados."
          : "Nenhum arquivo JSON encontrado no Google Drive desta conta.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Erro ao listar arquivos do Google Drive.",
      );
    } finally {
      setDriveBusy(false);
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptReady(true)}
      />

      <div className="space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            NoteCanvas
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Canvas de escrita com edicao inline</h1>
            <p className="max-w-3xl text-sm text-neutral-300">
              Escreva direto no canvas como em apps de notas modernos, alterne para previsualizacao
              quando quiser revisar o resultado e mantenha tudo salvo localmente.
            </p>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      viewMode === "edit"
                        ? "bg-emerald-500 text-neutral-950"
                        : "border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      viewMode === "preview"
                        ? "bg-neutral-100 text-neutral-950"
                        : "border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    Previsualizar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => addBlockAfter(undefined)}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400"
                  >
                    Novo bloco
                  </button>
                  <button
                    onClick={resetDocument}
                    className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
                <span className="rounded-full border border-neutral-800 px-3 py-1">
                  Autosave local
                </span>
                <span className="rounded-full border border-neutral-800 px-3 py-1">
                  Ultima edicao: {formatDriveDate(documentState.updatedAt)}
                </span>
                {documentState.driveFileName && (
                  <span className="rounded-full border border-neutral-800 px-3 py-1">
                    Drive: {documentState.driveFileName}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-neutral-800 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_40%),linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.98))] p-5 sm:p-8 lg:p-12">
              {viewMode === "edit" ? (
                <div className="mx-auto max-w-4xl space-y-6">
                  <input
                    value={documentState.title}
                    onChange={(event) =>
                      updateDocument((current) => ({
                        ...current,
                        title: event.target.value || "Documento sem titulo",
                      }))
                    }
                    placeholder="Titulo do documento"
                    className="w-full border-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none placeholder:text-neutral-600"
                  />

                  <div className="space-y-4">
                    {documentState.blocks.map((block) => (
                      <article key={block.id} className="group rounded-2xl px-2 py-2 transition hover:bg-white/[0.02]">
                        <div className="mb-2 flex flex-wrap items-center gap-2 opacity-80 transition group-hover:opacity-100">
                          <select
                            value={block.type}
                            onChange={(event) =>
                              updateBlock(block.id, { type: event.target.value as BlockType })
                            }
                            className="rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-emerald-500"
                          >
                            {BLOCK_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {block.type === "checklist" && (
                            <label className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300">
                              <input
                                type="checkbox"
                                checked={Boolean(block.checked)}
                                onChange={(event) =>
                                  updateBlock(block.id, { checked: event.target.checked })
                                }
                              />
                              Marcado
                            </label>
                          )}

                          <button
                            onClick={() => addBlockAfter(block.id)}
                            className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-emerald-500"
                          >
                            Adicionar abaixo
                          </button>
                          <button
                            onClick={() => removeBlock(block.id)}
                            className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-red-300 transition hover:border-red-500"
                          >
                            Remover
                          </button>
                        </div>

                        <div className={block.type === "bullet" || block.type === "checklist" ? "flex items-start gap-3" : ""}>
                          {(block.type === "bullet" || block.type === "checklist") && (
                            <span className="pt-3 text-emerald-300">
                              {block.type === "bullet" ? "•" : block.checked ? "☑" : "☐"}
                            </span>
                          )}
                          <textarea
                            value={block.text}
                            onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                            rows={block.type === "code" ? 8 : 2}
                            placeholder="Escreva direto no canvas..."
                            className={`w-full resize-y border-0 bg-transparent px-0 py-2 outline-none placeholder:text-neutral-600 ${getEditorBlockClassName(
                              block.type,
                            )}`}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-6">
                  <h2 className="text-4xl font-semibold tracking-tight text-white">
                    {documentState.title}
                  </h2>
                  <div className="space-y-5">{documentState.blocks.map(renderPreviewBlock)}</div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <h2 className="text-lg font-medium">Importar e exportar</h2>
              <p className="mt-1 text-xs text-neutral-400">
                O documento fica salvo no navegador e pode ser levado como JSON editavel ou Markdown.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <button
                  onClick={handleExportJson}
                  className="rounded-xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white"
                >
                  Exportar JSON
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-200 transition hover:border-neutral-500"
                >
                  Exportar Markdown
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-200 transition hover:border-emerald-500"
                >
                  Importar arquivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.md,.markdown,.txt"
                  className="hidden"
                  onChange={handleLocalImport}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium">Google Drive</h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Integracao client-side. Use um OAuth Client ID da Google Cloud.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={googleClientId}
                  onChange={(event) => setGoogleClientId(event.target.value)}
                  placeholder="Cole aqui seu Google OAuth Client ID"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                />

                <div className="grid gap-2">
                  <button
                    onClick={handleDriveExport}
                    disabled={driveBusy}
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {driveBusy ? "Processando..." : "Exportar para Drive"}
                  </button>
                  <button
                    onClick={refreshDriveFiles}
                    disabled={driveBusy}
                    className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-200 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Listar arquivos do Drive
                  </button>
                </div>

                <p className="text-xs text-neutral-500">
                  Escopo usado: <code>drive.file</code>. Isso limita o acesso aos arquivos criados
                  ou autorizados pelo app.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {driveFiles.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-3 text-xs text-neutral-500">
                    Nenhum arquivo listado ainda.
                  </p>
                ) : (
                  driveFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleDriveImport(file.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-left transition hover:border-emerald-500"
                    >
                      <span className="pr-3 text-sm text-neutral-200">{file.name}</span>
                      <span className="text-xs text-neutral-500">
                        {formatDriveDate(file.modifiedTime)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <h2 className="text-lg font-medium">Modo atual</h2>
              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
                {viewMode === "edit"
                  ? "Edicao inline ativa. O usuario escreve direto no canvas principal."
                  : "Previsualizacao ativa. O documento aparece sem controles de edicao."}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <h2 className="text-lg font-medium">Markdown gerado</h2>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-300">
                <code>{markdownPreview}</code>
              </pre>
            </section>

            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-neutral-300">
              <p>{statusMessage}</p>
            </section>
          </aside>
        </section>
      </div>
    </>
  );
}
