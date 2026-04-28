export type StylePreset =
  | "watercolor"
  | "manga_kodomo"
  | "pixar_3d"
  | "ligne_claire"
  | "ghibli";

const STYLE_DESCRIPTIONS: Record<StylePreset, string> = {
  watercolor:
    "soft watercolor illustration, pastel palette, hand-painted children's book style",
  manga_kodomo:
    "kodomo manga style, clean ink lines, soft cel shading, expressive eyes",
  pixar_3d:
    "polished 3D animation style, warm cinematic lighting, family-friendly",
  ligne_claire:
    "classic European bande dessinée, ligne claire style, flat colors, Tintin/Hergé inspired",
  ghibli:
    "Studio Ghibli inspired illustration, lush backgrounds, gentle expressions, cinematic composition",
};

export type FinalPromptInput = {
  characterName: string;
  characterDescription: string;
  stylePreset: StylePreset;
  panelAction: string;
};

export function generateFinalPrompt({
  characterName,
  characterDescription,
  stylePreset,
  panelAction,
}: FinalPromptInput): string {
  const style = STYLE_DESCRIPTIONS[stylePreset];

  return [
    `${characterName}, ${characterDescription}`,
    panelAction,
    style,
    "single comic panel, cinematic framing, no speech bubbles, no text overlay",
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}
