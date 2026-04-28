import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LAYOUTS, type LayoutType } from "@/lib/layouts";
import { ComicActions } from "./comic-actions";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [{ data: characters }, { data: comics }] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, facial_reference_url, style_preset")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("comics")
      .select(
        "id, title, layout_type, is_public, finalized_at, created_at, panels(image_url, order_index)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-zinc-50">
              Tableau de bord
            </h1>
            <p className="mt-3 text-zinc-400">
              {user.email}
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-black transition hover:bg-amber-200"
          >
            Nouvel album
          </Link>
        </div>

        <section className="mt-16">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500">
            Personnages
          </h2>
          {characters && characters.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {characters.map((c) => (
                <div
                  key={c.id}
                  className="relative aspect-3/4 overflow-hidden rounded-xl border border-zinc-900"
                >
                  <Image
                    src={c.facial_reference_url}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-3 text-sm text-zinc-100">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-900 p-8 text-zinc-500">
              Aucun personnage. Créez-en un dans le flow{" "}
              <Link href="/create" className="underline">
                Nouvel album
              </Link>
              .
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500">
            Albums
          </h2>
          {comics && comics.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {comics.map((c) => {
                const panels = (c.panels ?? []) as Array<{
                  image_url: string;
                  order_index: number;
                }>;
                const cover = panels.sort(
                  (a, b) => a.order_index - b.order_index,
                )[0];
                const layout = LAYOUTS[c.layout_type as LayoutType];
                return (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-xl border border-zinc-900"
                  >
                    <div className="relative aspect-video bg-zinc-950">
                      {cover ? (
                        <Image
                          src={cover.image_url}
                          alt={c.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-700">
                          Aucune case générée
                        </div>
                      )}
                      <div className="absolute right-3 top-3 flex gap-2">
                        {c.finalized_at ? (
                          <Badge tone="ok">Finalisé</Badge>
                        ) : (
                          <Badge tone="warn">Brouillon</Badge>
                        )}
                        {c.is_public && <Badge tone="public">Public</Badge>}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-lg text-zinc-50">{c.title}</p>
                      <p className="text-xs text-zinc-500">
                        {layout?.label ?? c.layout_type} ·{" "}
                        {panels.length} / {layout?.count ?? "?"} cases
                      </p>
                      <ComicActions
                        comicId={c.id}
                        isFinalized={!!c.finalized_at}
                        isPublic={!!c.is_public}
                        hasPanels={panels.length > 0}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-900 p-8 text-zinc-500">
              Aucun album.{" "}
              <Link href="/create" className="underline">
                Commencez votre premier
              </Link>
              .
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "public";
}) {
  const styles = {
    ok: "bg-emerald-200/20 text-emerald-200",
    warn: "bg-amber-200/20 text-amber-200",
    public: "bg-zinc-200/20 text-zinc-100",
  } as const;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
