import Link from "next/link";
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
import { ForumThreadActions } from "@/components/admin/forum-thread-actions";
import { ResolveReportButton } from "@/components/admin/forum-report-actions";
import { createClient } from "@/lib/supabase/server";
import { snippet, timeAgo } from "@/lib/forum/format";

export const metadata = { title: "Comunidad — Moderación · Admin DAP" };

type ThreadRow = {
  id: string;
  title: string;
  pinned: boolean;
  closed: boolean;
  hidden: boolean;
  updated_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
  block: { order_index: number } | null;
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
  const supabase = await createClient();

  const { data: threadsData, error: tErr } = await supabase
    .from("forum_threads")
    .select(
      `id, title, pinned, closed, hidden, updated_at,
       author:profiles!forum_threads_author_id_fkey(full_name, avatar_url),
       block:blocks!forum_threads_block_id_fkey(order_index),
       posts_count:forum_posts(count)`,
    )
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200)
    .returns<ThreadRow[]>();
  if (tErr) {
    throw new Error(`No se pudieron cargar los hilos: ${tErr.message}`);
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
    throw new Error(`No se pudieron cargar reportes: ${rErr.message}`);
  }
  const reports = reportsData ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <header>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Admin · Moderación
          </p>
          <h1 className="font-serif text-3xl font-semibold">Comunidad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modera hilos y reportes del foro. Pinea anuncios oficiales, cierra
            conversaciones agotadas y oculta contenido inapropiado.
          </p>
        </header>

        {/* THREADS */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold">
                Todos los hilos
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {threads.length} en total · {threads.filter((t) => t.hidden).length} ocultos
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hilo</TableHead>
                  <TableHead className="hidden md:table-cell w-24 text-center">
                    Bloque
                  </TableHead>
                  <TableHead className="hidden sm:table-cell w-20 text-center">
                    Posts
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-28">
                    Actividad
                  </TableHead>
                  <TableHead className="w-40 text-right">Estado</TableHead>
                  <TableHead className="w-32 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {threads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      No hay hilos todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  threads.map((t) => (
                    <TableRow
                      key={t.id}
                      className={t.hidden ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Link
                          href={`/comunidad/${t.id}`}
                          className="block hover:text-brand-coral"
                          target="_blank"
                        >
                          <div className="flex items-center gap-2">
                            {t.pinned && (
                              <Pin
                                className="size-3.5 shrink-0 text-brand-coral"
                                strokeWidth={2.5}
                              />
                            )}
                            <p className="font-medium leading-tight">
                              {t.title}
                            </p>
                          </div>
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="size-4">
                            <AvatarImage src={t.author?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">
                              {(t.author?.full_name ?? "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{t.author?.full_name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-xs tabular-nums">
                        {t.block
                          ? String(t.block.order_index).padStart(2, "0")
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center tabular-nums text-sm">
                        {t.posts_count?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {timeAgo(t.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                          {t.pinned && (
                            <Badge className="bg-brand-coral text-brand-coral-foreground font-normal">
                              <Pin className="size-3" strokeWidth={3} />
                              Pin
                            </Badge>
                          )}
                          {t.closed && (
                            <Badge variant="secondary" className="font-normal">
                              <Lock className="size-3" />
                              Cerrado
                            </Badge>
                          )}
                          {t.hidden && (
                            <Badge
                              variant="outline"
                              className="border-red-500/40 text-red-500 font-normal"
                            >
                              <EyeOff className="size-3" />
                              Oculto
                            </Badge>
                          )}
                          {!t.pinned && !t.closed && !t.hidden && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ForumThreadActions
                          threadId={t.id}
                          pinned={t.pinned}
                          closed={t.closed}
                          hidden={t.hidden}
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
              <h2 className="font-serif text-2xl font-semibold flex items-center gap-2">
                <Flag className="size-5 text-red-500" />
                Posts reportados
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {reports.length} pendiente
                {reports.length === 1 ? "" : "s"} de revisar
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center text-sm text-muted-foreground">
              No hay reportes pendientes.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razón del reporte</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Post reportado
                    </TableHead>
                    <TableHead className="hidden lg:table-cell w-32">
                      Reportado
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
                          por {r.reporter?.full_name ?? "—"} ·{" "}
                          {timeAgo(r.created_at)}
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
                              autor: {r.post.author?.full_name ?? "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Post borrado
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
                              Ver
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
