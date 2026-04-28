"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STYLES = [
  { value: "watercolor", label: "Aquarelle" },
  { value: "manga_kodomo", label: "Manga kodomo" },
  { value: "pixar_3d", label: "3D Pixar" },
  { value: "ligne_claire", label: "Ligne claire" },
  { value: "ghibli", label: "Ghibli" },
] as const;

type Created = {
  id: string;
  name: string;
  facial_reference_url: string;
};

export function CharacterForm({
  onCreated,
}: {
  onCreated: (character: Created) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]["value"]>(
    "watercolor",
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) {
      setError("Une photo est requise pour la cohérence du visage.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée — reconnectez-vous.");
      setSubmitting(false);
      return;
    }

    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("character-refs")
      .upload(path, photo, { contentType: photo.type });
    if (uploadErr) {
      setError(`Upload : ${uploadErr.message}`);
      setSubmitting(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("character-refs").getPublicUrl(path);

    const { data: inserted, error: insertErr } = await supabase
      .from("characters")
      .insert({
        user_id: user.id,
        name,
        physical_description: description,
        facial_reference_url: publicUrl,
        style_preset: style,
      })
      .select("id, name, facial_reference_url")
      .single();
    if (insertErr || !inserted) {
      setError(`Sauvegarde : ${insertErr?.message ?? "inconnue"}`);
      setSubmitting(false);
      return;
    }

    onCreated(inserted);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Prénom du héros">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Lila"
          className="w-full rounded-lg border border-zinc-800 bg-transparent px-4 py-2.5 text-zinc-100 outline-none focus:border-zinc-600"
        />
      </Field>

      <Field label="Description physique">
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="ex: 6 ans, cheveux bruns bouclés, yeux verts, t-shirt jaune"
          className="w-full rounded-lg border border-zinc-800 bg-transparent px-4 py-2.5 text-zinc-100 outline-none focus:border-zinc-600"
        />
      </Field>

      <Field label="Style graphique">
        <select
          value={style}
          onChange={(e) =>
            setStyle(e.target.value as (typeof STYLES)[number]["value"])
          }
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 outline-none focus:border-zinc-600"
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Photo de référence (visage)">
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-xs file:font-medium file:text-black hover:file:bg-amber-200"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Cette photo sert uniquement à conserver le visage entre les cases. Pas
          de partage, pas de revente.
        </p>
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-black transition hover:bg-amber-200 disabled:opacity-50"
      >
        {submitting ? "Création..." : "Créer le personnage"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
