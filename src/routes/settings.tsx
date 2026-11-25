import { RiCloseLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { Picker, type PickerOption } from "#/components/settings/field-picker";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import { Separator } from "#/components/ui/separator";
import { Switch } from "#/components/ui/switch";
import { allBoardsOptions, boardConfigurationOptions } from "#/lib/api/boards";
import { currentUserOptions } from "#/lib/api/current-user";
import { fieldsOptions, type JiraField } from "#/lib/api/fields";
import { type Settings, store } from "#/lib/store";

export const Route = createFileRoute("/settings")({
  // Everything here reads the browser-only settings store.
  ssr: false,
  beforeLoad: () => {
    if (!store.state.apiToken) throw redirect({ to: "/setup/account" });
  },
  component: SettingsPage,
});

const update = (patch: Partial<Settings>) =>
  store.setState((state) => ({ ...state, ...patch }));

const fieldOptions = (
  fields: JiraField[] | undefined,
  type: string,
): PickerOption[] =>
  (fields ?? [])
    .filter((field) => field.custom && field.schema?.type === type)
    .map((field) => ({
      value: field.id,
      label: field.name,
      description: field.id,
    }));

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-4">
    <h2 className="text-sm font-semibold">{title}</h2>
    <div className="space-y-5">{children}</div>
  </section>
);

const Row = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-6">
    <div className="min-w-0 space-y-1">
      <p className="font-medium">{label}</p>
      {description ? (
        <p className="text-muted-foreground">{description}</p>
      ) : null}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

function SettingsPage() {
  const settings = useSelector(store, (state) => state);
  const { data: user } = useQuery(currentUserOptions());
  const { data: boards } = useQuery(allBoardsOptions());
  const { data: fields, isPending: isFieldsPending } = useQuery(
    fieldsOptions(),
  );
  const { data: configuration } = useQuery(
    boardConfigurationOptions(settings.boardId, true),
  );

  const columns = configuration?.columnConfig.columns ?? [];
  const hidden = new Set(settings.hiddenColumns ?? []);

  const boardOptions: PickerOption[] = (boards?.values ?? []).map((board) => ({
    value: String(board.id),
    label: board.name,
    description: `${board.location.projectKey} · ${board.type}`,
  }));
  const columnOptions: PickerOption[] = columns.map((column) => ({
    value: column.name,
    label: column.name,
  }));

  const changeBoard = (value: string | null) => {
    const board = boards?.values.find((board) => String(board.id) === value);
    if (!board || board.id === settings.boardId) return;
    // Columns and versions belong to the old board.
    update({
      boardId: board.id,
      project: board.location.projectKey,
      hiddenColumns: [],
      reviewColumn: null,
      filter: { ...settings.filter, versions: [] },
    });
  };

  const toggleColumn = (name: string, visible: boolean) => {
    const next = new Set(hidden);
    if (visible) next.delete(name);
    else next.add(name);
    update({ hiddenColumns: [...next] });
  };

  return (
    <div className="flex min-h-screen w-full justify-center p-8">
      <Card className="h-fit w-2xl">
        <CardContent className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Settings</CardTitle>
              <CardDescription>Changes save straight away.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to the board"
              title="Back to the board"
              nativeButton={false}
              render={<Link to="/" underlined={false} />}
            >
              <RiCloseLine />
            </Button>
          </div>

          <Section title="Account">
            <Row
              label="Jira"
              description={
                user
                  ? `${user.displayName} on ${settings.baseUrl}`
                  : (settings.baseUrl ?? undefined)
              }
            >
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/setup/account" underlined={false} />}
              >
                Change account
              </Button>
            </Row>
            <Row
              label="GitLab"
              description={
                settings.gitlabApiKey
                  ? `${settings.gitlabProjects?.length ?? 0} project(s) connected`
                  : "Not connected"
              }
            >
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/setup/gitlab" underlined={false} />}
              >
                {settings.gitlabApiKey ? "Change" : "Connect"}
              </Button>
            </Row>
          </Section>

          <Separator />

          <Section title="Board">
            <Row label="Board">
              <Picker
                options={boardOptions}
                value={
                  settings.boardId === null ? null : String(settings.boardId)
                }
                onChange={changeBoard}
                placeholder="Pick a board"
              />
            </Row>
            <Row
              label="Visible columns"
              description="Hidden columns don't show on the board."
            >
              <div className="w-72 space-y-2">
                {columns.map((column) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: the Switch renders the control
                  <label
                    key={column.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{column.name}</span>
                    <Switch
                      checked={!hidden.has(column.name)}
                      onCheckedChange={(checked) =>
                        toggleColumn(column.name, checked)
                      }
                    />
                  </label>
                ))}
              </div>
            </Row>
            <Row
              label="Code review column"
              description="Puts the tickets you need to review first, then your own."
            >
              <Picker
                options={columnOptions}
                value={settings.reviewColumn}
                onChange={(reviewColumn) => update({ reviewColumn })}
                placeholder="None"
              />
            </Row>
          </Section>

          <Separator />

          <Section title="Fields">
            <Row
              label="Developer"
              description="A user field, separate from the assignee."
            >
              <Picker
                options={fieldOptions(fields, "user")}
                value={settings.developerField}
                onChange={(developerField) => update({ developerField })}
                placeholder="None"
                disabled={isFieldsPending}
              />
            </Row>
            <Row label="Story points" description="A number field.">
              <Picker
                options={fieldOptions(fields, "number")}
                value={settings.storyPointsField}
                onChange={(storyPointsField) => update({ storyPointsField })}
                placeholder="None"
                disabled={isFieldsPending}
              />
            </Row>
            <Row
              label="Checklist"
              description={`Issue Checklist Pro's "Checklist Text" field, shown as a tab on the ticket.`}
            >
              <Picker
                options={fieldOptions(fields, "string")}
                value={settings.checklistField}
                onChange={(checklistField) => update({ checklistField })}
                placeholder="None"
                disabled={isFieldsPending}
              />
            </Row>
          </Section>

          <Separator />

          <Section title="Transition forms">
            {Object.keys(settings.transitionForms).length ? (
              Object.entries(settings.transitionForms).map(
                ([statusId, form]) => (
                  <Row
                    key={statusId}
                    label={`Moving to ${form.status}`}
                    description={[
                      form.hidden.length
                        ? `${form.hidden.length} field${form.hidden.length === 1 ? "" : "s"} not asked`
                        : null,
                      Object.keys(form.defaults).length
                        ? `${Object.keys(form.defaults).length} default${Object.keys(form.defaults).length === 1 ? "" : "s"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const { [statusId]: _, ...rest } =
                          settings.transitionForms;
                        update({ transitionForms: rest });
                      }}
                    >
                      Reset
                    </Button>
                  </Row>
                ),
              )
            ) : (
              <p className="text-muted-foreground">
                No forms customized yet. Forms are set up while moving a ticket:
                when a move opens a form, click "Customize form" in it to choose
                which fields it asks for and their defaults. Every ticket moved
                to that lane afterwards uses them, and the lane shows up here so
                you can reset it.
              </p>
            )}
          </Section>

          <Separator />

          <Section title="Filtering">
            <Row
              label="Include developed tickets"
              description="When filtering by user, also show tickets they developed, not only ones assigned to them."
            >
              <Switch
                checked={settings.includeDevTickets ?? false}
                onCheckedChange={(includeDevTickets) =>
                  update({ includeDevTickets })
                }
                disabled={!settings.developerField}
              />
            </Row>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
