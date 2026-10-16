"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type V = { id: number; name: string; model: string };

export function StartRun() {
  const router = useRouter();
  const [vs, setVs] = useState<V[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    fetch("/api/variants")
      .then((r) => r.json())
      .then((d: V[]) => {
        setVs(d);
        setPicked(new Set(d.map((v) => v.id)));
      });
  }, []);

  const toggle = (id: number) => {
    const n = new Set(picked);
    if (!n.delete(id)) n.add(id);
    setPicked(n);
  };

  return (
    <div className="space-y-2">
      {vs.map((v) => (
        <label key={v.id} className="block">
          <input type="checkbox" className="mr-2" checked={picked.has(v.id)} onChange={() => toggle(v.id)} />
          {v.name} <span className="text-xs text-zinc-500">{v.model}</span>
        </label>
      ))}
      <button
        disabled={busy || !picked.size}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setErr(undefined);
          const res = await fetch("/api/runs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ variantIds: [...picked] }),
          });
          const body = await res.json();
          if (!res.ok) {
            setErr(body.error);
            setBusy(false);
          } else router.push(`/runs/${body.id}`);
        }}
      >
        {busy ? "Starting…" : `Start run (${picked.size} variant${picked.size === 1 ? "" : "s"})`}
      </button>
      {err && <p className="text-red-600">{err}</p>}
    </div>
  );
}
