"use client";

import { Fragment, use, useEffect, useState } from "react";

type Data = {
  run: { id: number; status: "pending" | "running" | "done" | "failed" };
  results: {
    id: number;
    variant: string;
    input: string;
    output: string | null;
    error: string | null;
    latencyMs: number | null;
    costUsd: string | null;
    scores: { scorer: string; passed: boolean; reasoning: string | null }[];
  }[];
};

export default function RunPage({ params }: PageProps<"/runs/[id]">) {
  const { id } = use(params);
  const [data, setData] = useState<Data>();
  const [err, setErr] = useState<string>();
  const [open, setOpen] = useState<number>();
  const live = !data || data.run.status === "running" || data.run.status === "pending";

  useEffect(() => {
    if (!live) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!stop) setData(await res.json());
      } catch (e) {
        if (!stop) setErr(String(e));
      }
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id, live]);

  if (err && !data) return <p className="p-8 text-red-600">{err}</p>;
  if (!data) return <p className="p-8">Loading…</p>;
  const { run, results } = data;

  return (
    <main className="mx-auto w-full max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">
        Run {run.id} <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-sm dark:bg-zinc-800">{run.status}</span>
      </h1>
      <p className="mb-4 text-sm text-zinc-500">
        {results.length} results
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-2">Variant</th>
            <th className="pr-2">Input</th>
            <th className="pr-2">Output</th>
            <th className="pr-2">ms</th>
            <th>Checks</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <Fragment key={r.id}>
              <tr className="cursor-pointer border-b align-top hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setOpen(open === r.id ? undefined : r.id)}>
                <td className="py-1 pr-2 whitespace-nowrap">{r.variant}</td>
                <td className="max-w-48 truncate pr-2">{r.input}</td>
                <td className="max-w-64 truncate pr-2">{r.error ? <span className="text-red-600">{r.error}</span> : r.output || "(empty)"}</td>
                <td className="pr-2">{r.latencyMs}</td>
                <td className="whitespace-nowrap">
                  {r.scores.length ? r.scores.map((s) => `${s.passed ? "✓" : "✗"} ${s.scorer}`).join("  ") : "…"}
                </td>
              </tr>
              {open === r.id && (
                <tr className="border-b bg-zinc-50 dark:bg-zinc-900">
                  <td colSpan={5} className="space-y-3 p-3 whitespace-pre-wrap">
                    <Section title="Input">{r.input}</Section>
                    <Section title="Output">{r.error ? `Error: ${r.error}` : r.output || "(empty)"}</Section>
                    {r.scores.map((s) => (
                      <Section key={s.scorer} title={`${s.passed ? "✓" : "✗"} ${s.scorer}`}>
                        {s.reasoning ?? "(no reasoning)"}
                      </Section>
                    ))}
                    <p className="text-xs text-zinc-500">cost ${r.costUsd ?? "-"}</p>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-zinc-500">{title}</div>
      {children}
    </div>
  );
}
