import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { StartRun } from "./start-run";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = await db.select().from(runs).orderBy(desc(runs.id)).limit(10);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">LLM Evals Playground</h1>
      <StartRun />
      <ul className="space-y-1">
        {recent.map((r) => (
          <li key={r.id}>
            <Link className="underline" href={`/runs/${r.id}`}>
              Run {r.id}
            </Link>{" "}
            <span className="text-sm text-zinc-500">
              {r.status} · {r.createdAt.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
