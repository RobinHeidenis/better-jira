export { cn } from "cn";

export const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
};

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
] as const;

export const timeAgo = (iso: string) => {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeTime.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
};

/**
 * Whether a dialog, menu or dropdown is showing. Some closed popups stay in
 * the page invisibly (like a select's list), so only visible ones count.
 */
export const isPopupOpen = () =>
  [
    ...document.querySelectorAll("[role=dialog], [role=menu], [role=listbox]"),
  ].some((element) => element.checkVisibility());
