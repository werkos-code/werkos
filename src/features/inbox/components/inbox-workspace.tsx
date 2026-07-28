"use client";

import { MessageSquarePlus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ConversationMessageRow,
  ConversationRow,
} from "@/features/inbox/inbox-actions";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";

type InboxWorkspaceProps = {
  conversations: ConversationRow[];
  projects: Array<{ id: string; name: string }>;
  selectedId?: string;
  selectedMessages?: ConversationMessageRow[];
  selectedConversation?: ConversationRow;
};

export function InboxWorkspace({
  conversations,
  projects,
  selectedId,
  selectedMessages = [],
  selectedConversation,
}: InboxWorkspaceProps) {
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (row) =>
        row.subject.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q) ||
        (row.lastMessagePreview?.toLowerCase().includes(q) ?? false),
    );
  }, [conversations, query]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetaStatCard
          label={t("kpiTotal")}
          value={String(conversations.length)}
        />
        <MetaStatCard
          label={t("kpiProjects")}
          value={String(new Set(conversations.map((c) => c.projectId)).size)}
        />
        <MetaStatCard
          label={t("kpiRecent")}
          value={String(
            conversations.filter((c) => {
              const age = Date.now() - new Date(c.lastMessageAt).getTime();
              return age < 7 * 86_400_000;
            }).length,
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => setShowNew((v) => !v)}>
          <MessageSquarePlus className="mr-1.5 size-4" />
          {t("newConversation")}
        </Button>
      </div>

      {showNew ? (
        <PageCard className="max-w-xl p-5">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setError(null);
              startTransition(() => {
                void (async () => {
                  try {
                    const response = await fetch("/api/inbox", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        projectId: String(form.get("projectId") ?? ""),
                        subject: String(form.get("subject") ?? ""),
                        body: String(form.get("body") ?? ""),
                      }),
                      signal: AbortSignal.timeout(20_000),
                    });
                    const result = (await response.json()) as {
                      error?: string;
                      conversationId?: string;
                    };
                    if (!response.ok || result.error || !result.conversationId) {
                      setError(result.error || tCommon("error"));
                      return;
                    }
                    setShowNew(false);
                    router.push(`/inbox/${result.conversationId}`);
                  } catch {
                    setError(tCommon("error"));
                  }
                })();
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="projectId">{t("fields.project")}</Label>
              <select
                id="projectId"
                name="projectId"
                required
                className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  {t("fields.projectPlaceholder")}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">{t("fields.subject")}</Label>
              <Input id="subject" name="subject" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">{t("fields.message")}</Label>
              <textarea
                id="body"
                name="body"
                rows={4}
                required
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? tCommon("loading") : t("create")}
            </Button>
          </form>
        </PageCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <PageCard className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-9 pl-8"
              />
            </div>
          </PageCard>

          {filtered.length === 0 ? (
            <PageCard className="px-5 py-8 text-sm text-muted-foreground">
              {conversations.length === 0 ? t("empty") : t("emptyFiltered")}
            </PageCard>
          ) : (
            <PageCard className="overflow-hidden">
              <ul>
                {filtered.map((conversation) => (
                  <li
                    key={conversation.id}
                    className={`border-b border-border/70 last:border-0 ${
                      selectedId === conversation.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <Link
                      href={`/inbox/${conversation.id}`}
                      className="block px-4 py-3 hover:bg-muted/30"
                    >
                      <p className="font-medium">{conversation.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {conversation.projectName}
                      </p>
                      {conversation.lastMessagePreview ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {conversation.lastMessagePreview}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </PageCard>
          )}
        </div>

        <PageCard className="flex min-h-[20rem] flex-col p-4">
          {selectedConversation ? (
            <>
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-semibold">
                  {selectedConversation.subject}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.projectName}
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                {selectedMessages.map((message) => (
                  <div key={message.id} className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-xs font-medium">{message.authorName}</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {message.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {message.createdAt.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                ))}
              </div>
              <form
                className="mt-auto space-y-2 border-t border-border pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedConversation) return;
                  setError(null);
                  startTransition(() => {
                    void (async () => {
                      try {
                        const response = await fetch("/api/inbox", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "message",
                            conversationId: selectedConversation.id,
                            body: reply,
                          }),
                          signal: AbortSignal.timeout(20_000),
                        });
                        const result = (await response.json()) as {
                          error?: string;
                        };
                        if (!response.ok || result.error) {
                          setError(result.error || tCommon("error"));
                          return;
                        }
                        setReply("");
                        router.refresh();
                      } catch {
                        setError(tCommon("error"));
                      }
                    })();
                  });
                }}
              >
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder={t("replyPlaceholder")}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                />
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button type="submit" disabled={pending || !reply.trim()}>
                  {pending ? tCommon("loading") : t("send")}
                </Button>
              </form>
            </>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">{t("selectHint")}</p>
          )}
        </PageCard>
      </div>
    </div>
  );
}
