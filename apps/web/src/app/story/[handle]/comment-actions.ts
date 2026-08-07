"use server";

import { commentSchema } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";

export type CommentView = {
  id: string;
  body: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  editedAt: string | null;
};

type AddResult = { ok: true; comment: CommentView } | { ok: false; error: string };

async function displayName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name?.trim() || data?.username || "Someone";
}

// §4.7 — a comment or a single-level reply. Depth is capped at 1 app-side.
export async function addComment(input: {
  storyId: string;
  body: string;
  parentCommentId?: string;
}): Promise<AddResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to comment." };

  const parsed = commentSchema.safeParse({
    body: input.body,
    parentCommentId: input.parentCommentId,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  // Enforce one reply level: a reply's parent must be a top-level comment.
  if (parsed.data.parentCommentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, parent_comment_id, story_id")
      .eq("id", parsed.data.parentCommentId)
      .maybeSingle();
    if (!parent || parent.story_id !== input.storyId) {
      return { ok: false, error: "That comment no longer exists." };
    }
    if (parent.parent_comment_id) {
      return { ok: false, error: "Replies can't be nested further." };
    }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      story_id: input.storyId,
      author_id: user.id,
      parent_comment_id: parsed.data.parentCommentId ?? null,
      body: parsed.data.body,
    })
    .select("id, body, parent_comment_id, created_at, edited_at")
    .single();
  if (error || !data) return { ok: false, error: "Could not post your comment." };

  return {
    ok: true,
    comment: {
      id: data.id,
      body: data.body,
      parentCommentId: data.parent_comment_id,
      authorId: user.id,
      authorName: await displayName(supabase, user.id),
      createdAt: data.created_at,
      editedAt: data.edited_at,
    },
  };
}

export async function editComment(
  commentId: string,
  body: string,
): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const parsed = commentSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }
  const { error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body, edited_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) return { ok: false, error: "Could not edit." };
  return { ok: true, body: parsed.data.body };
}

export async function deleteComment(
  commentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { ok: false, error: "Could not delete." };
  return { ok: true };
}
