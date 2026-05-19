// TailSpend AI — Agentic Chat Drawer
// 4-agent pipeline: Query Analyst → SQL Writer → DuckDB Executor → Answer Synthesizer → Reviewer
// Design: Precision White | AArete Brand

import { useState, useRef, useEffect } from "react";
import { X, ChevronRight, Loader2, CheckCircle2, XCircle, Database, Cpu, Search, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { runAgentPipeline, type AgentStep } from "@/lib/agentPipeline";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

const SUGGESTED = [
  "Which IT suppliers have Low confidence above $500K?",
  "What are the top 5 savings opportunities by category?",
  "Show me all Wave 1 suppliers in Professional Services",
  "Which suppliers have a review flag and high spend?",
  "What is the total spend for Alaska Airlines suppliers?",
  "Which categories have the most consolidation potential?",
];

const AGENT_ICONS: Record<string, React.ElementType> = {
  "Query Analyst": Search,
  "SQL Writer": FileText,
  "DuckDB Executor": Database,
  "Answer Synthesizer": Cpu,
  "Reviewer": ShieldCheck,
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
  sql?: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
}

function AgentStepRow({ step }: { step: AgentStep }) {
  const Icon = AGENT_ICONS[step.agent] ?? Cpu;
  return (
    <div className="flex items-start gap-2 py-1">
      <div
        className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: step.status === "done" ? "rgba(34,197,94,0.1)" : step.status === "error" ? "rgba(239,68,68,0.1)" : "rgba(232,119,34,0.1)",
        }}
      >
        {step.status === "running" ? (
          <Loader2 size={10} className="animate-spin" style={{ color: ORANGE }} />
        ) : step.status === "done" ? (
          <CheckCircle2 size={10} style={{ color: "#22C55E" }} />
        ) : (
          <XCircle size={10} style={{ color: "#EF4444" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon size={9} style={{ color: "#9CA3AF" }} />
          <span className="text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>
            {step.agent}
          </span>
        </div>
        {step.output && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#9CA3AF", fontFamily: "DM Mono, monospace", fontSize: 10 }}>
            {step.output.length > 120 ? step.output.slice(0, 120) + "…" : step.output}
          </p>
        )}
      </div>
    </div>
  );
}

function ResultTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  const displayRows = rows.slice(0, 15);
  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid #E8E9EC" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              {columns.map(c => (
                <th key={c} className="px-2 py-1.5 text-left font-semibold" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid #F3F4F6", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                {columns.map(c => {
                  const val = row[c];
                  const isNum = typeof val === "number";
                  const display = isNum && String(c).toLowerCase().includes("spend")
                    ? `$${(val as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : val === null || val === undefined ? "—" : String(val);
                  return (
                    <td key={c} className="px-2 py-1.5" style={{ color: isNum ? NAVY : "#374151", fontFamily: isNum ? "DM Mono, monospace" : "DM Sans, sans-serif", whiteSpace: "nowrap" }}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 15 && (
        <div className="px-3 py-1.5 text-xs" style={{ color: "#9CA3AF", background: "#F9FAFB", borderTop: "1px solid #F3F4F6", fontFamily: "DM Sans, sans-serif" }}>
          Showing 15 of {rows.length} rows
        </div>
      )}
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  // Lightweight renderer for the subset of markdown the synthesizer emits:
  // **bold**, `code`, headings (##/###), numbered lists, "-" or "*" bullet lists,
  // and blank-line paragraph breaks. No external deps.
  const renderInline = (s: string, keyPrefix: string) => {
    const out: React.ReactNode[] = [];
    // Match **bold** or `code`; everything else falls through as text.
    const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push(s.slice(last, m.index));
      if (m[1] !== undefined) {
        out.push(<strong key={`${keyPrefix}-b-${i++}`} style={{ fontWeight: 600, color: "#111827" }}>{m[1]}</strong>);
      } else if (m[2] !== undefined) {
        out.push(
          <code
            key={`${keyPrefix}-c-${i++}`}
            style={{ fontFamily: "DM Mono, monospace", fontSize: "0.92em", background: "#F3F4F6", padding: "1px 4px", borderRadius: 4 }}
          >
            {m[2]}
          </code>
        );
      }
      last = re.lastIndex;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") { i++; continue; }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const size = level <= 2 ? 15 : 14;
      blocks.push(
        <div key={key++} style={{ fontSize: size, fontWeight: 600, color: "#111827", marginTop: 8, marginBottom: 4, fontFamily: "Sora, sans-serif" }}>
          {renderInline(headingMatch[2], `h${key}`)}
        </div>
      );
      i++;
      continue;
    }

    // Numbered list block
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} style={{ listStyle: "decimal", paddingLeft: 20, margin: "4px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `ol${key}-${idx}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Bullet list block
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} style={{ listStyle: "disc", paddingLeft: 20, margin: "4px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `ul${key}-${idx}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Paragraph: consume consecutive non-empty, non-list, non-heading lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^#{1,4}\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={key++} style={{ margin: "0 0 6px 0" }}>
        {renderInline(paraLines.join(" "), `p${key}`)}
      </p>
    );
  }

  return <>{blocks}</>;
}

