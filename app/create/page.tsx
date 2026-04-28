import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateFlow, type DraftSnapshot } from "./create-flow";
import type { LayoutType } from "@/lib/layouts";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ comicId?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, facial_reference_url, style_preset")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let draft: DraftSnapshot | null = null;
  if (params.comicId) {
    const { data: comic } = await supabase
      .from("comics")
      .select(
        "id, title, layout_type, character_id, finalized_at, panels(id, image_url, prompt_action, order_index, bubbles_json)",
      )
      .eq("id", params.comicId)
      .eq("user_id", user.id)
      .single();

    if (comic) {
      draft = {
        comicId: comic.id,
        title: comic.title,
        layoutType: comic.layout_type as LayoutType,
        characterId: comic.character_id,
        finalized: !!comic.finalized_at,
        panels: (comic.panels ?? []).map(
          (p: {
            id: string;
            image_url: string;
            prompt_action: string;
            order_index: number;
            bubbles_json: unknown;
          }) => ({
            panelId: p.id,
            imageUrl: p.image_url,
            promptAction: p.prompt_action,
            orderIndex: p.order_index,
            bubbles: Array.isArray(p.bubbles_json) ? p.bubbles_json : [],
          }),
        ),
      };
    }
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <CreateFlow
          initialCharacters={characters ?? []}
          initialDraft={draft}
        />
      </div>
    </main>
  );
}
