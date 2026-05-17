import ReactMarkdown from "react-markdown";

/**
 * Markdown renderer con estilos Tailwind embebidos para evitar
 * la dependencia de @tailwindcss/typography. Cubre los elementos
 * típicos de body_md (p, headings, lists, blockquote, strong, link).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-foreground">
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => (
            <p
              {...props}
              className="mb-4 text-justify text-base leading-relaxed text-foreground hyphens-auto"
            />
          ),
          h1: ({ node, ...props }) => (
            <h1
              {...props}
              className="mb-3 mt-6 font-serif text-2xl font-semibold leading-tight text-foreground"
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              {...props}
              className="mb-2 mt-5 font-serif text-xl font-semibold leading-tight text-foreground"
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              {...props}
              className="mb-2 mt-4 font-serif text-lg font-semibold leading-tight text-foreground"
            />
          ),
          ul: ({ node, ...props }) => (
            <ul {...props} className="mb-4 ml-5 list-disc space-y-1.5" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="mb-4 ml-5 list-decimal space-y-1.5" />
          ),
          li: ({ node, ...props }) => (
            <li {...props} className="text-base leading-relaxed text-foreground" />
          ),
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-semibold text-foreground" />
          ),
          em: ({ node, ...props }) => <em {...props} className="italic" />,
          a: ({ node, ...props }) => (
            <a
              {...props}
              target={
                props.href?.startsWith("http") ? "_blank" : undefined
              }
              rel={
                props.href?.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              className="text-brand-coral underline underline-offset-2 hover:text-brand-coral/80"
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              {...props}
              className="my-4 border-l-4 border-brand-coral/40 pl-4 italic text-muted-foreground"
            />
          ),
          code: ({ node, ...props }) => (
            <code
              {...props}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
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
