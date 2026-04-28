import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LAYOUTS, type LayoutType } from "@/lib/layouts";

export const runtime = "nodejs";

type Body = {
  title: string;
  layoutType: LayoutType;
  characterId: string;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { title, layoutType, characterId } = (await req.json()) as Body;
  if (!title?.trim() || !layoutType || !characterId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!LAYOUTS[layoutType]) {
    return NextResponse.json({ error: "invalid layout" }, { status: 400 });
  }

  // Confirm character belongs to user (also ensures characterId is real before
  // we create an orphan comic).
  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();
  if (!character) {
    return NextResponse.json({ error: "character not found" }, { status: 404 });
  }

  // TODO(paywall): enforce quota / Stripe one-shot before allowing comic
  // creation. For now any signed-in user can create a draft.

  const { data: comic, error } = await supabase
    .from("comics")
    .insert({
      user_id: user.id,
      title: title.trim(),
      layout_type: layoutType,
      character_id: characterId,
    })
    .select("id, title, layout_type, character_id")
    .single();
  if (error || !comic) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ comic });
}