function MessageBubble({ msg }: { msg: Message }) {
  const [showSteps, setShowSteps] = useState(false);
  const [showSql, setShowSql] = useState(false);

  // NOTE: hooks must be called before any conditional returns (Rules of Hooks)
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-xs rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm"
          style={{ background: NAVY, color: "white", fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}
        >
          {msg.content}
        </div>
      </div>
    );
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <div className="flex gap-2 mb-4">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "rgba(232,119,34,0.12)" }}
      >
        <Sparkles size={11} style={{ color: ORANGE }} />
      </div>
      <div className="flex-1 min-w-0">
        {/* Agent steps collapsible */}
        {msg.steps && msg.steps.length > 0 && (
          <div className="mb-2 rounded-lg overflow-hidden" style={{ border: "1px solid #F3F4F6" }}>
            <button
              onClick={() => setShowSteps(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs"
              style={{ background: "#F9FAFB", color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
            >
              <span className="font-semibold">Agent Pipeline · {msg.steps.filter(s => s.status === "done").length}/{msg.steps.length} steps</span>
              <ChevronRight size={12} style={{ transform: showSteps ? "rotate(90deg)" : "none", transition: "transform 150ms" }} />
            </button>
            {showSteps && (
              <div className="px-3 py-2 space-y-0.5" style={{ background: "white" }}>
                {msg.steps.map((s, i) => <AgentStepRow key={i} step={s} />)}
              </div>
            )}
          </div>
        )}

        {/* Answer */}
        <div
          className="text-sm leading-relaxed"
          style={{ color: "#1F2937", fontFamily: "DM Sans, sans-serif" }}
        >
          <MarkdownText text={msg.content} />
        </div>

        {/* Data table */}
        {msg.columns && msg.rows && msg.rows.length > 0 && (
          <ResultTable columns={msg.columns} rows={msg.rows} />
        )}

        {/* SQL toggle */}
        {msg.sql && (
          <div className="mt-2">
            <button
              onClick={() => setShowSql(v => !v)}
              className="text-xs flex items-center gap-1"
              style={{ color: "#9CA3AF", fontFamily: "DM Mono, monospace" }}
            >
              <Database size={9} />
              {showSql ? "Hide SQL" : "View SQL"}
            </button>
            {showSql && (
              <pre
                className="mt-1.5 p-2.5 rounded-lg text-xs overflow-x-auto"
                style={{ background: "#F8F9FA", color: "#374151", fontFamily: "DM Mono, monospace", fontSize: 10, lineHeight: 1.6 }}
              >
                {msg.sql}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIChatDrawer() {
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading || !data) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setActiveSteps([]);

    const steps: AgentStep[] = [];

    try {
      const answer = await runAgentPipeline(
        question,
        data.suppliers,
        data.summary,
        (step) => {
          // Update or add the step
          const idx = steps.findIndex(s => s.agent === step.agent);
          if (idx >= 0) steps[idx] = step;
          else steps.push(step);
          setActiveSteps([...steps]);
        }
      );

      // Extract SQL and rows from steps
      const sqlStep = steps.find(s => s.agent === "SQL Writer" || s.agent === "DuckDB Executor");
      const execStep = steps.find(s => s.agent === "DuckDB Executor");

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        steps: [...steps],
        sql: sqlStep?.sql,
        rows: execStep?.rows,
        columns: execStep?.columns,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: `Error: ${String(err)}`, steps: [...steps] },
      ]);
    } finally {
      setLoading(false);
      setActiveSteps([]);
    }
  };

  if (!data) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-transform active:scale-95"
          style={{
            background: ORANGE,
            color: "white",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(232,119,34,0.4)",
          }}
        >
          <Sparkles size={14} />
          Ask AI
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.15)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 420,
          background: "white",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid #F3F4F6", background: NAVY }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(232,119,34,0.2)" }}>
              <Sparkles size={14} style={{ color: ORANGE }} />
            </div>
            <div>
              <div className="font-semibold text-sm text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                TailSpend AI
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "DM Sans, sans-serif" }}>
                4-agent pipeline · DuckDB SQL
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
          {messages.length === 0 && (
            <div>
              <div className="text-center mb-5 mt-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(232,119,34,0.08)" }}>
                  <Sparkles size={18} style={{ color: ORANGE }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}>Ask about your spend data</p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  I have full context of your {data.summary.total_count.toLocaleString()} suppliers and ${(data.summary.total_spend / 1e6).toFixed(1)}M in spend.
                </p>
              </div>
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#C4C9D4", fontFamily: "DM Sans, sans-serif" }}>
                  Suggested Questions
                </p>
                <div className="space-y-1.5">
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left rounded-lg px-3 py-2 text-xs transition-colors hover:bg-orange-50"
                      style={{
                        background: "#F9FAFB",
                        color: "#374151",
                        border: "1px solid #F3F4F6",
                        fontFamily: "DM Sans, sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      <ChevronRight size={11} style={{ color: ORANGE, flexShrink: 0, display: "inline", marginRight: 4 }} />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-center text-xs mt-4" style={{ color: "#C4C9D4", fontFamily: "DM Sans, sans-serif" }}>
                Powered by Claude · Context: {data.summary.total_count.toLocaleString()} suppliers
              </p>
            </div>
          )}

          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

          {/* Active pipeline progress */}
          {loading && activeSteps.length > 0 && (
            <div className="flex gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(232,119,34,0.12)" }}>
                <Loader2 size={11} className="animate-spin" style={{ color: ORANGE }} />
              </div>
              <div className="flex-1 rounded-lg p-3" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>
                  Running agent pipeline…
                </p>
                {activeSteps.map((s, i) => <AgentStepRow key={i} step={s} />)}
              </div>
            </div>
          )}

          {loading && activeSteps.length === 0 && (
            <div className="flex gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(232,119,34,0.12)" }}>
                <Loader2 size={11} className="animate-spin" style={{ color: ORANGE }} />
              </div>
              <div className="text-xs py-1.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                Initializing agents…
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 shrink-0" style={{ borderTop: "1px solid #F3F4F6" }}>
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about suppliers, spend, savings…"
              disabled={loading}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={{
                background: "#F9FAFB",
                border: "1px solid #E8E9EC",
                color: NAVY,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity"
              style={{
                background: ORANGE,
                opacity: loading || !input.trim() ? 0.5 : 1,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" style={{ color: "white" }} />
              ) : (
                <ChevronRight size={14} style={{ color: "white" }} />
              )}
            </button>
          </form>
          <p className="text-center text-xs mt-2" style={{ color: "#C4C9D4", fontFamily: "DM Sans, sans-serif" }}>
            Queries run in-browser via DuckDB · No data leaves your device
          </p>
        </div>
      </div>
    </>
  );
}
