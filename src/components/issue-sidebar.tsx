import { RiArrowDownSLine, RiExternalLinkLine } from "@remixicon/react";
import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import {
  issueDeveloper,
  issueStoryPoints,
  type JiraBoardIssue,
  type JiraIssueLink,
} from "#/lib/api/issues";
import { jiraOpenUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import { initials, timeAgo } from "#/lib/utils";
import {
  ComponentsField,
  LabelsField,
  NumberField,
  PersonField,
  PriorityField,
  VersionsField,
} from "./issue-fields";
import { MergeRequestList } from "./merge-requests-popover";
import { groupLinks, RelatedGroup } from "./related-issues";
import { TransitionMenu } from "./transition-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Link } from "./ui/link";

type SidebarIssue = JiraBoardIssue & {
  fields: JiraBoardIssue["fields"] & {
    created?: string;
    updated?: string;
    issuelinks?: JiraIssueLink[];
    components?: { id: string; name: string }[] | null;
  };
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
            <TransitionMenu
              issue={{ key: issue.key, summary: fields.summary }}
              statusId={fields.status.id}
              trigger={
                <Button
                  variant="outline"
                  size="xs"
                  aria-label="Change status"
                  className="max-w-full"
                >
                  <span className="truncate">{fields.status.name}</span>
                  <RiArrowDownSLine />
                </Button>
              }
            />
          </Field>
          <Field label="Type">
            <IconText
              name={fields.issuetype.name}
              iconUrl={fields.issuetype.iconUrl}
            />
          </Field>
          <Field label="Priority">
            <PriorityField issueKey={issue.key} priority={fields.priority}>
              {fields.priority ? (
                <IconText
                  name={fields.priority.name}
                  iconUrl={fields.priority.iconUrl}
                />
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </PriorityField>
          </Field>
          {storyPointsField ? (
            <Field label="Story points">
              <NumberField
                issueKey={issue.key}
                fieldId={storyPointsField}
                label="story points"
                value={storyPoints}
              />
            </Field>
          ) : null}
          <Field label="Fix versions">
            <VersionsField issueKey={issue.key} versions={versions} />
          </Field>
          <Field label="Components">
            <ComponentsField
              issueKey={issue.key}
              components={fields.components ?? []}
            />
          </Field>
          <Field label="Labels">
            <LabelsField issueKey={issue.key} labels={fields.labels} />
          </Field>
        </dl>
      </Section>

      <Section title="People">
        <dl>
          <Field label="Assignee">
            <PersonField
              issueKey={issue.key}
              fieldId="assignee"
              label="assignee"
              user={fields.assignee}
            >
              <Person user={fields.assignee} />
            </PersonField>
          </Field>
          {developerField ? (
            <Field label="Developer">
              <PersonField
                issueKey={issue.key}
                fieldId={developerField}
                label="developer"
                user={developer}
              >
                <Person user={developer} />
              </PersonField>
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
            <RelatedGroup
              label="Subtasks"
              countDone
              issues={subtasks.map((subtask) => ({
                key: subtask.key,
                summary: subtask.fields.summary,
                status: subtask.fields.status,
              }))}
            />
          ) : null}
          {linkGroups.map(([label, issues]) => (
            <RelatedGroup key={label} label={label} issues={issues} />
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

      <div className="space-y-1 border-t pt-4 text-muted-foreground">
        {fields.created ? <p>Created {timeAgo(fields.created)}</p> : null}
        {fields.updated ? <p>Updated {timeAgo(fields.updated)}</p> : null}
        {baseUrl ? (
          <a
            href={jiraOpenUrl(baseUrl, issue.key)}
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
