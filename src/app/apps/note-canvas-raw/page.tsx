"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ViewMode = "edit" | "split" | "preview";

const STORAGE_KEY = "note-canvas-raw-manual-v1";
const FILE_NAME_KEY = "note-canvas-raw-manual-file-v1";

const INITIAL_MARKDOWN = `# God of War - Guia de trofeus

## Roadmap

1. Zerar o game
    1. Fechar a historia principal
    2. Concluir os desafios
2. Zerar o game+ em menos de 5h

- [ ] Primeira tarefa
    - [ ] Subtarefa
- [x] Liberar a viagem rapida

> Dica: use Tab para criar sublistas.

\`\`\`md
- [ ] Checklist
1. Lista numerada
\`\`\`
`;

type ToolbarAction = {
  label: string;
  onClick: () => void;
};

const buildDownloadName = (name: string) =>
  `${name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "note-canvas-raw"}.md`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const parseInline = (text: string) => {
  let value = escapeHtml(text);
  value = value.replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-900 px-1.5 py-0.5 text-[0.9em] text-emerald-200">$1</code>');
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  value = value.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-emerald-300 underline underline-offset-2">$1</a>',
  );
  return value;
};

const getIndentDepth = (line: string) => {
  const leading = line.match(/^\s*/)?.[0] ?? "";
  let spaces = 0;
  for (const char of leading) {
    spaces += char === "\t" ? 4 : 1;
  }
  return Math.floor(spaces / 4);
};

const getListInfo = (line: string, index: number) => {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!match) return null;

  const marker = match[2];
  const content = match[3];
  const checklist = content.match(/^\[( |x|X)\]\s+(.*)$/);

  return {
    depth: getIndentDepth(line),
    type: /\d+\./.test(marker) ? "ol" : "ul",
    marker,
    lineIndex: index,
    isChecklist: Boolean(checklist),
    checked: checklist ? checklist[1].toLowerCase() === "x" : false,
    text: checklist ? checklist[2] : content,
  };
};

const closeListsToDepth = (html: string[], stack: string[], depth: number) => {
  while (stack.length > depth) {
    const type = stack.pop();
    if (type) html.push(`</${type}>`);
  }
};

