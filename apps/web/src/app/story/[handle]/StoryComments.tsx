"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  addComment,
  deleteComment,
  editComment,
  type CommentView,
} from "./comment-actions";

const inputClass =
  "w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-paper)] outline-none focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]";

function Composer({
  onSubmit,
  placeholder,
  autoFocus,
}: {
  onSubmit: (body: string) => Promise<string | null>;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (body.trim().length === 0) return;
    setBusy(true);
    const err = await onSubmit(body.trim());
    setBusy(false);
    if (err) setError(err);
    else {
      setBody("");
      setError(null);
    }
  }

  return (
    <div className="mt-2">
      <textarea
        className={`${inputClass} min-h-16 resize-y`}
        placeholder={placeholder}
        value={body}
        maxLength={1000}
        autoFocus={autoFocus}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>}
      <div className="mt-2">
        <Button type="button" onClick={submit} disabled={busy || body.trim().length === 0}>
          {busy ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}

function CommentRow({
  c,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  canReply,
}: {
  c: CommentView;
  isOwn: boolean;
  onReply?: () => void;
  onEdit: (body: string) => Promise<string | null>;
  onDelete: () => void;
  canReply: boolean;
}) {
  const [editing, setEditing] = React.useState(false);

  return (
    <div className="border-t border-[var(--color-line)] py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-paper)]">{c.authorName}</span>
        {isOwn && !editing && (
          <span className="flex gap-3 text-xs text-[var(--color-muted)]">
            <button type="button" onClick={() => setEditing(true)} className="hover:text-[var(--color-paper)]">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="hover:text-[var(--color-paper)]">
              Delete
            </button>
          </span>
        )}
      </div>
      {editing ? (
        <Composer
          autoFocus
          placeholder="Edit your comment"
          onSubmit={async (body) => {
            const err = await onEdit(body);
            if (!err) setEditing(false);
            return err;
          }}
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-paper)]">
          {c.body}
          {c.editedAt ? <span className="text-[var(--color-muted)]"> (edited)</span> : null}
        </p>
      )}
      {canReply && onReply && (
        <button
          type="button"
          onClick={onReply}
          className="mt-1 text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-paper)]"
        >
          Reply
        </button>
      )}
    </div>
  );
}

export function StoryComments({
  storyId,
  initialComments,
  currentUserId,
  signedIn,
  next,
}: {
  storyId: string;
  initialComments: CommentView[];
  currentUserId: string | null;
  signedIn: boolean;
  next: string;
}) {
  const router = useRouter();
  const [comments, setComments] = React.useState<CommentView[]>(initialComments);
  const [replyTo, setReplyTo] = React.useState<string | null>(null);

  const tops = comments.filter((c) => c.parentCommentId === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parentCommentId === id);

  function requireAuth(): boolean {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return false;
    }
    return true;
  }

  async function post(body: string, parentCommentId?: string): Promise<string | null> {
    if (!requireAuth()) return null;
    const res = await addComment({ storyId, body, parentCommentId });
    if (!res.ok) return res.error;
    setComments((prev) => [...prev, res.comment]);
    setReplyTo(null);
    return null;
  }

  async function edit(id: string, body: string): Promise<string | null> {
    const res = await editComment(id, body);
    if (!res.ok) return res.error;
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, body: res.body, editedAt: new Date().toISOString() } : c)),
    );
    return null;
  }

  async function remove(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id && c.parentCommentId !== id));
    await deleteComment(id);
  }

  return (
    <section className="mt-10">
      <h2 className="mb-2 text-[var(--color-paper)]">
        {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Comments"}
      </h2>

      {signedIn ? (
        <Composer placeholder="Add a comment…" onSubmit={(body) => post(body)} />
      ) : (
        <button
          type="button"
          onClick={() => requireAuth()}
          className="text-sm text-[var(--color-muted)] underline underline-offset-4"
        >
          Sign in to comment
        </button>
      )}

      <div className="mt-4">
        {tops.map((c) => (
          <div key={c.id}>
            <CommentRow
              c={c}
              isOwn={c.authorId === currentUserId}
              canReply={signedIn}
              onReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
              onEdit={(body) => edit(c.id, body)}
              onDelete={() => remove(c.id)}
            />
            <div className="pl-5">
              {repliesOf(c.id).map((r) => (
                <CommentRow
                  key={r.id}
                  c={r}
                  isOwn={r.authorId === currentUserId}
                  canReply={false}
                  onEdit={(body) => edit(r.id, body)}
                  onDelete={() => remove(r.id)}
                />
              ))}
              {replyTo === c.id && (
                <Composer
                  autoFocus
                  placeholder={`Reply to ${c.authorName}…`}
                  onSubmit={(body) => post(body, c.id)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
