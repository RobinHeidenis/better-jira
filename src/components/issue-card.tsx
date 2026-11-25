import {
  RiArrowLeftRightLine,
  RiCornerLeftUpLine,
  RiHashtag,
  RiLinkM,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { MergeRequestsPopover } from "#/components/merge-requests-popover";
import { PeoplePicker, personEdit } from "#/components/people-picker";
import { TransitionMenu } from "#/components/transition-menu";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Copyable } from "#/components/ui/copyable";
import { Link } from "#/components/ui/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { RoleChip } from "#/components/ui/role-chip";
import { SharedTooltipTrigger } from "#/components/ui/tooltip";
import { currentUserOptions } from "#/lib/api/current-user";
import {
  issueDeveloper,
  issueStoryPoints,
  type JiraBoardIssue,
} from "#/lib/api/issues";
import { boardSearch } from "#/lib/board-search";
import { editIssue } from "#/lib/edit-issue";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import { initials } from "#/lib/utils";

const FieldIcon = ({ name, iconUrl }: { name: string; iconUrl?: string }) => {
  if (!iconUrl) return null;
  return (
    <SharedTooltipTrigger content={name}>
      <img src={iconUrl} alt={name} className="size-4" />
    </SharedTooltipTrigger>
  );
};

type CardUser = {
  accountId: string;
  displayName: string;
  avatarUrls: { "48x48"?: string | null };
} | null;

/** A role chip that opens a people picker to change who holds the role. */
const PersonChip = ({
  issue,
  kind,
  fieldId,
  user,
}: {
  issue: JiraBoardIssue;
  kind: "assignee" | "developer";
  fieldId: string;
  user: CardUser;
}) => {
  const queryClient = useQueryClient();
  const open = useSelector(
    boardSearch,
    (state) =>
      state.peopleMenu?.issueId === issue.id && state.peopleMenu.role === kind,
  );
  const setOpen = (next: boolean) =>
    boardSearch.setState((state) => ({
      ...state,
      peopleMenu: next ? { issueId: issue.id, role: kind } : null,
    }));
  const name =
    user?.displayName ?? (kind === "developer" ? "No developer" : "Unassigned");
  const label = kind === "developer" ? "Developer" : "Assignee";
  const shortcut = kind === "developer" ? "d" : "a";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <SharedTooltipTrigger
        content={`${label}: ${name} (${shortcut})`}
        render={<PopoverTrigger />}
        className={
          // An empty developer chip only shows on hover, to keep cards calm.
          kind === "developer" && !user && !open
            ? "cursor-pointer opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100"
            : "cursor-pointer"
        }
      >
        <RoleChip
          name={name}
          initials={user ? initials(name) : "–"}
          kind={kind}
          src={user?.avatarUrls["48x48"] ?? ""}
        />
      </SharedTooltipTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        {open ? (
          <PeoplePicker
            issueKey={issue.key}
            value={
              user
                ? {
                    kind: "user",
                    accountId: user.accountId,
                    displayName: user.displayName,
                  }
                : { kind: "unassigned" }
            }
            placeholder={`Change ${label.toLowerCase()}`}
            autoOpen
            onOpenChange={(next) => !next && setOpen(false)}
            onChange={async (value) => {
              setOpen(false);
              if (!value) return;
              const me =
                value.kind === "me"
                  ? await queryClient.ensureQueryData(currentUserOptions())
                  : undefined;
              const edit = personEdit(value, me);
              if (
                !edit ||
                (edit.payload?.accountId ?? null) === (user?.accountId ?? null)
              ) {
                return;
              }
              void editIssue(
                queryClient,
                issue.key,
                { fields: { [fieldId]: edit.payload } },
                { [fieldId]: edit.display },
              );
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export const IssueCard = ({
  issue,
  developerField,
  storyPointsField,
}: {
  issue: JiraBoardIssue;
  developerField: string | null;
  storyPointsField: string | null;
}) => {
  const baseUrl = useSelector(store, (state) => state.baseUrl);
  const developer = issueDeveloper(issue, developerField);
  const storyPoints = issueStoryPoints(issue, storyPointsField);
  const statusMenuOpen = useSelector(
    boardSearch,
    (state) => state.statusMenuIssueId === issue.id,
  );

  return (
    <Card className="group/card">
      <CardHeader>
        {issue.fields.parent?.key ? (
          <CardDescription>
            <Link
              href={`/issue/${issue.fields.parent?.key}`}
              className="flex items-start gap-2"
            >
              <RiCornerLeftUpLine size={13} className="mt-[0.2em] shrink-0" />
              <span
                className="line-clamp-2"
                title={issue.fields.parent.fields.summary}
              >
                {issue.fields.parent.fields.summary}
              </span>
            </Link>
          </CardDescription>
        ) : null}
        <CardTitle>
          <Link underlined={false} href={`/issue/${issue.key}`}>
            {issue.fields.summary}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 justify-between">
          <div className="flex flex-col items-start gap-3">
            <div className="group flex items-center gap-1">
              <Copyable
                value={issue.key}
                icon={RiHashtag}
                tooltip="Copy ticket number"
              />
              {issue.key}
              {baseUrl && (
                <Copyable
                  value={jiraIssueUrl(baseUrl, issue.key)}
                  icon={RiLinkM}
                  tooltip="Copy link to ticket"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <FieldIcon
                name={issue.fields.issuetype.name}
                iconUrl={issue.fields.issuetype.iconUrl}
              />
              {issue.fields.priority ? (
                <FieldIcon
                  name={issue.fields.priority.name}
                  iconUrl={issue.fields.priority.iconUrl}
                />
              ) : null}
              <MergeRequestsPopover
                issue={{
                  key: issue.key,
                  subtasks: (issue.fields.subtasks ?? []).map((subtask) => ({
                    key: subtask.key,
                    summary: subtask.fields.summary,
                  })),
                }}
              />
              {storyPoints !== null ? (
                <Badge className="!px-1 !py-0.5">{storyPoints}</Badge>
              ) : null}
              <TransitionMenu
                issue={{ key: issue.key, summary: issue.fields.summary }}
                statusId={issue.fields.status.id}
                open={statusMenuOpen}
                onOpenChange={(open) =>
                  boardSearch.setState((state) => ({
                    ...state,
                    statusMenuIssueId: open ? issue.id : null,
                  }))
                }
                trigger={
                  <button
                    type="button"
                    aria-label="Change status (s)"
                    title="Change status (s)"
                    className={
                      statusMenuOpen
                        ? "text-foreground"
                        : "cursor-pointer text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-foreground focus-visible:opacity-100"
                    }
                  >
                    <RiArrowLeftRightLine className="size-4" />
                  </button>
                }
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {developerField ? (
              <PersonChip
                issue={issue}
                kind="developer"
                fieldId={developerField}
                user={developer}
              />
            ) : null}
            <PersonChip
              issue={issue}
              kind="assignee"
              fieldId="assignee"
              user={issue.fields.assignee}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
