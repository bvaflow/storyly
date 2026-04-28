"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CharacterForm } from "@/components/character-form";
import { LAYOUTS, LAYOUT_LIST, type LayoutType } from "@/lib/layouts";
import type { Bubble } from "@/components/bubbles-editor";

const BubblesEditor = dynamic(
  () => import("@/components/bubbles-editor").then((m) => m.BubblesEditor),
  { ssr: false },
);

type Character = {
  id: string;
  name: string;
  facial_reference_url: string;
  style_preset?: string;
};

type PanelState = {
  panelId: string | null;
  promptAction: string;
  imageUrl: string | null;
  bubbles: Bubble[];
  status: "idle" | "generating" | "done" | "error";
  error?: string;
};

export type DraftSnapshot = {
  comicId: string;
  title: string;
  layoutType: LayoutType;
  characterId: string | null;
  finalized: boolean;
  panels: Array<{
    panelId: string;
    imageUrl: string;
    promptAction: string;
    orderIndex: number;
    bubbles: Bubble[];
  }>;
};

type Step = 1 | 2 | 3 | 4;

function hydrateDraft(draft: DraftSnapshot): {
  panels: PanelState[];
  startStep: Step;
} {
  const count = LAYOUTS[draft.layoutType].count;
  const byIndex = new Map(draft.panels.map((p) => [p.orderIndex, p]));
  const panels: PanelState[] = Array.from({ length: count }, (_, i) => {
    const p = byIndex.get(i);
    if (!p) {
      return {
        panelId: null,
        promptAction: "",
        imageUrl: null,
        bubbles: [],
        status: "idle",
      };
    }
    return {
      panelId: p.panelId,
      promptAction: p.promptAction,
      imageUrl: p.imageUrl,
      bubbles: p.bubbles,
      status: "done",
    };
  });
  const allDone = panels.every((p) => p.status === "done");
  return { panels, startStep: allDone ? 4 : 3 };
}

