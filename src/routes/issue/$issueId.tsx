import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Adf } from "#/components/adf/block-nodes/adf";
import { Card, CardContent, CardTitle } from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import { Spinner } from "#/components/ui/spinner";
import { issueOptions } from "#/lib/api/issues";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const Route = createFileRoute("/issue/$issueId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { issueId } = Route.useParams();
  const { data: issue } = useQuery(issueOptions(issueId));
  console.dir(issue);
  return (
    <div className="h-screen w-full flex justify-center">
      {issue ? (
        <Card className="w-7xl my-8 overflow-auto pt-0">
          <CardContent>
            <Breadcrumb className="sticky top-0 bg-card pt-[var(--card-spacing)] pb-2">
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
            <CardTitle className="text-lg">{issue.fields.summary}</CardTitle>
            <div className="overflow-y-scroll mt-4 w-[80ch]">
              <Adf content={issue.fields.description.content} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
