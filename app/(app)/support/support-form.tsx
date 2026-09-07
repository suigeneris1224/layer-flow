"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { submitSupportRequestAction } from "./actions";

/** Ask for help. Every plan can submit; the Pro perk is response priority, not access to the form. */
export function SupportForm({ priority }: { priority: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const result = await submitSupportRequestAction({ subject, message });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSubject("");
      setMessage("");
      setSuccess(
        priority
          ? "Sent, with priority handling. We'll get back to you soon."
          : "Sent. We'll get back to you soon."
      );
      router.refresh();
    });
  }

  return (
    <Panel title="Contact support">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <Field label="Subject" htmlFor="support-subject" error={fieldErrors.subject}>
          <Input
            id="support-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            aria-invalid={!!fieldErrors.subject}
          />
        </Field>

        <Field label="Message" htmlFor="support-message" error={fieldErrors.message}>
          <Textarea
            id="support-message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            aria-invalid={!!fieldErrors.message}
          />
        </Field>

        <div>
          <Button type="submit" loading={pending} disabled={!subject.trim() || !message.trim()}>
            <LifeBuoy className="size-4" aria-hidden />
            {pending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
