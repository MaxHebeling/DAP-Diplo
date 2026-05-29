import ReactMarkdown from "react-markdown";

/**
 * Markdown renderer con estilos Tailwind embebidos para evitar
 * la dependencia de @tailwindcss/typography. Cubre los elementos
 * típicos de body_md (p, headings, lists, blockquote, strong, link).
 *
 * Colores ajustados para alto contraste sobre el navy del módulo
 * (text-foreground se ve apagado sobre #04081A). Strong y headings
 * van en blanco puro; texto base en white/90.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-white/90">
      <ReactMarkdown
        components={{
          p: ({ ...props }) => (
            <p
              {...props}
              className="mb-4 text-justify text-base leading-relaxed text-white/90 hyphens-auto"
            />
          ),
          h1: ({ ...props }) => (
            <h1
              {...props}
              className="mb-3 mt-6 font-grotesk text-2xl font-bold leading-tight text-white"
            />
          ),
          h2: ({ ...props }) => (
            <h2
              {...props}
              className="mb-2 mt-5 font-grotesk text-xl font-bold leading-tight text-white"
            />
          ),
          h3: ({ ...props }) => (
            <h3
              {...props}
              className="mb-2 mt-4 font-grotesk text-lg font-bold leading-tight text-white"
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
              className="text-base leading-relaxed text-white/90"
            />
          ),
          strong: ({ ...props }) => (
            <strong {...props} className="font-bold text-white" />
          ),
          em: ({ ...props }) => <em {...props} className="italic text-white/85" />,
          a: ({ ...props }) => (
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
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="my-5 rounded-r-lg border-l-4 border-brand-coral bg-white/[0.03] px-5 py-3 italic leading-relaxed text-white/85"
            />
          ),
          code: ({ ...props }) => (
            <code
              {...props}
              className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.85em] text-brand-coral"
            />
          ),
          hr: () => <hr className="my-6 border-white/10" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
