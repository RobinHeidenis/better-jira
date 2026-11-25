import {
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiMoreFill,
  RiPencilLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import type { Attachment } from "#/lib/api/attachments";
import {
  addComment,
  adfToPlainText,
  commentsOptions,
  deleteComment,
  type JiraComment,
  updateComment,
} from "#/lib/api/comments";
import { currentUserOptions } from "#/lib/api/current-user";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import { initials, timeAgo } from "#/lib/utils";
import { Adf } from "./adf/adf";
import { ErrorState } from "./error-state";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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

const CommentMenu = ({
  editable,
  jiraUrl,
  onEdit,
  onDelete,
}: {
  editable: boolean;
  jiraUrl: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Comment actions"
          className="ml-auto opacity-0 group-hover/comment:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
        />
      }
    >
      <RiMoreFill />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {editable ? (
        <DropdownMenuItem onClick={onEdit}>
          <RiPencilLine />
          Edit
        </DropdownMenuItem>
      ) : jiraUrl ? (
        <DropdownMenuItem
          render={<a href={jiraUrl} target="_blank" rel="noreferrer" />}
        >
          <RiExternalLinkLine />
          Edit in Jira
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem variant="destructive" onClick={onDelete}>
        <RiDeleteBinLine />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const Comment = ({
  comment,
  issueKey,
  attachments,
  isOwn,
}: {
  comment: JiraComment;
  issueKey: string;
  attachments?: readonly Attachment[] | null;
  isOwn: boolean;
}) => {
  const queryClient = useQueryClient();
  const baseUrl = useSelector(store, (state) => state.baseUrl);
  const { queryKey } = commentsOptions(issueKey);
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const plainText = adfToPlainText(comment.body?.content);
  const [draft, setDraft] = useState(plainText ?? "");
  const name = comment.author?.displayName ?? "Unknown user";

  const edit = useMutation({
    mutationFn: (text: string) => updateComment(issueKey, comment.id, text),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? {
              ...old,
              comments: old.comments.map((existing) =>
                existing.id === updated.id ? updated : existing,
              ),
            }
          : old,
      );
      setMode("view");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteComment(issueKey, comment.id),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? {
              comments: old.comments.filter(
                (existing) => existing.id !== comment.id,
              ),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const save = () => {
    if (draft.trim() && !edit.isPending) edit.mutate(draft);
  };

  return (
    <li className="group/comment flex gap-3 py-4">
      <Avatar size="sm" rounded={false} className="mt-0.5">
        <AvatarImage
          src={comment.author?.avatarUrls?.["48x48"] ?? undefined}
          alt=""
        />
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
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
          {isOwn && mode === "view" ? (
            <CommentMenu
              editable={plainText !== null}
              jiraUrl={
                baseUrl
                  ? `${jiraIssueUrl(baseUrl, issueKey)}?focusedCommentId=${comment.id}`
                  : null
              }
              onEdit={() => {
                setDraft(plainText ?? "");
                setMode("edit");
              }}
              onDelete={() => setMode("confirmDelete")}
            />
          ) : null}
        </div>

        {mode === "edit" ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <Textarea
              aria-label="Edit comment"
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  save();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setMode("view");
                }
              }}
              disabled={edit.isPending}
            />
            {edit.error ? (
              <ErrorState
                title="Couldn't save the comment"
                error={edit.error}
              />
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode("view")}
                disabled={edit.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!draft.trim() || edit.isPending}
              >
                {edit.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : comment.body?.content ? (
          <Adf
            content={comment.body.content}
            attachments={attachments}
            issueKey={issueKey}
          />
        ) : null}

        {mode === "confirmDelete" ? (
          <div className="flex flex-wrap items-center gap-2 border border-destructive/40 bg-destructive/5 p-2">
            <span className="flex-1">
              Delete this comment? This can't be undone.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("view")}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        ) : null}
        {remove.error ? (
          <ErrorState
            title="Couldn't delete the comment"
            error={remove.error}
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
  const { data: me } = useQuery(currentUserOptions());

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
            isOwn={!!me && comment.author?.accountId === me.accountId}
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
