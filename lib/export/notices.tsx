import { StatusNote } from "@/components/ui/states";

/**
 * What a failed export tells the farmer.
 *
 * The route handler can only answer with a file or a redirect -- it has no way
 * to render a message -- so it sends the reason back as `?export=` and the
 * list page turns it into a sentence.
 */
const NOTICES: Record<string, { title: string; body: string }> = {
  "too-large": {
    title: "That range is too big to export in one file",
    body: "Pick a shorter period — a year at a time works — and try again.",
  },
  denied: {
    title: "You don't have access to export this",
    body: "Ask the farm owner to make you a manager.",
  },
  failed: {
    title: "The export didn't finish",
    body: "Nothing was downloaded, so nothing is missing. Please try again.",
  },
};

export function ExportNotice({ reason }: { reason?: string }) {
  const notice = reason ? NOTICES[reason] : undefined;
  if (!notice) return null;

  return (
    <StatusNote tone="bad" title={notice.title}>
      {notice.body}
    </StatusNote>
  );
}
