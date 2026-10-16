"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CHECK_TYPES, type CheckType } from "@/db/schema";

type Case = { id: number; input: string; checkType: CheckType; expected: string | null; rubric: string | null; tags: string[] };
const empty = { input: "", checkType: "judge" as CheckType, expected: "", rubric: "", tags: "" };
type Form = typeof empty;

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [editing, setEditing] = useState<number | "new">();
  const [form, setForm] = useState<Form>(empty);
  const [err, setErr] = useState<string>();

  const load = useCallback(async () => setCases(await (await fetch("/api/cases")).json()), []);
  useEffect(() => {
    load();
  }, [load]);

  const edit = (c?: Case) => {
    setErr(undefined);
    setEditing(c ? c.id : "new");
    setForm(c ? { input: c.input, checkType: c.checkType, expected: c.expected ?? "", rubric: c.rubric ?? "", tags: c.tags.join(", ") } : empty);
  };

  async function save() {
    const body = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    const res = await fetch(editing === "new" ? "/api/cases" : `/api/cases/${editing}`, {
      method: editing === "new" ? "POST" : "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return setErr((await res.json()).error);
    setEditing(undefined);
    load();
  }

  async function remove(c: Case) {
    if (!confirm(`Delete case ${c.id}? Its results in past runs are deleted too.`)) return;
    await fetch(`/api/cases/${c.id}`, { method: "DELETE" });
    load();
  }

  const field = "w-full rounded border bg-transparent p-1";
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const formEl = (
    <div className="space-y-2 rounded border p-3">
      <textarea className={field} rows={3} placeholder="Input" value={form.input} onChange={set("input")} />
      <select className={field} value={form.checkType} onChange={set("checkType")}>
        {CHECK_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      {form.checkType === "judge" ? (
        <textarea className={field} rows={3} placeholder="Rubric" value={form.rubric} onChange={set("rubric")} />
      ) : (
        <textarea className={field} rows={2} placeholder="Expected (string / regex / JSON schema)" value={form.expected} onChange={set("expected")} />
      )}
      <input className={field} placeholder="Tags, comma separated" value={form.tags} onChange={set("tags")} />
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
      <h1 className="text-2xl font-semibold">Test cases ({cases.length})</h1>
      {editing === "new" ? formEl : <button className="rounded bg-foreground px-3 py-1 text-background" onClick={() => edit()}>New case</button>}
      <ul className="space-y-2">
        {cases.map((c) => (
          <li key={c.id}>
            {editing === c.id ? (
              formEl
            ) : (
              <div className="flex items-start gap-3 border-b pb-2">
                <div className="flex-1">
                  <p className="line-clamp-2">{c.input}</p>
                  <p className="text-xs text-zinc-500">
                    #{c.id} · {c.checkType} {c.tags.map((t) => `#${t}`).join(" ")}
                  </p>
                </div>
                <button className="underline" onClick={() => edit(c)}>Edit</button>
                <button className="text-red-600 underline" onClick={() => remove(c)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
