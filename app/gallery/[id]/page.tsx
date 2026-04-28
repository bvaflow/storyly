import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LAYOUTS, type LayoutType } from "@/lib/layouts";

export default async function PublicComicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: comic } = await supabase
    .from("comics")
    .select(
      "id, title, layout_type, is_public, finalized_at, panels(id, image_url, order_index, bubbles_json)",
    )
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (!comic || !comic.finalized_at) notFound();

  const layout = LAYOUTS[comic.layout_type as LayoutType];
  const panels = (
    comic.panels as Array<{
      id: string;
      image_url: string;
      order_index: number;
      bubbles_json: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
      }>;
    }>
  ).sort((a, b) => a.order_index - b.order_index);

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/gallery"
          className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
        >
          ← Galerie
        </Link>
        <h1 className="mt-4 text-4xl font-light tracking-tight text-zinc-50">
          {comic.title}
        </h1>

        <div className={`mt-12 ${layout?.gridClass ?? "grid grid-cols-2"} gap-4`}>
          {panels.map((panel) => (
            <div
              key={panel.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-zinc-900"
            >
              <Image
                src={panel.image_url}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
              {panel.bubbles_json.map((b) => (
                <div
                  key={b.id}
                  className="absolute flex items-center justify-center rounded-full border border-black/80 bg-white p-1.5 text-center text-[10px] leading-tight text-black shadow-md"
                  style={{
                    left: `${b.x * 100}%`,
                    top: `${b.y * 100}%`,
                    width: `${b.width * 100}%`,
                    height: `${b.height * 100}%`,
                  }}
                >
                  {b.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
