"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button for /auth/confirm, showing progress while the link is checked. */
export function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block loading={pending} autoFocus>
      {pending ? "Confirming…" : label}
    </Button>
  );
}
