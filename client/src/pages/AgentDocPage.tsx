import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Marked } from "marked";

const FILES = {
  agents: "/agents.md",
  access: "/access.md",
  api: "/api.md",
} as const;

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      const id = headingId(inner);
      return `<h${depth} id="${id}" class="scroll-mt-4">${inner}</h${depth}>`;
    },
    link({ href, tokens }) {
      const inner = this.parser.parseInline(tokens);
      return `<a href="${escapeAttr(siteHref(href))}">${inner}</a>`;
    },
  },
});

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function headingId(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Page routes for the agent docs. The .md files stay available for agents. */
function siteHref(href: string): string {
  const trimmed = href.trim();
  if (trimmed.startsWith("#")) return trimmed;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  const hashAt = trimmed.indexOf("#");
  const path = (hashAt === -1 ? trimmed : trimmed.slice(0, hashAt)).replace(/^\.\//, "");
  const hash = hashAt === -1 ? "" : trimmed.slice(hashAt);
  if (path === "agents.md" || path === "/agents.md") return `/agents${hash}`;
  if (path === "access.md" || path === "/access.md" || path === "docs/access.md") return `/access${hash}`;
  if (path === "api.md" || path === "/api.md" || path === "docs/api.md") return `/docs/api${hash}`;
  return "#";
}

export function AgentDocPage({ page }: { page: keyof typeof FILES }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setHtml(null);
    setError(null);
    void fetch(FILES[page])
      .then((response) => {
        if (!response.ok) throw new Error("Could not load this page");
        return response.text();
      })
      .then((markdown) => {
        if (cancel) return;
        const rendered = marked.parse(markdown, { async: false });
        setHtml(typeof rendered === "string" ? rendered : "");
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not load this page");
      });
    return () => {
      cancel = true;
    };
  }, [page]);

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id || !html) return;
    const handle = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [html, location.hash]);

  return (
    <article
      className="mx-auto max-w-3xl text-gray-700 [&_a]:text-blue-600 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:mb-4 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_p]:my-3 [&_p]:leading-7 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-white [&_table]:my-4 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_td]:border-b [&_td]:border-slate-200 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:border-b [&_th]:border-slate-300 [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
      onClick={(event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        const href = anchor?.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("http")) return;
        event.preventDefault();
        void navigate(href);
      }}
    >
      {error ? <p>{error}</p> : null}
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
    </article>
  );
}
