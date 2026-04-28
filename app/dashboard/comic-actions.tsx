"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ComicActions({
  comicId,
  isFinalized,
  isPublic,
  hasPanels,
}: {
  comicId: string;
  isFinalized: boolean;
  isPublic: boolean;
  hasPanels: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { isPublic?: boolean }) {
    setError(null);
    const res = await fetch(`/api/comics/${comicId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Échec");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!confirm("Supprimer définitivement cet album ?")) return;
    setError(null);
    const res = await fetch(`/api/comics/${comicId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Échec");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      {!isFinalized && (
        <Link
          href={`/create?comicId=${comicId}`}
          className="rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-600"
        >
          Reprendre
        </Link>
      )}
      {hasPanels && (
        <a
          href={`/api/comics/${comicId}/pdf`}
          className="rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-600"
        >
          PDF HD
        </a>
      )}
      {isFinalized && (
        <button
          type="button"
          onClick={() => patch({ isPublic: !isPublic })}
          disabled={pending}
          className="rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
        >
          {isPublic ? "Rendre privé" : "Publier"}
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-full px-3 py-1.5 text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        Supprimer
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </div>
  );
}
