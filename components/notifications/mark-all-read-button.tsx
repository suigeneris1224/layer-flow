"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsReadAction } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

export function MarkAllReadButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn("text-sm font-medium text-primary hover:underline disabled:opacity-60", className)}
    >
      Mark all read
    </button>
  );
}
