import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest("input, textarea, select, [contenteditable=true]");

const click = (selector: string) =>
  document.querySelector<HTMLElement>(selector)?.click();

type Tab = "description" | "checklist" | "comments";

/**
 * Single keys for the ticket view. Most press the sidebar's own buttons, so a
 * key does exactly what clicking does.
 */
export const IssueKeyboard = ({
  issueKey,
  hasChecklist,
}: {
  issueKey: string;
  hasChecklist: boolean;
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const showTab = (tab: Tab) =>
      navigate({
        to: ".",
        search: { tab: tab === "description" ? undefined : tab },
        replace: true,
      });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.defaultPrevented || isTyping(event.target)) return;
      if (
        document.querySelector("[role=dialog], [role=menu], [role=listbox]")
      ) {
        return;
      }

      const actions: Record<string, () => void> = {
        s: () => click('[aria-label="Change status"]'),
        a: () => click('[aria-label="Edit assignee"]'),
        d: () => click('[aria-label="Edit developer"]'),
        p: () => click('[aria-label="Edit priority"]'),
        l: () => click('[aria-label="Edit labels"]'),
        v: () => click('[aria-label="Edit fix versions"]'),
        c: () => {
          void showTab("comments").then(() =>
            // The tab renders its content on the next frame.
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLTextAreaElement>(
                  'textarea[aria-label="Add a comment"]',
                )
                ?.focus(),
            ),
          );
        },
        "1": () => void showTab("description"),
        "2": () => void showTab(hasChecklist ? "checklist" : "comments"),
        "3": () => hasChecklist && void showTab("comments"),
        e: () => {
          const { baseUrl } = store.get();
          if (baseUrl) window.open(jiraIssueUrl(baseUrl, issueKey), "_blank");
        },
        y: () => {
          const { baseUrl } = store.get();
          if (baseUrl) {
            void navigator.clipboard.writeText(jiraIssueUrl(baseUrl, issueKey));
          }
        },
      };

      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, issueKey, hasChecklist]);

  return null;
};
