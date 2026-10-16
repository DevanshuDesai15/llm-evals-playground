"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Variant = { id: number; name: string; model: string; systemPrompt: string; temperature: number; maxTokens: number };
const empty = { name: "", model: "", systemPrompt: "", temperature: "0", maxTokens: "512" };
type Form = typeof empty;

export default function VariantsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [editing, setEditing] = useState<number | "new">();
  const [form, setForm] = useState<Form>(empty);
  const [err, setErr] = useState<string>();

  const load = useCallback(async () => setVariants(await (await fetch("/api/variants")).json()), []);
  useEffect(() => {
    load();
  }, [load]);

  const edit = (v?: Variant) => {
    setErr(undefined);
    setEditing(v ? v.id : "new");
    setForm(v ? { name: v.name, model: v.model, systemPrompt: v.systemPrompt, temperature: String(v.temperature), maxTokens: String(v.maxTokens) } : empty);
  };

  async function save() {
    const res = await fetch(editing === "new" ? "/api/variants" : `/api/variants/${editing}`, {
      method: editing === "new" ? "POST" : "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, temperature: Number(form.temperature), maxTokens: Number(form.maxTokens) }),
    });
    if (!res.ok) return setErr((await res.json()).error);
    setEditing(undefined);
    load();
  }

  async function remove(v: Variant) {
    if (!confirm(`Delete "${v.name}"? Its results in past runs are deleted too.`)) return;
    await fetch(`/api/variants/${v.id}`, { method: "DELETE" });
    load();
  }

  const field = "w-full rounded border bg-transparent p-1";
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const formEl = (
    <div className="space-y-2 rounded border p-3">
      <input className={field} placeholder="Name" value={form.name} onChange={set("name")} />
      <input className={field} placeholder="OpenRouter model slug, e.g. openai/gpt-6-luna" value={form.model} onChange={set("model")} />
      <textarea className={field} rows={4} placeholder="System prompt" value={form.systemPrompt} onChange={set("systemPrompt")} />
      <div className="flex gap-2">
        <label className="flex-1 text-sm">
          Temperature
          <input className={field} type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={set("temperature")} />
        </label>
        <label className="flex-1 text-sm">
          Max tokens
          <input className={field} type="number" min="1" value={form.maxTokens} onChange={set("maxTokens")} />
        </label>
      </div>
      {err && <p className="text-red-600">{err}</p>}
      <button className="mr-2 rounded bg-foreground px-3 py-1 text-background" onClick={save}>
        Save
      </button>
      <button className="underline" onClick={() => setEditing(undefined)}>
        Cancel
      </button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-8">
      <Link className="text-sm underline" href="/">
        ← Home
      </Link>
      <h1 className="text-2xl font-semibold">Variants ({variants.length})</h1>
      {editing === "new" ? formEl : <button className="rounded bg-foreground px-3 py-1 text-background" onClick={() => edit()}>New variant</button>}
      <ul className="space-y-2">
        {variants.map((v) => (
          <li key={v.id}>
            {editing === v.id ? (
              formEl
            ) : (
              <div className="flex items-start gap-3 border-b pb-2">
                <div className="flex-1">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-zinc-500">
                    {v.model} · temp {v.temperature} · max {v.maxTokens} tokens
                  </p>
                  <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{v.systemPrompt || "(no system prompt)"}</p>
                </div>
                <button className="underline" onClick={() => edit(v)}>Edit</button>
                <button className="text-red-600 underline" onClick={() => remove(v)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