export function CreateFlow({
  initialCharacters,
  initialDraft,
}: {
  initialCharacters: Character[];
  initialDraft?: DraftSnapshot | null;
}) {
  const router = useRouter();
  const hydrated = initialDraft ? hydrateDraft(initialDraft) : null;

  const [step, setStep] = useState<Step>(hydrated?.startStep ?? 1);
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    initialDraft?.characterId ?? null,
  );
  const [showForm, setShowForm] = useState(
    !initialDraft && initialCharacters.length === 0,
  );

  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [layoutType, setLayoutType] = useState<LayoutType>(
    initialDraft?.layoutType ?? "grid_2x3",
  );
  const [comicId, setComicId] = useState<string | null>(
    initialDraft?.comicId ?? null,
  );
  const [panels, setPanels] = useState<PanelState[]>(hydrated?.panels ?? []);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step2Submitting, setStep2Submitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  async function handleFinalize() {
    if (!comicId) return;
    setFinalizing(true);
    const res = await fetch(`/api/comics/${comicId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ finalize: true }),
    });
    setFinalizing(false);
    if (res.ok) router.push("/dashboard");
  }

  async function handleStep2Submit() {
    if (!selectedCharacterId || !title.trim()) return;
    setStep2Submitting(true);
    setStep2Error(null);

    const res = await fetch("/api/comics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        layoutType,
        characterId: selectedCharacterId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStep2Error(json.error ?? "Erreur");
      setStep2Submitting(false);
      return;
    }

    setComicId(json.comic.id);
    setPanels(
      Array.from({ length: LAYOUTS[layoutType].count }, () => ({
        panelId: null,
        promptAction: "",
        imageUrl: null,
        bubbles: [],
        status: "idle",
      })),
    );
    setStep(3);
    setStep2Submitting(false);
  }

  async function generateOne(orderIndex: number) {
    if (!comicId || !selectedCharacterId) return;
    const panel = panels[orderIndex];
    if (!panel?.promptAction.trim()) return;

    setPanels((prev) =>
      prev.map((p, i) =>
        i === orderIndex ? { ...p, status: "generating", error: undefined } : p,
      ),
    );

    try {
      const res = await fetch("/api/generate-panel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          comicId,
          characterId: selectedCharacterId,
          panelAction: panel.promptAction,
          orderIndex,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");

      setPanels((prev) =>
        prev.map((p, i) =>
          i === orderIndex
            ? {
                ...p,
                panelId: json.panel.id,
                imageUrl: json.panel.image_url,
                bubbles: (json.panel.bubbles_json as Bubble[]) ?? [],
                status: "done",
              }
            : p,
        ),
      );
    } catch (err) {
      setPanels((prev) =>
        prev.map((p, i) =>
          i === orderIndex
            ? { ...p, status: "error", error: (err as Error).message }
            : p,
        ),
      );
    }
  }

  async function generateAll() {
    const targets = panels
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.promptAction.trim() && p.status !== "generating");
    await Promise.all(targets.map(({ i }) => generateOne(i)));
  }

  const allDone = panels.length > 0 && panels.every((p) => p.status === "done");

  return (
    <>
      <header>
        <h1 className="text-4xl font-light tracking-tight text-zinc-50">
          {initialDraft ? initialDraft.title : "Nouvel album"}
        </h1>
        <p className="mt-3 text-zinc-400">
          Étape {step} sur 4 — {STEP_LABELS[step]}
        </p>
      </header>

      <div className="mt-12">
        {step === 1 && (
          <Step1
            characters={characters}
            selectedId={selectedCharacterId}
            onSelect={setSelectedCharacterId}
            showForm={showForm}
            onToggleForm={() => setShowForm((v) => !v)}
            onCreated={(char) => {
              setCharacters((prev) => [char, ...prev]);
              setSelectedCharacterId(char.id);
              setShowForm(false);
            }}
            onContinue={() => selectedCharacterId && setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            title={title}
            onTitle={setTitle}
            layoutType={layoutType}
            onLayout={setLayoutType}
            error={step2Error}
            submitting={step2Submitting}
            onBack={() => setStep(1)}
            onContinue={handleStep2Submit}
          />
        )}
        {step === 3 && comicId && (
          <Step3
            layoutType={layoutType}
            panels={panels}
            onPromptChange={(i, v) =>
              setPanels((prev) =>
                prev.map((p, idx) =>
                  idx === i ? { ...p, promptAction: v } : p,
                ),
              )
            }
            onGenerateOne={generateOne}
            onGenerateAll={generateAll}
            allDone={allDone}
            onContinue={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4
            layoutType={layoutType}
            panels={panels}
            onUpdateBubbles={(orderIndex, bubbles) =>
              setPanels((prev) =>
                prev.map((p, i) =>
                  i === orderIndex ? { ...p, bubbles } : p,
                ),
              )
            }
            onBack={() => setStep(3)}
            onFinalize={handleFinalize}
            finalizing={finalizing}
          />
        )}
      </div>
    </>
  );
}

const STEP_LABELS: Record<Step, string> = {
  1: "Choisissez votre personnage",
  2: "Titre et layout",
  3: "Génération des cases",
  4: "Bulles et validation",
};

// ============ Step 1 ============

function Step1({
  characters,
  selectedId,
  onSelect,
  showForm,
  onToggleForm,
  onCreated,
  onContinue,
}: {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showForm: boolean;
  onToggleForm: () => void;
  onCreated: (c: Character) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-10">
      {characters.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-zinc-500">
            Personnages existants
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {characters.map((c) => {
              const selected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`group relative aspect-3/4 overflow-hidden rounded-xl border text-left transition ${
                    selected
                      ? "border-amber-200/60 ring-2 ring-amber-200/30"
                      : "border-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <Image
                    src={c.facial_reference_url}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-3 text-sm text-zinc-100">
                    {c.name}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <button
          type="button"
          onClick={onToggleForm}
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          {showForm ? "— Masquer le formulaire" : "+ Créer un nouveau personnage"}
        </button>
        {showForm && (
          <div className="mt-6 rounded-xl border border-amber-200/30 bg-amber-200/2 p-6">
            <CharacterForm onCreated={onCreated} />
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedId}
          className="rounded-full bg-zinc-100 px-8 py-3 text-sm font-medium text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}

// ============ Step 2 ============

function Step2({
  title,
  onTitle,
  layoutType,
  onLayout,
  error,
  submitting,
  onBack,
  onContinue,
}: {
  title: string;
  onTitle: (v: string) => void;
  layoutType: LayoutType;
  onLayout: (l: LayoutType) => void;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500">
          Titre de l&apos;album
        </h2>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="ex: Lila et le dragon de la forêt"
          className="mt-3 w-full rounded-lg border border-zinc-800 bg-transparent px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
        />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500">
          Layout
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {LAYOUT_LIST.map((spec) => {
            const selected = layoutType === spec.type;
            return (
              <button
                key={spec.type}
                type="button"
                onClick={() => onLayout(spec.type)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-amber-200/60 ring-2 ring-amber-200/30"
                    : "border-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className={`${spec.gridClass} aspect-square gap-1`}>
                  {Array.from({ length: spec.count }).map((_, i) => (
                    <div key={i} className="rounded-sm bg-zinc-800" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-zinc-100">{spec.label}</p>
                <p className="text-xs text-zinc-500">{spec.tagline}</p>
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          ← Retour
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!title.trim() || submitting}
          className="rounded-full bg-zinc-100 px-8 py-3 text-sm font-medium text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Création..." : "Continuer →"}
        </button>
      </div>
    </div>
  );
}

// ============ Step 3 ============

function Step3({
  layoutType,
  panels,
  onPromptChange,
  onGenerateOne,
  onGenerateAll,
  allDone,
  onContinue,
  onBack,
}: {
  layoutType: LayoutType;
  panels: PanelState[];
  onPromptChange: (i: number, v: string) => void;
  onGenerateOne: (i: number) => void;
  onGenerateAll: () => void;
  allDone: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  const spec = LAYOUTS[layoutType];
  const anyGenerating = panels.some((p) => p.status === "generating");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Décrivez l&apos;action de chaque case, puis générez. La génération
          prend 5 à 15 secondes.
        </p>
        <button
          type="button"
          onClick={onGenerateAll}
          disabled={anyGenerating || panels.every((p) => !p.promptAction.trim())}
          className="rounded-full border border-zinc-800 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-600 disabled:opacity-40"
        >
          Tout générer en parallèle
        </button>
      </div>

      <div className={`${spec.gridClass} gap-4`}>
        {panels.map((panel, i) => (
          <PanelCell
            key={i}
            index={i}
            panel={panel}
            onPromptChange={(v) => onPromptChange(i, v)}
            onGenerate={() => onGenerateOne(i)}
          />
        ))}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          ← Retour
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!allDone}
          className="rounded-full bg-zinc-100 px-8 py-3 text-sm font-medium text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}

function PanelCell({
  index,
  panel,
  onPromptChange,
  onGenerate,
}: {
  index: number;
  panel: PanelState;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950">
      <div className="relative aspect-square">
        {panel.status === "generating" && (
          <div className="absolute inset-0 animate-pulse bg-zinc-900" />
        )}
        {panel.imageUrl && panel.status !== "generating" && (
          <Image
            src={panel.imageUrl}
            alt={`Case ${index + 1}`}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
          />
        )}
        {!panel.imageUrl && panel.status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-700">
            #{index + 1}
          </div>
        )}
        {panel.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 p-3 text-center text-xs text-red-200">
            {panel.error}
          </div>
        )}
      </div>
      <div className="border-t border-zinc-900 p-3">
        <textarea
          value={panel.promptAction}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="ex: court dans la forêt enchantée"
          rows={2}
          className="w-full resize-none rounded-md border border-zinc-800 bg-transparent px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={
            !panel.promptAction.trim() || panel.status === "generating"
          }
          className="mt-2 w-full rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-amber-200 disabled:opacity-40"
        >
          {panel.status === "generating"
            ? "Génération..."
            : panel.imageUrl
              ? "Régénérer"
              : "Générer"}
        </button>
      </div>
    </div>
  );
}

// ============ Step 4 ============

function Step4({
  layoutType,
  panels,
  onUpdateBubbles,
  onBack,
  onFinalize,
  finalizing,
}: {
  layoutType: LayoutType;
  panels: PanelState[];
  onUpdateBubbles: (orderIndex: number, bubbles: Bubble[]) => void;
  onBack: () => void;
  onFinalize: () => void;
  finalizing: boolean;
}) {
  const spec = LAYOUTS[layoutType];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editing = editingIndex !== null ? panels[editingIndex] : null;

  async function saveBubbles(orderIndex: number, bubbles: Bubble[]) {
    const panel = panels[orderIndex];
    if (!panel?.panelId) return;
    const res = await fetch(`/api/panels/${panel.panelId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bubbles }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Échec de la sauvegarde");
    }
    onUpdateBubbles(orderIndex, bubbles);
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-400">
        Cliquez sur une case pour ajouter ou éditer ses bulles.
      </p>

      <div className={`${spec.gridClass} gap-4`}>
        {panels.map((panel, i) => (
          <button
            key={i}
            type="button"
            onClick={() => panel.imageUrl && setEditingIndex(i)}
            disabled={!panel.imageUrl}
            className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-900 transition hover:border-amber-200/40 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {panel.imageUrl && (
              <Image
                src={panel.imageUrl}
                alt={`Case ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
            )}
            {panel.bubbles.length > 0 && (
              <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-amber-200">
                {panel.bubbles.length}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs text-transparent transition group-hover:bg-black/40 group-hover:text-zinc-100">
              Éditer les bulles
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          ← Retour
        </button>
        <button
          type="button"
          onClick={onFinalize}
          disabled={finalizing}
          className="rounded-full bg-zinc-100 px-8 py-3 text-sm font-medium text-black transition hover:bg-amber-200 disabled:opacity-50"
        >
          {finalizing ? "Finalisation..." : "Terminer l'album"}
        </button>
      </div>

      {editing && editing.imageUrl && editingIndex !== null && (
        <BubblesEditor
          imageUrl={editing.imageUrl}
          initialBubbles={editing.bubbles}
          onSave={(bubbles) => saveBubbles(editingIndex, bubbles)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
}