const markdownToHtml = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const listStack: string[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inBlockquote = false;

  const closeBlockquote = () => {
    if (inBlockquote) {
      html.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      closeListsToDepth(html, listStack, 0);
      closeBlockquote();

      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        html.push(
          `<pre class="my-5 overflow-x-auto rounded-2xl bg-neutral-900 p-4"><code class="font-mono text-sm leading-6 text-emerald-200">${escapeHtml(
            codeBuffer.join("\n"),
          )}</code></pre>`,
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!trimmed) {
      closeListsToDepth(html, listStack, 0);
      closeBlockquote();
      html.push('<div class="h-3"></div>');
      continue;
    }

    const listInfo = getListInfo(line, index);
    if (listInfo) {
      closeBlockquote();

      while (listStack.length > listInfo.depth + 1) {
        const type = listStack.pop();
        if (type) html.push(`</${type}>`);
      }

      if (listStack.length < listInfo.depth + 1) {
        while (listStack.length < listInfo.depth) {
          html.push('<ul class="my-2 list-disc space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">');
          listStack.push("ul");
        }
        html.push(
          listInfo.type === "ol"
            ? '<ol class="my-2 list-decimal space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">'
            : '<ul class="my-2 list-disc space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">',
        );
        listStack.push(listInfo.type);
      } else if (listStack[listStack.length - 1] !== listInfo.type) {
        const type = listStack.pop();
        if (type) html.push(`</${type}>`);
        html.push(
          listInfo.type === "ol"
            ? '<ol class="my-2 list-decimal space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">'
            : '<ul class="my-2 list-disc space-y-2 pl-6 text-base leading-7 text-neutral-300 marker:text-emerald-300">',
        );
        listStack.push(listInfo.type);
      }

      if (listInfo.isChecklist) {
        html.push(
          `<li class="space-y-2 list-none"><label class="flex items-start gap-3"><input data-line="${listInfo.lineIndex}" type="checkbox" ${
            listInfo.checked ? "checked" : ""
          } class="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-emerald-400" /><span class="${
            listInfo.checked ? "text-neutral-500 line-through" : "text-neutral-300"
          }">${parseInline(listInfo.text)}</span></label></li>`,
        );
      } else {
        html.push(`<li class="space-y-2">${parseInline(listInfo.text)}</li>`);
      }
      continue;
    }

    closeListsToDepth(html, listStack, 0);

    if (/^###\s+/.test(trimmed)) {
      closeBlockquote();
      html.push(
        `<h3 class="mt-6 text-xl font-semibold text-neutral-100">${parseInline(
          trimmed.replace(/^###\s+/, ""),
        )}</h3>`,
      );
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      closeBlockquote();
      html.push(
        `<h2 class="mt-7 text-2xl font-semibold text-emerald-300">${parseInline(
          trimmed.replace(/^##\s+/, ""),
        )}</h2>`,
      );
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      closeBlockquote();
      html.push(
        `<h1 class="mt-8 first:mt-0 text-4xl font-semibold tracking-tight text-white">${parseInline(
          trimmed.replace(/^#\s+/, ""),
        )}</h1>`,
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      if (!inBlockquote) {
        html.push(
          '<blockquote class="my-5 border-l-2 border-emerald-400/50 pl-4 italic text-neutral-300">',
        );
        inBlockquote = true;
      }
      html.push(`<p>${parseInline(trimmed.replace(/^>\s?/, ""))}</p>`);
      continue;
    }

    closeBlockquote();
    html.push(
      `<p class="my-3 whitespace-pre-wrap text-base leading-8 text-neutral-300">${parseInline(
        line,
      )}</p>`,
    );
  }

  closeListsToDepth(html, listStack, 0);
  closeBlockquote();

  return html.join("");
};

const extractTitleFromMarkdown = (markdown: string) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || "Documento sem titulo";
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export default function NoteCanvasRawPage() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const [fileName, setFileName] = useState("god-of-war-guia-de-trofeus");
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [mode, setMode] = useState<ViewMode>("split");
  const [statusMessage, setStatusMessage] = useState("Arquivo Markdown manual pronto para edicao.");
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedMarkdown = window.localStorage.getItem(STORAGE_KEY);
      const storedFileName = window.localStorage.getItem(FILE_NAME_KEY);
      if (storedMarkdown) {
        setMarkdown(storedMarkdown);
        setFileName(storedFileName || buildDownloadName(extractTitleFromMarkdown(storedMarkdown)).replace(/\.md$/, ""));
      } else {
        setFileName(buildDownloadName(extractTitleFromMarkdown(INITIAL_MARKDOWN)).replace(/\.md$/, ""));
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

  const htmlPreview = useMemo(() => markdownToHtml(markdown), [markdown]);
  const totalLines = useMemo(() => markdown.split("\n").length, [markdown]);

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value);
    setUpdatedAt(new Date().toISOString());
    const nextTitle = extractTitleFromMarkdown(value);
    if (nextTitle !== "Documento sem titulo") {
      setFileName(buildDownloadName(nextTitle).replace(/\.md$/, ""));
    }
  };

  const focusTextarea = (selectionStart?: number, selectionEnd?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    requestAnimationFrame(() => {
      textarea.focus();
      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  };

  const applyWrap = (before: string, after = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const nextValue = `${textarea.value.slice(0, start)}${before}${selected}${after}${textarea.value.slice(end)}`;
    handleMarkdownChange(nextValue);
    focusTextarea(start + before.length, start + before.length + selected.length);
  };

  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndCandidate = value.indexOf("\n", selectionEnd);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
    const block = value.slice(lineStart, lineEnd);
    const transformed = block
      .split("\n")
      .map((line) => (line.trim() ? `${prefix}${line}` : line))
      .join("\n");
    const nextValue = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
    handleMarkdownChange(nextValue);
    focusTextarea(lineStart, lineStart + transformed.length);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndCandidate = value.indexOf("\n", selectionEnd);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;

    if (selectionStart === selectionEnd) {
      const insert = event.shiftKey ? "" : "    ";
      if (event.shiftKey) {
        const removable = value.slice(lineStart, selectionStart).match(/^(    |\t)/);
        if (!removable) return;
        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineStart + removable[0].length)}`;
        handleMarkdownChange(nextValue);
        focusTextarea(selectionStart - removable[0].length, selectionStart - removable[0].length);
        return;
      }
      const nextValue = `${value.slice(0, selectionStart)}${insert}${value.slice(selectionEnd)}`;
      handleMarkdownChange(nextValue);
      focusTextarea(selectionStart + 4, selectionStart + 4);
      return;
    }

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const transformedLines = event.shiftKey
      ? lines.map((line) => line.replace(/^(    |\t)/, ""))
      : lines.map((line) => `    ${line}`);
    const transformed = transformedLines.join("\n");
    const nextValue = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
    handleMarkdownChange(nextValue);
    focusTextarea(lineStart, lineStart + transformed.length);
  };

  const handleChecklistClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

    const lineIndex = Number(target.dataset.line);
    if (Number.isNaN(lineIndex)) return;

    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const current = lines[lineIndex];
    if (!current) return;

    const next = current.replace(
      /^(\s*[-*+]\s)\[( |x|X)\](\s+)/,
      `$1[${target.checked ? "x" : " "}]$3`,
    );

    if (next === current) return;

    lines[lineIndex] = next;
    handleMarkdownChange(lines.join("\n"));
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      handleMarkdownChange(text);
      setFileName(file.name.replace(/\.md$/i, ""));
      setStatusMessage(`Arquivo ${file.name} importado com sucesso.`);
    } catch {
      setStatusMessage("Falha ao importar o arquivo Markdown.");
    } finally {
      event.target.value = "";
    }
  };

  const handleExport = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadName(fileName);
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Arquivo .md exportado para o computador.");
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setStatusMessage("Markdown copiado para a area de transferencia.");
    } catch {
      setStatusMessage("Nao foi possivel copiar o Markdown.");
    }
  };

  const resetDocument = () => {
    setMarkdown(INITIAL_MARKDOWN);
    setFileName(buildDownloadName(extractTitleFromMarkdown(INITIAL_MARKDOWN)).replace(/\.md$/, ""));
    setUpdatedAt(new Date().toISOString());
    setStatusMessage("Template Markdown restaurado.");
  };

  const toolbarActions: ToolbarAction[] = [
    { label: "Negrito", onClick: () => applyWrap("**", "**") },
    { label: "Italico", onClick: () => applyWrap("*", "*") },
    { label: "H1", onClick: () => applyLinePrefix("# ") },
    { label: "H2", onClick: () => applyLinePrefix("## ") },
    { label: "Lista", onClick: () => applyLinePrefix("- ") },
    { label: "Numerada", onClick: () => applyLinePrefix("1. ") },
    { label: "Checklist", onClick: () => applyLinePrefix("- [ ] ") },
    { label: "Citacao", onClick: () => applyLinePrefix("> ") },
    { label: "Codigo", onClick: () => applyWrap("```\n", "\n```") },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          NoteCanvas Raw Manual
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Editor manual de Markdown</h1>
          <p className="max-w-3xl text-sm text-neutral-300">
            Parser manual com preview HTML, checklists clicaveis e suporte a listas aninhadas
            por indentacao de 4 espacos.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            {(["edit", "split", "preview"] as ViewMode[]).map((value) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  mode === value
                    ? "bg-emerald-500 text-neutral-950"
                    : "border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {value === "edit" ? "Editor" : value === "split" ? "Dividido" : "Preview"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className="rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-100 outline-none"
            />
            <label className="cursor-pointer rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-emerald-500">
              Importar .md
              <input type="file" accept=".md,.markdown,.txt" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={handleExport}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400"
            >
              Exportar .md
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {toolbarActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-500"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full border border-neutral-800 px-3 py-1">Linhas: {totalLines}</span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Ultima edicao: {formatDate(updatedAt)}
          </span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">
            Tab = 4 espacos
          </span>
        </div>
      </section>

      <div className={`grid gap-4 ${mode === "split" ? "xl:grid-cols-2" : "grid-cols-1"}`}>
        {mode !== "preview" && (
          <section className="rounded-[2rem] border border-neutral-800 bg-[linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.98))] p-4 sm:p-6">
            <div className="grid min-h-[720px] grid-cols-[56px_minmax(0,1fr)] overflow-hidden rounded-[1.5rem] border border-neutral-800 bg-neutral-950/70">
              <div className="border-r border-neutral-800 bg-neutral-950 px-3 py-4 text-right font-mono text-xs leading-7 text-neutral-600">
                {Array.from({ length: totalLines }, (_, index) => (
                  <div key={index + 1}>{index + 1}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={(event) => handleMarkdownChange(event.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                className="min-h-[720px] w-full resize-none bg-transparent px-5 py-4 font-mono text-[15px] leading-7 text-neutral-100 outline-none placeholder:text-neutral-600"
                placeholder="# Titulo&#10;&#10;- [ ] Tarefa&#10;    - Subtarefa&#10;1. Item numerado"
              />
            </div>
          </section>
        )}

        {mode !== "edit" && (
          <section className="rounded-[2rem] border border-neutral-800 bg-[linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.98))] p-4 sm:p-6">
            <article
              ref={previewRef}
              onClick={handleChecklistClick}
              className="min-h-[720px] rounded-[1.5rem] border border-neutral-800 bg-neutral-950/60 p-6 sm:p-8"
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          </section>
        )}
      </div>

      <aside className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
          <h2 className="text-lg font-medium">Comandos</h2>
          <div className="mt-4 space-y-2 text-sm text-neutral-300">
            <p><code># Titulo</code></p>
            <p><code>## Subtitulo</code></p>
            <p><code>- [ ] Tarefa</code></p>
            <p><code>    - Subitem</code></p>
            <p><code>1. Item numerado</code></p>
            <p><code>    1. Subitem numerado</code></p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
          <h2 className="text-lg font-medium">Acoes</h2>
          <div className="mt-4 grid gap-2">
            <button
              onClick={copyMarkdown}
              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-200 transition hover:border-neutral-500"
            >
              Copiar Markdown
            </button>
            <button
              onClick={resetDocument}
              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-200 transition hover:border-neutral-500"
            >
              Restaurar template
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-neutral-300">
          <p>{statusMessage}</p>
        </section>
      </aside>
    </div>
  );
}
