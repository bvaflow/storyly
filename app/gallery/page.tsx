import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GalleryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: comics } = await supabase
    .from("comics")
    .select("id, title, panels(image_url, order_index)")
    .eq("is_public", true)
    .not("finalized_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(48);

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-light tracking-tight text-zinc-50">
          Galerie
        </h1>
        <p className="mt-3 text-zinc-400">
          Albums publics créés par la communauté.
        </p>

        {comics && comics.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {comics.map((c) => {
              const panels = (c.panels ?? []) as Array<{
                image_url: string;
                order_index: number;
              }>;
              const cover = panels.sort(
                (a, b) => a.order_index - b.order_index,
              )[0];
              return (
                <Link
                  key={c.id}
                  href={`/gallery/${c.id}`}
                  className="group relative aspect-3/4 overflow-hidden rounded-lg border border-zinc-900 transition hover:border-zinc-700"
                >
                  {cover ? (
                    <Image
                      src={cover.image_url}
                      alt={c.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-900" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-3 text-sm text-zinc-100">
                    {c.title}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-12 rounded-xl border border-zinc-900 p-12 text-center text-zinc-500">
            Aucun album public pour le moment.
          </div>
        )}
      </div>
    </main>
  );
}
