import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/module/markdown";
import { ReplyForm } from "@/components/forum/reply-form";
import { ReportPostButton } from "@/components/forum/report-post-button";
import { ThreadAuthorActions } from "@/components/forum/thread-author-actions";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { requireForumAccess } from "@/lib/forum/gate";
import { timeAgo } from "@/lib/forum/format";

type PageProps = { params: Promise<{ id: string }> };

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  closed: boolean;
  hidden: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  phase: {
    id: string;
    order_index: number;
    title: string;
    title_en: string | null;
  } | null;
};

type PostRow = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("Student");
  return {
    title: t("thread.metaTitle"),
    alternates: { canonical: `/comunidad/${id}` },
  };
}

export default async function ThreadPage({ params }: PageProps) {
  const { id } = await params;
  const { userId, isAdmin } = await requireForumAccess(`/comunidad/${id}`);

  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data: thread, error: tErr } = await supabase
    .from("forum_threads")
    .select(
      `id, title, body, pinned, closed, hidden, author_id, created_at, updated_at,
       author:profiles!forum_threads_author_id_fkey(id, full_name, avatar_url),
       phase:phases!forum_threads_phase_id_fkey(id, order_index, title, title_en)`,
    )
    .eq("id", id)
    .maybeSingle<ThreadRow>();
  if (tErr) throw new Error(`No se pudo cargar el hilo: ${tErr.message}`);
  if (!thread) notFound();
  // Hidden threads: solo admin puede entrar (para moderar/restaurar).
  if (thread.hidden && !isAdmin) notFound();

  const { data: posts, error: pErr } = await supabase
    .from("forum_posts")
    .select(
      `id, body, author_id, created_at,
       author:profiles!forum_posts_author_id_fkey(full_name, avatar_url)`,
    )
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .returns<PostRow[]>();
  if (pErr) throw new Error(`No se pudieron cargar las respuestas: ${pErr.message}`);
  const replies = posts ?? [];

  const canManage = userId === thread.author_id || isAdmin;

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/comunidad"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("thread.back")}
        </Link>

        {/* Header del hilo */}
        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {thread.pinned && (
              <Badge className="bg-brand-coral text-brand-coral-foreground">
                <Pin className="size-3" strokeWidth={3} />
                {t("thread.pinned")}
              </Badge>
            )}
            {thread.closed && (
              <Badge variant="secondary">{t("thread.closed")}</Badge>
            )}
            {thread.phase && (
              <Badge variant="outline" className="font-normal">
                {t("thread.phaseBadge", {
                  order: String(thread.phase.order_index).padStart(2, "0"),
                  title:
                    localized(thread.phase, "title", locale) ??
                    thread.phase.title,
                })}
              </Badge>
            )}
          </div>
          <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            {thread.title}
          </h1>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage src={thread.author?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(thread.author?.full_name ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {thread.author?.full_name ?? t("thread.authorFallback")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(thread.created_at)}
                </p>
              </div>
            </div>
            {canManage && (
              <ThreadAuthorActions
                threadId={thread.id}
                closed={thread.closed}
              />
            )}
          </div>
        </header>

        {/* Body del hilo */}
        <article className="prose prose-neutral mb-12 max-w-none dark:prose-invert">
          <Markdown>{thread.body}</Markdown>
        </article>

        {/* Respuestas */}
        <section className="border-t pt-8">
          <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {replies.length}{" "}
            {replies.length === 1
              ? t("thread.replyOne")
              : t("thread.replyOther")}
          </h2>

          {replies.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center text-sm text-muted-foreground">
              {t("thread.emptyReplies")}
            </p>
          ) : (
            <ul className="space-y-6">
              {replies.map((p) => {
                const isOwnPost = p.author_id === userId;
                return (
                  <li
                    key={p.id}
                    id={`post-${p.id}`}
                    className="scroll-mt-20 rounded-xl border bg-card px-5 py-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={p.author?.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {(p.author?.full_name ?? "?").slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <span className="font-medium">
                            {p.author?.full_name ?? t("thread.authorFallback")}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {timeAgo(p.created_at)}
                          </span>
                        </div>
                      </div>
                      {!isOwnPost && <ReportPostButton postId={p.id} />}
                    </div>
                    <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
                      <Markdown>{p.body}</Markdown>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Form de respuesta */}
          <div className="mt-10">
            {thread.closed ? (
              <p className="rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center text-sm text-muted-foreground">
                {t("thread.threadClosed")}
              </p>
            ) : (
              <ReplyForm threadId={thread.id} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
