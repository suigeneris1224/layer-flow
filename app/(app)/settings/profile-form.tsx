"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Input } from "@/components/ui/field";
import { StatusNote } from "@/components/ui/states";
import { removeAvatarAction, updateProfileAction, uploadAvatarAction } from "./actions";

/** Same initials the topbar draws, so removing an avatar looks like a return. */
function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function ProfileForm({
  email,
  initialFullName,
  initialPhone,
  avatarUrl,
}: {
  email: string;
  initialFullName: string;
  initialPhone: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const result = await updateProfileAction({ fullName, phone });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess("Profile saved.");
      router.refresh();
    });
  }

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFormError(null);
    setSuccess(null);

    const data = new FormData();
    data.set("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatarAction(data);
      // Clear the picker either way, so choosing the same file again re-fires.
      if (fileInput.current) fileInput.current.value = "";

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setSuccess("Photo updated.");
      router.refresh();
    });
  }

  function onRemoveAvatar() {
    setFormError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setSuccess("Photo removed.");
      router.refresh();
    });
  }

  return (
    <Panel title="Your profile">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <StatusNote tone="bad">{formError}</StatusNote>}
        {success && <StatusNote tone="good">{success}</StatusNote>}

        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex size-16 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground"
            >
              {initials(fullName, email)}
            </span>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={pending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              {avatarUrl ? "Change photo" : "Add a photo"}
            </Button>

            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={pending}
                onClick={onRemoveAvatar}
              >
                <Trash2 className="size-4" aria-hidden />
                Remove
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 2 MB.</p>

        <Field label="Name" htmlFor="profile-name" error={fieldErrors.fullName}>
          <Input
            id="profile-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={!!fieldErrors.fullName}
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="profile-phone"
          hint="Optional."
          error={fieldErrors.phone}
        >
          <Input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field
          label="Email"
          htmlFor="profile-email"
          hint="This is how you sign in and cannot be changed here."
        >
          <Input id="profile-email" value={email} readOnly disabled />
        </Field>

        <div>
          <Button type="submit" loading={pending} disabled={!fullName.trim()}>
            <UserRound className="size-4" aria-hidden />
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
