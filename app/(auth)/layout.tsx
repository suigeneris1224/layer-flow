import Link from "next/link";
import { Egg } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <Egg className="size-5 text-primary" aria-hidden />
          LayerFlow
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        Know your flock. Know your numbers.
      </footer>
    </div>
  );
}
