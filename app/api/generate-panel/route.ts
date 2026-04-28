import { NextResponse } from "next/server";
import { generatePanel } from "@/lib/fal";
import { generateFinalPrompt, type StylePreset } from "@/lib/prompts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  comicId: string;
  characterId: string;
  panelAction: string;
  orderIndex: number;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  if (!body.comicId || !body.characterId || !body.panelAction?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Verify the comic belongs to the user before we burn an API call.
  const { data: comic } = await supabase
    .from("comics")
    .select("id")
    .eq("id", body.comicId)
    .eq("user_id", user.id)
    .single();
  if (!comic) {
    return NextResponse.json({ error: "comic not found" }, { status: 404 });
  }

  const { data: character, error: charErr } = await supabase
    .from("characters")
    .select("name, physical_description, facial_reference_url, style_preset")
    .eq("id", body.characterId)
    .eq("user_id", user.id)
    .single();
  if (charErr || !character) {
    return NextResponse.json({ error: "character not found" }, { status: 404 });
  }

  const prompt = generateFinalPrompt({
    characterName: character.name,
    characterDescription: character.physical_description,
    stylePreset: character.style_preset as StylePreset,
    panelAction: body.panelAction,
  });

  const imageUrl = await generatePanel({
    prompt,
    referenceImageUrl: character.facial_reference_url,
  });

  // Upsert keyed on (comic_id, order_index) so regenerations replace the slot
  // rather than failing on the unique constraint.
  const { data: panel, error: upsertErr } = await supabase
    .from("panels")
    .upsert(
      {
        comic_id: body.comicId,
        image_url: imageUrl,
        prompt_action: body.panelAction,
        order_index: body.orderIndex,
        bubbles_json: [],
      },
      { onConflict: "comic_id,order_index" },
    )
    .select()
    .single();
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ panel });
}
