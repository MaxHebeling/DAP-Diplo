import { Link } from "@/i18n/navigation";
import { ExternalLink, EyeOff, Flag, Lock, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import { ForumThreadActions } from "@/components/admin/forum-thread-actions";
import { ResolveReportButton } from "@/components/admin/forum-report-actions";
import { createClient } from "@/lib/supabase/server";
import { snippet, timeAgo } from "@/lib/forum/format";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("community.metaTitle") };
}

type ThreadRow = {
  id: string;
  title: string;
  pinned: boolean;
  closed: boolean;
  hidden: boolean;
  updated_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
  phase: { order_index: number } | null;
  posts_count: { count: number }[] | null;
};

type ReportRow = {
  id: string;
  reason: string;
  created_at: string;
  reporter: { full_name: string } | null;
  post: {
    id: string;
    body: string;
    thread_id: string;
    author: { full_name: string } | null;
    thread: { id: string; title: string } | null;
  } | null;
};

export default async function AdminComunidadPage() {
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: threadsData, error: tErr } = await supabase
    .from("forum_threads")
    .select(
      `id, title, pinned, closed, hidden, updated_at,
       author:profiles!forum_threads_author_id_fkey(full_name, avatar_url),
       phase:phases!forum_threads_phase_id_fkey(order_index),
       posts_count:forum_posts(count)`,
    )
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200)
    .returns<ThreadRow[]>();
  if (tErr) {
    throw new Error(t("community.threadsLoadError", { message: tErr.message }));
  }
  const threads = threadsData ?? [];

  const { data: reportsData, error: rErr } = await supabase
    .from("forum_reports")
    .select(
      `id, reason, created_at,
       reporter:profiles!forum_reports_reporter_id_fkey(full_name),
       post:forum_posts!forum_reports_post_id_fkey(
         id, body, thread_id,
         author:profiles!forum_posts_author_id_fkey(full_name),
         thread:forum_threads!forum_posts_thread_id_fkey(id, title)
       )`,
    )
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();
  if (rErr) {
    throw new Error(t("community.reportsLoadError", { message: rErr.message }));
  }
  const reports = reportsData ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <header>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("community.eyebrow")}
          </p>
          <h1 className="font-grotesk text-3xl font-semibold">{t("community.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("community.description")}
          </p>
        </header>

        {/* THREADS */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-grotesk text-2xl font-semibold">
                {t("community.allThreads")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("community.threadsSummary", {
                  total: threads.length,
                  hidden: threads.filter((thread) => thread.hidden).length,
                })}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("community.thThread")}</TableHead>
                  <TableHead className="hidden md:table-cell w-24 text-center">
                    {t("community.thPhase")}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell w-20 text-center">
                    {t("community.thPosts")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-28">
                    {t("community.thActivity")}
                  </TableHead>
                  <TableHead className="w-40 text-right">{t("community.thStatus")}</TableHead>
                  <TableHead className="w-32 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {threads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      {t("community.noThreads")}
                    </TableCell>
                  </TableRow>
                ) : (
                  threads.map((thread) => (
                    <TableRow
                      key={thread.id}
                      className={thread.hidden ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Link
                          href={`/comunidad/${thread.id}`}
                          className="block hover:text-brand-coral"
                          target="_blank"
                        >
                          <div className="flex items-center gap-2">
                            {thread.pinned && (
                              <Pin
                                className="size-3.5 shrink-0 text-brand-coral"
                                strokeWidth={2.5}
                              />
                            )}
                            <p className="font-medium leading-tight">
                              {thread.title}
                            </p>
                          </div>
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="size-4">
                            <AvatarImage src={thread.author?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">
                              {(thread.author?.full_name ?? "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{thread.author?.full_name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-xs tabular-nums">
                        {thread.phase
                          ? String(thread.phase.order_index).padStart(2, "0")
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center tabular-nums text-sm">
                        {thread.posts_count?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {timeAgo(thread.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                          {thread.pinned && (
                            <Badge className="bg-brand-coral text-brand-coral-foreground font-normal">
                              <Pin className="size-3" strokeWidth={3} />
                              {t("community.badgePin")}
                            </Badge>
                          )}
                          {thread.closed && (
                            <Badge variant="secondary" className="font-normal">
                              <Lock className="size-3" />
                              {t("community.badgeClosed")}
                            </Badge>
                          )}
                          {thread.hidden && (
                            <Badge
                              variant="outline"
                              className="border-red-500/40 text-red-500 font-normal"
                            >
                              <EyeOff className="size-3" />
                              {t("community.badgeHidden")}
                            </Badge>
                          )}
                          {!thread.pinned && !thread.closed && !thread.hidden && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ForumThreadActions
                          threadId={thread.id}
                          pinned={thread.pinned}
                          closed={thread.closed}
                          hidden={thread.hidden}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* REPORTS PENDING */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-grotesk text-2xl font-semibold flex items-center gap-2">
                <Flag className="size-5 text-red-500" />
                {t("community.reportedPosts")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("community.reportsSummary", { count: reports.length })}
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center text-sm text-muted-foreground">
              {t("community.noReports")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("community.thReportReason")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("community.thReportedPost")}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell w-32">
                      {t("community.thReported")}
                    </TableHead>
                    <TableHead className="w-44 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="text-sm leading-snug">{r.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("community.reportedBy", {
                            name: r.reporter?.full_name ?? "—",
                            time: timeAgo(r.created_at),
                          })}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {r.post ? (
                          <div className="text-xs text-muted-foreground">
                            <p className="font-medium text-foreground truncate max-w-[280px]">
                              {r.post.thread?.title ?? "—"}
                            </p>
                            <p className="line-clamp-2 mt-0.5">
                              «{snippet(r.post.body, 120)}»
                            </p>
                            <p className="mt-0.5">
                              {t("community.postAuthor", {
                                name: r.post.author?.full_name ?? "—",
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("community.postDeleted")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {timeAgo(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {r.post?.thread_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              render={
                                <Link
                                  href={`/comunidad/${r.post.thread_id}#post-${r.post.id}`}
                                  target="_blank"
                                />
                              }
                            >
                              <ExternalLink className="size-3.5" />
                              {t("community.view")}
                            </Button>
                          )}
                          <ResolveReportButton reportId={r.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
