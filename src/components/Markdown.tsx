import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({
  children,
  rtl = false,
  className = "",
}: {
  children: string;
  rtl?: boolean;
  className?: string;
}) {
  return (
    <div dir={rtl ? "rtl" : "ltr"} className={`${rtl ? "text-right" : "text-left"} ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-2 mt-4 font-serif text-xl text-amber-400" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-4 font-serif text-lg text-amber-400" {...p} />,
          h3: (p) => <h3 className="mb-2 mt-3 font-serif text-base text-amber-400" {...p} />,
          h4: (p) => <h4 className="mb-2 mt-3 font-serif text-base text-amber-300" {...p} />,
          p: (p) => <p className="my-2 leading-relaxed" {...p} />,
          ul: (p) => <ul className="my-2 list-disc pl-6" {...p} />,
          ol: (p) => <ol className="my-2 list-decimal pl-6" {...p} />,
          li: (p) => <li className="my-1" {...p} />,
          table: (p) => (
            <div className="my-3 overflow-x-auto rounded border border-stone-700">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th
              className="border-b border-stone-700 bg-stone-800 px-2 py-1 text-left font-semibold text-amber-300"
              {...p}
            />
          ),
          td: (p) => <td className="border-b border-stone-800 px-2 py-1" {...p} />,
          strong: (p) => <strong className="font-semibold text-stone-100" {...p} />,
          em: (p) => <em className="italic text-stone-400" {...p} />,
          blockquote: (p) => (
            <blockquote
              className="my-2 border-l-4 border-amber-700 pl-3 text-stone-300"
              {...p}
            />
          ),
          hr: () => <hr className="my-3 border-stone-800" />,
          code: (p) => (
            <code className="rounded bg-stone-800 px-1 py-0.5 text-sm text-amber-200" {...p} />
          ),
          a: (p) => <a className="text-amber-400 underline hover:text-amber-300" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}