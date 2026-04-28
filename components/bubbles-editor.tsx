"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Group, Rect, Text } from "react-konva";
import type Konva from "konva";

export type Bubble = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

const CANVAS = 600;

export function BubblesEditor({
  imageUrl,
  initialBubbles,
  onSave,
  onClose,
}: {
  imageUrl: string;
  initialBubbles: Bubble[];
  onSave: (bubbles: Bubble[]) => Promise<void>;
  onClose: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(initialBubbles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = imageUrl;
    i.onload = () => setImg(i);
  }, [imageUrl]);

  const selected = useMemo(
    () => bubbles.find((b) => b.id === selectedId) ?? null,
    [bubbles, selectedId],
  );

  function addBubble() {
    const id = crypto.randomUUID();
    setBubbles((prev) => [
      ...prev,
      { id, x: 0.3, y: 0.1, width: 0.4, height: 0.15, text: "..." },
    ]);
    setSelectedId(id);
  }

  function updateBubble(id: string, patch: Partial<Bubble>) {
    setBubbles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  }

  function deleteBubble(id: string) {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(bubbles);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-light text-zinc-50">Bulles</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <div
            className="relative overflow-hidden rounded-lg border border-zinc-900"
            style={{ width: CANVAS, height: CANVAS }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            <Stage
              ref={stageRef}
              width={CANVAS}
              height={CANVAS}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                {img && (
                  <KImage image={img} width={CANVAS} height={CANVAS} />
                )}
                {bubbles.map((b) => (
                  <BubbleNode
                    key={b.id}
                    bubble={b}
                    isSelected={b.id === selectedId}
                    onSelect={() => setSelectedId(b.id)}
                    onChange={(patch) => updateBubble(b.id, patch)}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {selected ? (
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Bulle sélectionnée
              </p>
              <textarea
                value={selected.text}
                onChange={(e) =>
                  updateBubble(selected.id, { text: e.target.value })
                }
                rows={2}
                className="mt-2 w-full resize-none rounded-md border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
              <div className="mt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => deleteBubble(selected.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-200"
                >
                  Désélectionner
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Cliquez une bulle pour l&apos;éditer, ou ajoutez-en une nouvelle.
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addBubble}
              className="rounded-full border border-zinc-800 px-4 py-2 text-xs text-zinc-300 hover:border-zinc-600"
            >
              + Ajouter une bulle
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-zinc-100 px-6 py-2 text-sm font-medium text-black transition hover:bg-amber-200 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BubbleNode({
  bubble,
  isSelected,
  onSelect,
  onChange,
}: {
  bubble: Bubble;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Bubble>) => void;
}) {
  const x = bubble.x * CANVAS;
  const y = bubble.y * CANVAS;
  const w = bubble.width * CANVAS;
  const h = bubble.height * CANVAS;

  return (
    <Group
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x() / CANVAS,
          y: e.target.y() / CANVAS,
        });
      }}
    >
      <Rect
        width={w}
        height={h}
        fill="white"
        stroke={isSelected ? "#fbbf24" : "#111"}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={Math.min(w, h) / 3}
        shadowColor="black"
        shadowBlur={6}
        shadowOpacity={0.3}
      />
      <Text
        text={bubble.text}
        width={w - 16}
        height={h - 16}
        x={8}
        y={8}
        fontSize={Math.max(12, h / 5)}
        fontFamily="var(--font-geist-sans), Arial"
        fill="#0a0a0a"
        align="center"
        verticalAlign="middle"
        wrap="word"
        listening={false}
      />
    </Group>
  );
}
