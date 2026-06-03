import ReactMarkdown from "react-markdown";

/**
 * Markdown renderer con estilos Tailwind embebidos para evitar
 * la dependencia de @tailwindcss/typography. Cubre los elementos
 * típicos de body_md (p, headings, lists, blockquote, strong, link).
 *
 * Usa CSS variables (text-foreground / text-muted-foreground) para
 * adaptarse a light/dark mode automáticamente. Antes hardcoded
 * text-white/90 → invisible en módulo player (fondo claro).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-foreground">
      <ReactMarkdown
        components={{
          p: ({ ...props }) => (
            <p
              {...props}
              className="mb-4 text-justify text-base leading-relaxed text-foreground hyphens-auto"
            />
          ),
          h1: ({ ...props }) => (
            <h1
              {...props}
              className="mb-3 mt-6 font-grotesk text-2xl font-bold leading-tight text-foreground"
            />
          ),
          h2: ({ ...props }) => (
            <h2
              {...props}
              className="mb-2 mt-5 font-grotesk text-xl font-bold leading-tight text-foreground"
            />
          ),
          h3: ({ ...props }) => (
            <h3
              {...props}
              className="mb-2 mt-4 font-grotesk text-lg font-bold leading-tight text-foreground"
            />
          ),
          ul: ({ ...props }) => (
            <ul
              {...props}
              className="mb-4 ml-5 list-disc space-y-1.5 marker:text-brand-coral"
            />
          ),
          ol: ({ ...props }) => (
            <ol
              {...props}
              className="mb-4 ml-5 list-decimal space-y-1.5 marker:text-brand-coral marker:font-bold"
            />
          ),
          li: ({ ...props }) => (
            <li
              {...props}
              className="text-base leading-relaxed text-foreground"
            />
          ),
          strong: ({ ...props }) => (
            <strong {...props} className="font-bold text-foreground" />
          ),
          em: ({ ...props }) => (
            <em {...props} className="italic text-muted-foreground" />
          ),
          a: ({ ...props }) => (
            <a
              {...props}
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel={
                props.href?.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              className="text-brand-coral underline underline-offset-2 hover:text-brand-coral/80"
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="my-5 rounded-r-lg border-l-4 border-brand-coral bg-muted/40 px-5 py-3 italic leading-relaxed text-muted-foreground"
            />
          ),
          code: ({ ...props }) => (
            <code
              {...props}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-brand-coral"
            />
          ),
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
