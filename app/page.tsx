import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-zinc-500">
          strory.fun
        </p>
        <h1 className="max-w-3xl text-5xl font-light leading-tight tracking-tight text-zinc-50 md:text-7xl">
          Une bande dessinée
          <br />
          <span className="italic text-amber-200">où votre enfant</span>
          <br />
          est le héros.
        </h1>
        <p className="mt-8 max-w-xl text-lg text-zinc-400">
          Albums premium imprimables, générés par IA en quelques minutes.
          Personnages cohérents, narration magique, qualité éditoriale.
        </p>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="rounded-full bg-zinc-100 px-8 py-3 text-sm font-medium text-black transition hover:bg-amber-200"
          >
            Créer mon album
          </Link>
          <Link
            href="/gallery"
            className="rounded-full border border-zinc-800 px-8 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600"
          >
            Voir la galerie
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-900 px-6 py-16">
        <div className="mx-auto max-w-5xl grid grid-cols-1 gap-12 md:grid-cols-3">
          <Pricing
            name="Album unique"
            price="14,99 €"
            tagline="Sans engagement"
            features={["1 album complet", "Jusqu'à 12 cases", "Export PDF HD"]}
          />
          <Pricing
            name="Découverte"
            price="9,99 €"
            tagline="par mois"
            features={["2 albums / mois", "Export PDF HD", "Annulation à tout moment"]}
          />
          <Pricing
            name="Famille"
            price="19,99 €"
            tagline="par mois"
            features={[
              "5 albums / mois",
              "Export PDF HD",
              "Accès anticipé nouveaux styles",
            ]}
            highlight
          />
        </div>
      </section>
    </main>
  );
}

function Pricing({
  name,
  price,
  tagline,
  features,
  highlight,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 ${
        highlight
          ? "border-amber-200/40 bg-amber-200/2"
          : "border-zinc-900"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-zinc-500">{name}</p>
      <p className="mt-4 text-4xl font-light text-zinc-50">{price}</p>
      <p className="mt-1 text-sm text-zinc-500">{tagline}</p>
      <ul className="mt-6 space-y-2 text-sm text-zinc-400">
        {features.map((f) => (
          <li key={f}>— {f}</li>
        ))}
      </ul>
    </div>
  );
}
