import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Attachment } from "#/lib/api/attachments";
import {
  addComment,
  commentsOptions,
  type JiraComment,
} from "#/lib/api/comments";
import { initials, timeAgo } from "#/lib/utils";
import { Adf } from "./adf/adf";
import { ErrorState } from "./error-state";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Textarea } from "./ui/textarea";

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// Jira bumps `updated` by a few milliseconds on create, so only a real gap
// counts as an edit.
const wasEdited = (comment: JiraComment) =>
  !!comment.updated &&
  Date.parse(comment.updated) - Date.parse(comment.created) > 60_000;

const Comment = ({
  comment,
  issueKey,
  attachments,
}: {
  comment: JiraComment;
  issueKey: string;
  attachments?: readonly Attachment[] | null;
}) => {
  const name = comment.author?.displayName ?? "Unknown user";
  return (
    <li className="flex gap-3 py-4">
      <Avatar size="sm" rounded={false} className="mt-0.5">
        <AvatarImage
          src={comment.author?.avatarUrls?.["48x48"] ?? undefined}
          alt=""
        />
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{name}</span>
          <time
            dateTime={comment.created}
            title={dateTime.format(new Date(comment.created))}
            className="text-muted-foreground"
          >
            {timeAgo(comment.created)}
          </time>
          {wasEdited(comment) && comment.updated ? (
            <span
              className="text-muted-foreground"
              title={`Edited ${dateTime.format(new Date(comment.updated))}`}
            >
              (edited)
            </span>
          ) : null}
        </p>
        {comment.body?.content ? (
          <Adf
            content={comment.body.content}
            attachments={attachments}
            issueKey={issueKey}
          />
        ) : null}
      </div>
    </li>
  );
};

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

const CommentForm = ({ issueKey }: { issueKey: string }) => {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { queryKey } = commentsOptions(issueKey);

  const post = useMutation({
    mutationFn: (body: string) => addComment(issueKey, body),
    onSuccess: (comment) => {
      // Show it straight away; the refetch below picks up anything else.
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? { comments: [comment, ...old.comments], total: old.total + 1 }
          : old,
      );
      setText("");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const submit = () => {
    if (text.trim() && !post.isPending) post.mutate(text);
  };

  return (
    <form
      className="space-y-2 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Textarea
        aria-label="Add a comment"
        placeholder="Add a comment…"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        disabled={post.isPending}
      />
      {post.error ? (
        <ErrorState title="Couldn't post the comment" error={post.error} />
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <span className="text-muted-foreground">
          {isMac ? "⌘" : "Ctrl"}+Enter to post
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || post.isPending}
        >
          {post.isPending ? "Posting…" : "Comment"}
        </Button>
      </div>
    </form>
  );
};

export const Comments = ({
  issueKey,
  attachments,
}: {
  issueKey: string;
  attachments?: readonly Attachment[] | null;
}) => {
  const { data, isPending, error, refetch } = useQuery(
    commentsOptions(issueKey),
  );

  if (isPending) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState
        title="Couldn't load the comments"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }
  if (!data.comments.length) {
    return (
      <>
        <CommentForm issueKey={issueKey} />
        <p className="py-4 text-muted-foreground">No comments yet.</p>
      </>
    );
  }

  return (
    <>
      <CommentForm issueKey={issueKey} />
      <ul className="divide-y">
        {data.comments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            issueKey={issueKey}
            attachments={attachments}
          />
        ))}
      </ul>
      {data.total > data.comments.length ? (
        <p className="py-4 text-muted-foreground">
          Showing the newest {data.comments.length} of {data.total} comments.
        </p>
      ) : null}
    </>
  );
};
