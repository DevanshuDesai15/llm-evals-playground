"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  return (
    <div>
      <button
        disabled={busy}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/runs", { method: "POST" });
          const body = await res.json();
          if (!res.ok) {
            setErr(body.error);
            setBusy(false);
          } else router.push(`/runs/${body.id}`);
        }}
      >
        {busy ? "Starting…" : "Start run"}
      </button>
      {err && <p className="mt-2 text-red-600">{err}</p>}
    </div>
  );
}
