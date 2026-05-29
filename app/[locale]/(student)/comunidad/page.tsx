import { getTranslations, getLocale } from "next-intl/server";
import { MessageCircle, MessagesSquare, Pin, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommunityPhaseFilter } from "@/components/forum/community-phase-filter";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { requireForumAccess } from "@/lib/forum/gate";
import { snippet, timeAgo } from "@/lib/forum/format";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("community.metaTitle") };
}

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  closed: boolean;
  updated_at: string;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  phase: {
    id: string;
    order_index: number;
    title: string;
    title_en: string | null;
  } | null;
  posts_count: { count: number }[] | null;
};

type PageProps = {
  searchParams: Promise<{ phase?: string }>;
};

export default async function ComunidadPage({ searchParams }: PageProps) {
  await requireForumAccess("/comunidad");
  const { phase: blockFilter } = await searchParams;

  const tr = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();

  // Catálogo de fases para el filtro
  const { data: phases } = await supabase
    .from("phases")
    .select("id, order_index, title, title_en")
    .order("order_index", { ascending: true });

  let query = supabase
    .from("forum_threads")
    .select(
      `id, title, body, pinned, closed, updated_at,
       author:profiles!forum_threads_author_id_fkey(id, full_name, avatar_url),
       phase:phases!forum_threads_phase_id_fkey(id, order_index, title, title_en),
       posts_count:forum_posts(count)`,
    )
    .eq("hidden", false)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);

  if (blockFilter && blockFilter !== "all") {
    query = query.eq("phase_id", blockFilter);
  }

  const { data, error } = await query.returns<ThreadRow[]>();
  if (error) {
    throw new Error(`No se pudieron cargar los hilos: ${error.message}`);
  }
  const threads = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              {tr("community.eyebrow")}
            </p>
            <h1 className="font-grotesk text-3xl font-semibold">
              {tr("community.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("community.subtitle")}
            </p>
          </div>
          <Button render={<Link href="/comunidad/nuevo" />}>
            <Plus className="size-4" />
            {tr("community.newThread")}
          </Button>
        </header>

        <div className="mb-6">
          <CommunityPhaseFilter
            phases={(
              (phases ?? []) as {
                id: string;
                order_index: number;
                title: string;
                title_en: string | null;
              }[]
            ).map((p) => ({
              id: p.id,
              order_index: p.order_index,
              title: localized(p, "title", locale) ?? p.title,
            }))}
            current={blockFilter ?? "all"}
          />
        </div>

        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
            <MessagesSquare className="mx-auto mb-3 size-8 text-muted-foreground/60" />
            <p className="font-medium">{tr("community.empty.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("community.empty.description")}
            </p>
            <Button className="mt-6" render={<Link href="/comunidad/nuevo" />}>
              <Plus className="size-4" />
              {tr("community.empty.cta")}
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {threads.map((t) => {
              const postsCount = t.posts_count?.[0]?.count ?? 0;
              return (
                <li key={t.id}>
                  <Link
                    href={`/comunidad/${t.id}`}
                    className="block rounded-xl border bg-card px-5 py-4 transition-colors hover:border-brand-coral/40 hover:bg-card/80"
                  >
                    <div className="flex gap-4">
                      <Avatar className="mt-0.5 size-10 shrink-0">
                        <AvatarImage src={t.author?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(t.author?.full_name ?? "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start gap-2">
                          {t.pinned && (
                            <Pin
                              className="mt-1 size-3.5 shrink-0 text-brand-coral"
                              strokeWidth={2.5}
                            />
                          )}
                          <h2 className="font-medium leading-snug">
                            {t.title}
                          </h2>
                          {t.closed && (
                            <Badge
                              variant="secondary"
                              className="ml-auto shrink-0 font-normal"
                            >
                              {tr("community.closed")}
                            </Badge>
                          )}
                        </div>

                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                          {snippet(t.body)}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {t.author?.full_name ??
                              tr("community.authorFallback")}
                          </span>
                          <span className="text-border">·</span>
                          <span>{timeAgo(t.updated_at)}</span>
                          <span className="text-border">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="size-3" />
                            {postsCount}{" "}
                            {postsCount === 1
                              ? tr("community.replyOne")
                              : tr("community.replyOther")}
                          </span>
                          {t.phase && (
                            <>
                              <span className="text-border">·</span>
                              <Badge variant="outline" className="font-normal">
                                {tr("community.phaseBadge", {
                                  order: String(
                                    t.phase.order_index,
                                  ).padStart(2, "0"),
                                  title:
                                    localized(t.phase, "title", locale) ??
                                    t.phase.title,
                                })}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
