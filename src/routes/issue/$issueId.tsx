import { RiCloseLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useEffect } from "react";
import { z } from "zod";
import { Adf } from "#/components/adf/adf";
import { Checklist } from "#/components/checklist";
import { Comments } from "#/components/comments";
import { ErrorState } from "#/components/error-state";
import { IssueSidebar } from "#/components/issue-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardTitle } from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import { Spinner } from "#/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { commentsOptions } from "#/lib/api/comments";
import { issueOptions } from "#/lib/api/issues";
import { parseChecklist } from "#/lib/checklist";
import { store } from "#/lib/store";

const searchSchema = z.object({
  tab: z
    .enum(["description", "checklist", "comments"])
    .optional()
    .catch(undefined),
});

// Jira answers 404 both for a ticket that doesn't exist and for one the user
// can't see, and the proxy keeps the status in the message.
const isNotFound = (error: Error) => /failed: 404\b/.test(error.message);

export const Route = createFileRoute("/issue/$issueId")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { issueId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: issue, error, refetch } = useQuery(issueOptions(issueId));
  // Loaded up front so the tab can show its count.
  const { data: comments } = useQuery({
    ...commentsOptions(issue?.key ?? ""),
    enabled: !!issue,
  });
  const checklistField = useSelector(store, (state) => state.checklistField);
  const checklist =
    issue && checklistField
      ? parseChecklist(issue.fields[checklistField])
      : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Esc belongs to an open dialog (the image viewer) or a text field first.
      if (document.querySelector("[role=dialog]")) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, [contenteditable=true]")
      ) {
        return;
      }
      navigate({ to: "/" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const description = issue?.fields.description ? (
    <Adf
      content={issue.fields.description.content}
      attachments={issue.fields.attachment}
      issueKey={issue.key}
    />
  ) : (
    <p className="text-muted-foreground">No description</p>
  );
  return (
    <div className="h-screen w-full flex justify-center">
      {issue ? (
        <Card className="w-7xl my-8 overflow-auto pt-0">
          <CardContent>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-card pt-[var(--card-spacing)] pb-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      render={
                        <Link to="/" underlined={false}>
                          Board
                        </Link>
                      }
                    />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {issue.fields.parent?.key ? (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          render={
                            <Link
                              to="/issue/$issueId"
                              params={{ issueId: issue.fields.parent.id }}
                              underlined={false}
                            >
                              {issue.fields.parent.key}
                            </Link>
                          }
                        />
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  ) : null}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{issue.key}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to the board (Esc)"
                title="Back to the board (Esc)"
                nativeButton={false}
                render={<Link to="/" underlined={false} />}
              >
                <RiCloseLine />
              </Button>
            </div>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_calc(20rem+1.5rem+1px)]">
              <div className="min-w-0">
                <CardTitle className="text-lg">
                  {issue.fields.summary}
                </CardTitle>
                <Tabs
                  value={
                    tab === "checklist" && !checklist
                      ? "description"
                      : (tab ?? "description")
                  }
                  onValueChange={(value) =>
                    navigate({
                      search: {
                        tab:
                          value === "checklist" || value === "comments"
                            ? value
                            : undefined,
                      },
                    })
                  }
                  className="mt-4"
                >
                  <TabsList variant="line">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    {checklist ? (
                      <TabsTrigger value="checklist">
                        Checklist
                        <span className="bg-muted px-1 tabular-nums text-muted-foreground">
                          {checklist.done}/{checklist.total}
                        </span>
                      </TabsTrigger>
                    ) : null}
                    <TabsTrigger value="comments">
                      Comments
                      {comments?.total ? (
                        <span className="bg-muted px-1 tabular-nums text-muted-foreground">
                          {comments.total}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-2 w-full">
                    {description}
                  </TabsContent>
                  {checklist && checklistField ? (
                    <TabsContent value="checklist" className="mt-2">
                      <Checklist
                        checklist={checklist}
                        issueId={issueId}
                        issueKey={issue.key}
                        fieldId={checklistField}
                      />
                    </TabsContent>
                  ) : null}
                  <TabsContent value="comments" className="mt-2">
                    <Comments
                      issueKey={issue.key}
                      attachments={issue.fields.attachment}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              <div className="self-start border-t pt-6 lg:sticky lg:top-14 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 lg:max-h-[calc(100vh-9rem)] lg:overflow-x-hidden lg:overflow-y-auto">
                <IssueSidebar issue={issue} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <div className="my-8 w-full max-w-xl space-y-3">
          <ErrorState
            title={
              isNotFound(error)
                ? `${issueId} doesn't exist, or you can't see it`
                : `Couldn't load ${issueId}`
            }
            error={isNotFound(error) ? null : error}
            onRetry={isNotFound(error) ? undefined : () => refetch()}
          />
          <Link to="/">Back to the board</Link>
        </div>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
