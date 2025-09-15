// helpers/format.ts
export type FormatListPreviewOptions = {
  maxItems?: number;
  maxChars?: number;
};

/**
 * Returns a short preview string (with "+N more" when needed) and the full joined string.
 */
export function formatListPreview(
  list: unknown,
  { maxItems = 3, maxChars = 60 }: FormatListPreviewOptions = {}
): { display: string; } {
  const items = Array.isArray(list)
    ? list
        .flat()
        .filter((v) => v != null)
        .map((v) => String(v).trim())
        .filter((s) => s.length > 0)
    : [];

  if (items.length === 0) return { display: ""};

  const shown = items.slice(0, maxItems);
  const hidden = items.length - shown.length;

  let display = shown.join(", ");
  if (hidden > 0) display += ` +${hidden} more`;

  return {
    display: truncate(display, maxChars),
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = Math.max(0, max - 1);
  return s.slice(0, cut).trimEnd() + "…";
}
