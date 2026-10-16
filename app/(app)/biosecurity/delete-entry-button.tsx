"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { safeAction } from "@/lib/client/safe-action";
import { deleteCheckAction, deleteVisitAction } from "./actions";

/** A small trash button for one log row. Confirms first; logs are history. */
export function DeleteEntryButton({ kind, id }: { kind: "visit" | "check"; id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(`Delete this ${kind}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await safeAction(() =>
        kind === "visit" ? deleteVisitAction(id) : deleteCheckAction(id)
      );
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Delete ${kind}`}
      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
