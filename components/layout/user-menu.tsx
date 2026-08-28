"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";

/** Avatar, name and role, with sign-out behind a small menu. */
export function UserMenu({ userName, role }: { userName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const initials =
    userName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-md px-1.5 hover:bg-muted"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[9rem] truncate text-sm font-medium">{userName}</span>
          <span className="text-[11px] text-muted-foreground">{role}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-52 rounded-lg border border-border bg-surface p-1 shadow-pop"
        >
          <div className="border-b border-border px-3 py-2 sm:hidden">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-muted"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
