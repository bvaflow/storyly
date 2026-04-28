import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Bubble = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type Body = {
  bubbles: Bubble[];
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { bubbles } = (await req.json()) as Body;
  if (!Array.isArray(bubbles)) {
    return NextResponse.json({ error: "bubbles must be array" }, { status: 400 });
  }

  // Ownership is enforced by RLS via the panels→comics policy, but be explicit
  // with the update so a wrong id from a different user 404s rather than 403s.
  const { data, error } = await supabase
    .from("panels")
    .update({ bubbles_json: bubbles })
    .eq("id", id)
    .select("id, bubbles_json")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ panel: data });
}
