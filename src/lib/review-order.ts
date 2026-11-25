import { issueDeveloper, type JiraBoardIssue } from "#/lib/api/issues";

/**
 * Lower ranks come first: reviews waiting on me, then my own work still with
 * me, then tickets I reported that someone else holds, then everything else.
 */
const reviewRank = (
  issue: JiraBoardIssue,
  me: string,
  developerField: string | null,
) => {
  const assignedToMe = issue.fields.assignee?.accountId === me;
  const reportedByMe = issue.fields.reporter?.accountId === me;
  const developedByMe = issueDeveloper(issue, developerField)?.accountId === me;

  if (assignedToMe && !reportedByMe && !developedByMe) return 0;
  if (assignedToMe && developedByMe) return 1;
  if (reportedByMe && !assignedToMe) return 2;
  return 3;
};

export const sortForReview = (
  issues: JiraBoardIssue[],
  me: string,
  developerField: string | null,
) =>
  [...issues].sort(
    (a, b) =>
      reviewRank(a, me, developerField) - reviewRank(b, me, developerField),
  );
