import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {siteConfig.name}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Foundation ready
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          Het operationele platform voor projectmatige bedrijven. De basis staat
          — Next.js, Tailwind, shadcn/ui en Supabase.
        </p>
      </div>
    </main>
  );
}
