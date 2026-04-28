import { renderToBuffer } from "@react-pdf/renderer";
import { ComicPDF } from "@/lib/pdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();

  const { data: comic, error: comicErr } = await supabase
    .from("comics")
    .select("id, title")
    .eq("id", id)
    .single();
  if (comicErr || !comic) {
    return new Response("Not found", { status: 404 });
  }

  const { data: panels, error: panelsErr } = await supabase
    .from("panels")
    .select("id, image_url, order_index, bubbles_json")
    .eq("comic_id", id)
    .order("order_index", { ascending: true });
  if (panelsErr || !panels || panels.length === 0) {
    return new Response("No panels", { status: 400 });
  }

  const buffer = await renderToBuffer(
    <ComicPDF comic={comic} panels={panels} />,
  );

  const safeTitle = comic.title.replace(/[^a-z0-9-_ ]/gi, "_").slice(0, 60);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
