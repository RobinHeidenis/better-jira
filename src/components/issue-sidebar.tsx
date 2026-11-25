import { RiExternalLinkLine } from "@remixicon/react";
import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import {
  issueDeveloper,
  issueStoryPoints,
  type JiraBoardIssue,
  type JiraIssueLink,
} from "#/lib/api/issues";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import { initials, timeAgo } from "#/lib/utils";
import { MergeRequestList } from "./merge-requests-popover";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Link } from "./ui/link";

type SidebarIssue = JiraBoardIssue & {
  fields: JiraBoardIssue["fields"] & {
    created?: string;
    updated?: string;
    issuelinks?: JiraIssueLink[];
  };
};

type RelatedIssue = { key: string; summary: string; status?: string };

const RelatedRow = ({ issue }: { issue: RelatedIssue }) => (
  <li className="flex items-center gap-2">
    <Link
      to="/issue/$issueId"
      params={{ issueId: issue.key }}
      underlined={false}
      className="min-w-0 flex-1 truncate"
    >
      <span className="font-medium">{issue.key}</span> {issue.summary}
    </Link>
    {issue.status ? (
      <Badge variant="outline" className="shrink-0">
        {issue.status}
      </Badge>
    ) : null}
  </li>
);

/** Links grouped by how they read from this issue, e.g. "is blocked by". */
const groupLinks = (links: JiraIssueLink[]) => {
  const groups = new Map<string, RelatedIssue[]>();
  for (const link of links) {
    const other = link.outwardIssue ?? link.inwardIssue;
    if (!other) continue;
    const label = link.outwardIssue ? link.type.outward : link.type.inward;
    const group = groups.get(label) ?? [];
    group.push({
      key: other.key,
      summary: other.fields.summary,
      status: other.fields.status?.name,
    });
    groups.set(label, group);
  }
  return [...groups];
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-2">
    <h2 className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
      {title}
    </h2>
    {children}
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 py-0.5">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

const IconText = ({ name, iconUrl }: { name: string; iconUrl?: string }) => (
  <span className="flex items-center gap-1.5">
    {iconUrl ? <img src={iconUrl} alt="" className="size-4" /> : null}
    <span className="truncate">{name}</span>
  </span>
);

const Person = ({
  user,
}: {
  user: { displayName: string; avatarUrls: { "48x48"?: string | null } } | null;
}) =>
  user ? (
    <span className="flex items-center gap-2">
      <Avatar size="sm" rounded={false}>
        <AvatarImage src={user.avatarUrls["48x48"] ?? undefined} alt="" />
        <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{user.displayName}</span>
    </span>
  ) : (
    <span className="text-muted-foreground">Unassigned</span>
  );

export const IssueSidebar = ({ issue }: { issue: SidebarIssue }) => {
  const baseUrl = useSelector(store, (state) => state.baseUrl);
  const developerField = useSelector(store, (state) => state.developerField);
  const storyPointsField = useSelector(
    store,
    (state) => state.storyPointsField,
  );
  const hasGitlab = useSelector(
    store,
    (state) => !!state.gitlabApiKey && !!state.gitlabProjects?.length,
  );
  const projectIds = useSelector(store, (state) => state.gitlabProjects);

  const { fields } = issue;
  const developer = issueDeveloper(issue, developerField);
  const storyPoints = issueStoryPoints(issue, storyPointsField);
  const subtasks = fields.subtasks ?? [];
  const versions = fields.fixVersions ?? [];
  const linkGroups = groupLinks(fields.issuelinks ?? []);

  return (
    <aside className="space-y-6">
      <Section title="Details">
        <dl>
          <Field label="Status">
            <Badge variant="outline">{fields.status.name}</Badge>
          </Field>
          <Field label="Type">
            <IconText
              name={fields.issuetype.name}
              iconUrl={fields.issuetype.iconUrl}
            />
          </Field>
          {fields.priority ? (
            <Field label="Priority">
              <IconText
                name={fields.priority.name}
                iconUrl={fields.priority.iconUrl}
              />
            </Field>
          ) : null}
          {storyPointsField ? (
            <Field label="Story points">
              {storyPoints ?? <span className="text-muted-foreground">–</span>}
            </Field>
          ) : null}
          {versions.length ? (
            <Field label="Fix versions">
              <span className="flex flex-wrap gap-1">
                {versions.map((version) => (
                  <Badge key={version.id} variant="outline">
                    {version.name}
                  </Badge>
                ))}
              </span>
            </Field>
          ) : null}
          {fields.labels.length ? (
            <Field label="Labels">
              <span className="flex flex-wrap gap-1">
                {fields.labels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </span>
            </Field>
          ) : null}
        </dl>
      </Section>

      <Section title="People">
        <dl>
          <Field label="Assignee">
            <Person user={fields.assignee} />
          </Field>
          {developerField ? (
            <Field label="Developer">
              <Person user={developer} />
            </Field>
          ) : null}
          {fields.reporter ? (
            <Field label="Reporter">
              <Person user={fields.reporter} />
            </Field>
          ) : null}
        </dl>
      </Section>

      {fields.parent || subtasks.length || linkGroups.length ? (
        <Section title="Related">
          {fields.parent ? (
            <p className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">Parent</span>
              <Link
                to="/issue/$issueId"
                params={{ issueId: fields.parent.key }}
                underlined={false}
                className="min-w-0 truncate"
              >
                <span className="font-medium">{fields.parent.key}</span>{" "}
                {fields.parent.fields.summary}
              </Link>
            </p>
          ) : null}
          {subtasks.length ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">Subtasks</p>
              <ul className="space-y-1">
                {subtasks.map((subtask) => (
                  <RelatedRow
                    key={subtask.key}
                    issue={{
                      key: subtask.key,
                      summary: subtask.fields.summary,
                      status: subtask.fields.status?.name,
                    }}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {linkGroups.map(([label, issues]) => (
            <div key={label} className="space-y-1">
              <p className="text-muted-foreground first-letter:uppercase">
                {label}
              </p>
              <ul className="space-y-1">
                {issues.map((related) => (
                  <RelatedRow key={related.key} issue={related} />
                ))}
              </ul>
            </div>
          ))}
        </Section>
      ) : null}

      {hasGitlab && projectIds ? (
        <Section title="Merge requests">
          <div className="bg-card">
            <MergeRequestList
              issue={{
                key: issue.key,
                subtasks: subtasks.map((subtask) => ({
                  key: subtask.key,
                  summary: subtask.fields.summary,
                })),
              }}
              projectIds={projectIds}
            />
          </div>
        </Section>
      ) : null}

      <div className="space-y-1 border-border border-t pt-4 text-muted-foreground">
        {fields.created ? <p>Created {timeAgo(fields.created)}</p> : null}
        {fields.updated ? <p>Updated {timeAgo(fields.updated)}</p> : null}
        {baseUrl ? (
          <a
            href={jiraIssueUrl(baseUrl, issue.key)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Open in Jira
            <RiExternalLinkLine className="size-3.5" />
          </a>
        ) : null}
      </div>
    </aside>
  );
};
