// TailSpend AI — 4-Agent Pipeline
// Agent 1: Query Analyst — understands intent and extracts structured query plan
// Agent 2: SQL Writer — generates DuckDB SQL from the query plan
// Agent 3: DuckDB Executor — runs SQL in-browser, returns structured results
// Agent 4: Answer Synthesizer — writes a clear business answer from the results
// Reviewer: checks the answer for accuracy and flags issues

import { getSchema, loadSuppliers, runQuery } from "./duckdb";
import type { Supplier } from "@/contexts/DataContext";

// LLM transport: same-origin POST to /api/chat, served by the Vite dev plugin
// `bedrock-chat-proxy` (see vite.config.ts). The proxy speaks an OpenAI-shaped
// envelope so this client stays simple. DEV ONLY \u2014 production builds do not
// expose /api/chat.
export interface AgentStep {
  agent: string;
  status: "running" | "done" | "error";
  output?: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
}

export type StepCallback = (step: AgentStep) => void;

async function callLLM(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function runAgentPipeline(
  question: string,
  suppliers: Supplier[],
  summary: { total_count: number; total_spend: number; file_name: string },
  onStep: StepCallback
): Promise<string> {
  // ── AGENT 1: Query Analyst ──────────────────────────────────────────────────
  onStep({ agent: "Query Analyst", status: "running" });
  const schema = getSchema();

  const analystSystem = `You are a procurement data analyst. Your job is to understand a user's question about supplier spend data and produce a structured query plan.

The database has this schema:
${schema}

Respond in JSON with this exact structure:
{
  "intent": "brief description of what the user wants",
  "query_type": "aggregation|filter|ranking|comparison|lookup",
  "key_filters": ["list of filters to apply"],
  "key_metrics": ["list of metrics to compute"],
  "needs_sql": true,
  "complexity": "simple|medium|complex"
}`;

  let queryPlan: { intent: string; query_type: string; key_filters: string[]; key_metrics: string[]; needs_sql: boolean; complexity: string };
  try {
    const planRaw = await callLLM(analystSystem, `User question: "${question}"`);
    const jsonMatch = planRaw.match(/\{[\s\S]*\}/);
    queryPlan = JSON.parse(jsonMatch?.[0] ?? planRaw);
    onStep({ agent: "Query Analyst", status: "done", output: queryPlan.intent });
  } catch {
    queryPlan = { intent: question, query_type: "filter", key_filters: [], key_metrics: ["total_spend", "count"], needs_sql: true, complexity: "simple" };
    onStep({ agent: "Query Analyst", status: "done", output: "Proceeding with direct query" });
  }

  // ── AGENT 2: SQL Writer ─────────────────────────────────────────────────────
  onStep({ agent: "SQL Writer", status: "running" });

  const sqlWriterSystem = `You are an expert DuckDB SQL writer for procurement analytics. Write a single DuckDB SQL query to answer the user's question.

Database schema:
${schema}

Rules:
- Write ONLY the SQL statement, no explanation, no markdown code blocks
- Use ILIKE for case-insensitive string matching
- Always LIMIT to 50 rows unless it's a COUNT or SUM aggregation
- For spend values, round to 2 decimal places
- Use column aliases that are human-readable (e.g., "Total Spend" not "sum_total_spend")
- tiering values: '<$50K', '$50K-$100K', '$100K - $250K', '$250K - $500K', '$500K+'
- confidence values: 'High', 'Medium', 'Low'
- evidence_tier values: 'A', 'B', 'C' (may also appear as 'Tier A' etc.)`;

  const sqlPrompt = `Query plan:
Intent: ${queryPlan.intent}
Type: ${queryPlan.query_type}
Filters: ${queryPlan.key_filters.join(", ")}
Metrics: ${queryPlan.key_metrics.join(", ")}

Original question: "${question}"

Write the DuckDB SQL query:`;

  let sql = "";
  try {
    sql = (await callLLM(sqlWriterSystem, sqlPrompt, 512)).trim();
    // Strip markdown code fences if present
    sql = sql.replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    onStep({ agent: "SQL Writer", status: "done", output: sql, sql });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[agentPipeline] SQL Writer failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    onStep({ agent: "SQL Writer", status: "error", output: msg });
    return `I couldn't generate a SQL query for that question. (${msg})`;
  }

  // ── AGENT 3: DuckDB Executor ────────────────────────────────────────────────
  onStep({ agent: "DuckDB Executor", status: "running" });
  let queryResult: { columns: string[]; rows: Record<string, unknown>[] } = { columns: [], rows: [] };
  let sqlError = "";

  try {
    await loadSuppliers(suppliers);
    queryResult = await runQuery(sql);
    onStep({
      agent: "DuckDB Executor",
      status: "done",
      output: `${queryResult.rows.length} rows returned`,
      columns: queryResult.columns,
      rows: queryResult.rows,
    });
  } catch (err) {
    sqlError = String(err);
    // Try to self-heal: ask SQL writer to fix the query
    try {
      const fixedSql = (await callLLM(
        sqlWriterSystem,
        `The following SQL failed with error: "${sqlError}"\n\nOriginal SQL:\n${sql}\n\nFix the SQL and return ONLY the corrected query:`
      )).trim().replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      queryResult = await runQuery(fixedSql);
      sql = fixedSql;
      onStep({
        agent: "DuckDB Executor",
        status: "done",
        output: `Self-healed · ${queryResult.rows.length} rows returned`,
        columns: queryResult.columns,
        rows: queryResult.rows,
        sql: fixedSql,
      });
      sqlError = "";
    } catch (err2) {
      sqlError = String(err2);
      onStep({ agent: "DuckDB Executor", status: "error", output: `Query failed: ${sqlError}` });
    }
  }

  // ── AGENT 4: Answer Synthesizer ─────────────────────────────────────────────
  onStep({ agent: "Answer Synthesizer", status: "running" });

  // Detect single-row aggregation results (COUNT, SUM, AVG, etc.) and present
  // them explicitly so the LLM doesn't hedge with "only one row" disclaimers.
  const isAggregation =
    !sqlError &&
    queryResult.rows.length === 1 &&
    queryResult.columns.length <= 3;

  const dataContext = sqlError
    ? `The SQL query failed with error: ${sqlError}. Use the dataset summary above to answer if possible; otherwise tell the user the query couldn't run.`
    : queryResult.rows.length === 0
    ? "The query returned zero matching rows. State that clearly; do not invent data."
    : isAggregation
    ? `The query is an AGGREGATION and returned exactly one row. These values ARE the answer — do not say you need more data:\n${JSON.stringify(queryResult.rows[0], null, 2)}`
    : `Query returned ${queryResult.rows.length} row(s). This is the COMPLETE authoritative result set for the user's question — trust it:\nColumns: ${queryResult.columns.join(", ")}\nRows (showing up to 30):\n${JSON.stringify(queryResult.rows.slice(0, 30), null, 2)}`;

  const synthSystem = `You are a senior procurement consultant at AArete. Answer the user's question using the SQL query results below as the authoritative source of truth.

Ground-truth dataset summary (always trust these totals):
- Total suppliers: ${summary.total_count.toLocaleString()}
- Total spend: $${summary.total_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
- Source file: ${summary.file_name}

Hard rules:
- The query results provided ARE the answer. Do NOT say "based on the data provided I cannot determine" — if the result is a single COUNT/SUM/AVG row, that number IS the answer.
- Never claim you need more data when results are present. If results are empty, say so plainly.
- Lead with the direct numeric answer in the first sentence.
- Use dollar amounts with M/K suffixes for amounts ≥ $10K (e.g., $2.3M, $450K). Keep raw counts as integers with thousands separators.
- If the result is a list, format as a numbered list with the metric per item.
- Keep the answer under 250 words.
- Be specific and actionable — this is for a procurement team making decisions.
- Do NOT mention SQL, DuckDB, columns, or any technical detail.`;

  const synthPrompt = `User question: "${question}"

${dataContext}

Provide a clear, business-focused answer:`;

  let answer = "";
  try {
    answer = await callLLM(synthSystem, synthPrompt, 600);
    onStep({ agent: "Answer Synthesizer", status: "done", output: answer });
  } catch (e) {
    answer = "I encountered an error generating the answer. Please try again.";
    onStep({ agent: "Answer Synthesizer", status: "error", output: String(e) });
    return answer;
  }

  // ── REVIEWER: Sanity check ───────────────────────────────────────────────────
  onStep({ agent: "Reviewer", status: "running" });

  const reviewSystem = `You are a quality reviewer for procurement analytics answers.
Check if the answer is accurate, complete, and appropriate given the data.
Only refine the answer if it is clearly wrong, hedges unnecessarily (e.g. says "I cannot determine" when data rows were provided), or omits a number that's in the data. Otherwise approve as-is.
Respond with JSON: { "approved": true/false, "issues": "description of issues or empty string", "refined_answer": "improved answer or same answer if approved" }`;

  try {
    const reviewRaw = await callLLM(
      reviewSystem,
      `Question: "${question}"\nData rows: ${queryResult.rows.length}\nAnswer to review:\n${answer}`,
      400
    );
    const jsonMatch = reviewRaw.match(/\{[\s\S]*\}/);
    const review = JSON.parse(jsonMatch?.[0] ?? "{}");
    if (review.refined_answer) answer = review.refined_answer;
    onStep({
      agent: "Reviewer",
      status: "done",
      output: review.approved ? "✓ Answer approved" : `Refined: ${review.issues}`,
    });
  } catch {
    onStep({ agent: "Reviewer", status: "done", output: "✓ Review skipped" });
  }

  return answer;
}
