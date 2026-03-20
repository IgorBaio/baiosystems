"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

type ViewMode = "edit" | "preview";

const STORAGE_KEY = "note-canvas-raw-markdown-v1";
const FILE_NAME_KEY = "note-canvas-raw-file-name-v1";

const DEFAULT_MARKDOWN = `# God of War - Guia de trofeus

# Roadmap

## Zerar o game

- [ ] Primeira tarefa
    - [ ] Subtarefa com tab
- [ ] Derrotar a primeira Valkiria
- [x] Liberar a viagem rapida

## Coletaveis importantes

1. Corvos de Odin
2. Baus lendarios
3. Artefatos

> Dica: use este arquivo como um .md real. Tudo que voce escrever aqui sera salvo no navegador.

\`\`\`md
## Exemplo
- [ ] Checklist
1. Lista numerada
\`\`\`
`;

const buildDownloadName = (name: string) =>
  `${name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "note-canvas-raw"}.md`;

const extractTitleFromMarkdown = (markdown: string) => {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) return headingMatch[1].trim();
  return "Documento sem titulo";
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export default function NoteCanvasRawPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [fileName, setFileName] = useState("god-of-war-guia-de-trofeus");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toISOString());
  const [statusMessage, setStatusMessage] = useState("Arquivo Markdown local pronto para edicao.");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedMarkdown = window.localStorage.getItem(STORAGE_KEY);
      const savedFileName = window.localStorage.getItem(FILE_NAME_KEY);

      if (savedMarkdown) {
        setMarkdown(savedMarkdown);
        setFileName(
          buildDownloadName(savedFileName || extractTitleFromMarkdown(savedMarkdown)).replace(
            /\.md$/,
            "",
          ),
        );
      } else {
        setFileName(buildDownloadName(extractTitleFromMarkdown(DEFAULT_MARKDOWN)).replace(/\.md$/, ""));
      }
    } catch {
      setStatusMessage("Falha ao carregar o cache local. O template padrao foi mantido.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, markdown);
    window.localStorage.setItem(FILE_NAME_KEY, fileName);
  }, [markdown, fileName]);

  const totalLines = useMemo(() => markdown.split("\n").length, [markdown]);

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value);
    setUpdatedAt(new Date().toISOString());
    const extractedTitle = extractTitleFromMarkdown(value);
    if (extractedTitle !== "Documento sem titulo") {
      setFileName(buildDownloadName(extractedTitle).replace(/\.md$/, ""));
    }
  };

  const handleExport = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadName(fileName);
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Arquivo .md exportado para o computador.");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setMarkdown(text);
      setFileName(file.name.replace(/\.md$/i, ""));
      setUpdatedAt(new Date().toISOString());
      setStatusMessage(`Arquivo ${file.name} importado com sucesso.`);
    } catch {
      setStatusMessage("Falha ao importar o arquivo Markdown.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = () => {
    setMarkdown(DEFAULT_MARKDOWN);
    setFileName(buildDownloadName(extractTitleFromMarkdown(DEFAULT_MARKDOWN)).replace(/\.md$/, ""));
    setUpdatedAt(new Date().toISOString());
    setStatusMessage("Template Markdown restaurado.");
  };

  const handleChecklistToggle = (lineNumber?: number, checked?: boolean) => {
    if (!lineNumber || typeof checked !== "boolean") return;

    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const lineIndex = lineNumber - 1;
    const currentLine = lines[lineIndex];
    if (!currentLine) return;

    const nextLine = currentLine.replace(
      /^(\s*[-*+]\s)\[( |x|X)\](\s+)/,
      `$1[${checked ? "x" : " "}]$3`,
    );

    if (nextLine === currentLine) return;

    lines[lineIndex] = nextLine;
    setMarkdown(lines.join("\n"));
    setUpdatedAt(new Date().toISOString());
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;

    event.preventDefault();

    const textarea = event.currentTarget;
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextLineBreak = value.indexOf("\n", selectionEnd);
    const blockEnd = nextLineBreak === -1 ? value.length : nextLineBreak;

    if (selectionStart === selectionEnd) {
      const nextValue = `${value.slice(0, selectionStart)}    ${value.slice(selectionEnd)}`;
      handleMarkdownChange(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + 4;
        textarea.selectionEnd = selectionStart + 4;
      });
      return;
    }

    const selectedBlock = value.slice(lineStart, blockEnd);
    const lines = selectedBlock.split("\n");
    const updatedLines = event.shiftKey
      ? lines.map((line) => line.replace(/^(\t| {1,4})/, ""))
      : lines.map((line) => `    ${line}`);
    const replacement = updatedLines.join("\n");
    const nextValue = `${value.slice(0, lineStart)}${replacement}${value.slice(blockEnd)}`;
    const removedChars = lines.reduce((total, line) => {
      const match = line.match(/^(\t| {1,4})/);
      return total + (match ? match[0].length : 0);
    }, 0);
    const diff = event.shiftKey ? -removedChars : lines.length * 4;

    handleMarkdownChange(nextValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = lineStart;
      textarea.selectionEnd = selectionEnd + diff;
    });
  };

  const markdownComponents: Components = {
      h1: ({ children }) => (
        <h1 className="mt-8 first:mt-0 text-4xl font-semibold tracking-tight text-white">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="mt-7 text-2xl font-semibold text-emerald-300">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="mt-6 text-xl font-semibold text-neutral-100">{children}</h3>
      ),
      p: ({ children }) => (
        <p className="whitespace-pre-wrap text-base leading-8 text-neutral-300">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="my-4 list-disc space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-4 list-decimal space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="space-y-2">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="my-5 border-l-2 border-emerald-400/50 pl-4 italic text-neutral-300">
          {children}
        </blockquote>
      ),
      code: ({ inline, children }) =>
        inline ? (
          <code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[0.9em] text-emerald-200">
            {children}
          </code>
        ) : (
          <code className="font-mono text-sm leading-6 text-emerald-200">{children}</code>
        ),
      pre: ({ children }) => (
        <pre className="my-5 overflow-x-auto rounded-2xl bg-neutral-900 p-4">{children}</pre>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-300 underline underline-offset-2"
        >
          {children}
        </a>
      ),
      table: ({ children }) => (
        <div className="my-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm text-neutral-300">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="border-b border-neutral-700">{children}</thead>,
      th: ({ children }) => <th className="px-3 py-2 font-semibold text-white">{children}</th>,
      td: ({ children }) => <td className="border-b border-neutral-800 px-3 py-2">{children}</td>,
      hr: () => <hr className="my-8 border-neutral-800" />,
      input: ({ type, checked, node, ...props }) =>
        type === "checkbox" ? (
          <input
            {...props}
            type="checkbox"
            checked={Boolean(checked)}
            disabled={false}
            readOnly={false}
            onChange={(event) => {
              const lineNumber =
                typeof node?.position?.start?.line === "number"
                  ? node.position.start.line
                  : undefined;
              handleChecklistToggle(lineNumber, event.target.checked);
            }}
            className="mr-3 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-emerald-400"
          />
        ) : (
          <input type={type} {...props} />
        ),
    };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          NoteCanvas Raw
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Editor de Markdown real</h1>
          <p className="max-w-3xl text-sm text-neutral-300">
            O preview agora usa um renderizador padrao de Markdown com suporte a CommonMark
            e GFM, para listas, checklists, tabelas e numeracao funcionarem como `.md` de verdade.
          </p>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-4">
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
                  Editar .md
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
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-emerald-500"
                >
                  Importar .md
                </button>
                <button
                  onClick={handleExport}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400"
                >
                  Exportar .md
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Nome do arquivo
                </label>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent text-base text-neutral-100 outline-none"
                />
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-400">
                <div>Linhas: {totalLines}</div>
                <div>Ultima edicao: {formatDate(updatedAt)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-neutral-800 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_40%),linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.98))] p-4 sm:p-6 lg:p-8">
            {viewMode === "edit" ? (
              <div className="grid min-h-[720px] grid-cols-[56px_minmax(0,1fr)] overflow-hidden rounded-[1.5rem] border border-neutral-800 bg-neutral-950/70">
                <div className="overflow-hidden border-r border-neutral-800 bg-neutral-950 px-3 py-4 text-right font-mono text-xs leading-7 text-neutral-600">
                  {Array.from({ length: totalLines }, (_, index) => (
                    <div key={index + 1}>{index + 1}</div>
                  ))}
                </div>

                <textarea
                  value={markdown}
                  onChange={(event) => handleMarkdownChange(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  spellCheck={false}
                  placeholder="# Titulo&#10;&#10;## Subtitulo&#10;&#10;- [ ] Tarefa"
                  className="min-h-[720px] w-full resize-none bg-transparent px-5 py-4 font-mono text-[15px] leading-7 text-neutral-100 outline-none placeholder:text-neutral-600"
                />
              </div>
            ) : (
              <div className="mx-auto min-h-[720px] max-w-4xl rounded-[1.5rem] border border-neutral-800 bg-neutral-950/60 p-6 sm:p-8 lg:p-10">
                <article className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={markdownComponents}
                  >
                    {markdown}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <h2 className="text-lg font-medium">Comandos reais</h2>
            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p><code># Titulo</code></p>
              <p><code>## Subtitulo</code></p>
              <p><code>- [ ] Tarefa</code></p>
              <p><code>    - Subitem</code></p>
              <p><code>1. Passo numerado</code></p>
              <p><code>    1. Subitem numerado</code></p>
              <p><code>| Coluna | Valor |</code></p>
              <p><code>{">"} Citacao</code></p>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <h2 className="text-lg font-medium">Fluxo</h2>
            <div className="mt-4 space-y-2 text-sm text-neutral-400">
              <p>1. Escreva Markdown bruto no canvas.</p>
              <p>2. Use `Tab` e `Shift+Tab` com identacao de 4 espacos para sublistas universais.</p>
              <p>3. Revise no preview CommonMark + GFM e exporte o `.md`.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <h2 className="text-lg font-medium">Acoes</h2>
            <div className="mt-4 grid gap-2">
              <button
                onClick={handleReset}
                className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-200 transition hover:border-neutral-500"
              >
                Restaurar template
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-neutral-300">
            <p>{statusMessage}</p>
          </section>
        </aside>
      </section>
    </div>
  );
}
