// ADF comes from whoever wrote the issue, so URLs and colours are checked
// before they reach an href, a src or a style.

export const safeUrl = (
  value: unknown,
  protocols: readonly string[] = ["http:", "https:"],
): string | null => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NAMED_COLOR = /^[a-z]+$/i;

export const safeColor = (value: unknown): string | undefined =>
  typeof value === "string" &&
  (HEX_COLOR.test(value) || NAMED_COLOR.test(value))
    ? value
    : undefined;

export const positiveInt = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
