"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNote } from "@/components/ui/states";
import { acceptInvitationAction } from "@/app/(app)/team/actions";

/** The one button that turns a token into a membership. */
export function AcceptInvitation({
  token,
  farmName,
}: {
  token: string;
  farmName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitationAction(token);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // The action has already pointed the active-farm cookie at this farm.
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <StatusNote tone="bad">{error}</StatusNote>}

      <div>
        <Button type="button" loading={pending} onClick={onAccept}>
          <Check className="size-4" aria-hidden />
          {pending ? "Joining…" : `Join ${farmName}`}
        </Button>
      </div>
    </div>
  );
}
