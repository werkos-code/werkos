"use client";

import {
  Camera,
  ClipboardList,
  Ellipsis,
  ExternalLink,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Pencil,
  Plus,
  Send,
  Share2,
  Star,
  StickyNote,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CustomerRow } from "@/features/customers/customers-actions";
import { FilesWorkspace } from "@/features/files/components/files-workspace";
import { ProjectDetailForm } from "@/features/projects/components/project-detail-form";
import {
  ProjectDetailOverview,
  type ProjectDetailMode,
} from "@/features/projects/components/project-detail-overview";
import { ProjectWorkItemsWorkspace } from "@/features/projects/components/project-work-items-workspace";
import type {
  ProjectActivityRow,
  ProjectRow,
  StaffOption,
} from "@/features/projects/projects-actions";
import {
  workItemStats,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import { ProjectFinancialPanel } from "@/features/invoices/components/project-financial-panel";
import type { InvoiceListItem } from "@/features/invoices/invoices-actions";
import { QuotesList } from "@/features/quotes/components/quotes-list";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";
import type { WorkOrderRow } from "@/features/work-orders/lib/work-order";
import { PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";
import { formatEuroFromCents } from "@/utils/format";
import type { ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

export type { ProjectDetailMode };

type ProjectDetailWorkspaceProps = {
  project: ProjectRow;
  customer: CustomerRow | null;
  customers: Array<{ id: string; name: string }>;
  staff: StaffOption[];
  quotes: QuoteListItem[];
  workItems: WorkItemRow[];
  workOrders: WorkOrderRow[];
  activities: ProjectActivityRow[];
  minutesByWorkItem?: Record<string, number>;
  articles?: import("@/features/materials/lib/materials").ArticleRow[];
  invoices?: InvoiceListItem[];
  initialTab?: string;
};

function parseMode(tab: string | undefined): ProjectDetailMode {
  if (tab === "tasks" || tab === "workOrders" || tab === "work") return "work";
  if (tab === "financial" || tab === "money") return "money";
  if (tab === "quotes" || tab === "files" || tab === "overview") return tab;
  return "overview";
}

function statusBadgeVariant(
  status: ProjectStatus,
): "default" | "secondary" | "success" | "outline" {
  if (status === "execution" || status === "completed") return "success";
  if (status === "preparation") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}

export function ProjectDetailWorkspace({
  project,
  customer,
  customers,
  staff,
  quotes,
  workItems,
  workOrders,
  activities,
  minutesByWorkItem = {},
  articles = [],
  invoices = [],
  initialTab = "overview",
}: ProjectDetailWorkspaceProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const tQuotes = useTranslations("quotes");
  const tWorkOrders = useTranslations("workOrders");
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ProjectDetailMode>(parseMode(initialTab));
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [addingLabel, setAddingLabel] = useState(false);
  const [favorited, setFavorited] = useState(project.isFavorite);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isNotePending, startNoteTransition] = useTransition();
  const [isLabelPending, startLabelTransition] = useTransition();
  const [isFavoritePending, startFavoriteTransition] = useTransition();
  const [isCoverPending, startCoverTransition] = useTransition();
  const [isQuotePending, startQuoteTransition] = useTransition();

  useEffect(() => {
    setFavorited(project.isFavorite);
  }, [project.isFavorite]);

  const taskStats = useMemo(
    () => workItemStats(workItems, minutesByWorkItem),
    [workItems, minutesByWorkItem],
  );
  const hasWorkItems = taskStats.total > 0;
  const progressPercent = taskStats.progressPercent;
  const invoicedCents = invoices.reduce(
    (sum, invoice) => sum + invoice.totalCents,
    0,
  );

  const modeItems: Array<{
    id: ProjectDetailMode;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "overview", label: t("detail.modes.overview"), icon: LayoutDashboard },
    { id: "work", label: t("detail.modes.work"), icon: ClipboardList },
    { id: "quotes", label: t("detail.modes.quotes"), icon: FileText },
    { id: "files", label: t("detail.modes.files"), icon: FolderOpen },
    { id: "money", label: t("detail.modes.money"), icon: Wallet },
  ];

  function toggleFavorite() {
    startFavoriteTransition(() => {
      void (async () => {
        const next = !favorited;
        setFavorited(next);
        try {
          const response = await fetch(
            `/api/projects/${project.id}/favorite`,
            {
              method: next ? "POST" : "DELETE",
              signal: AbortSignal.timeout(20_000),
            },
          );
          if (!response.ok) {
            setFavorited(!next);
          } else {
            router.refresh();
          }
        } catch {
          setFavorited(!next);
        }
      })();
    });
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage(t("detail.shareCopied"));
      window.setTimeout(() => setShareMessage(null), 2000);
    } catch {
      setShareMessage(tCommon("error"));
    }
  }

  function uploadCover(file: File | undefined) {
    if (!file) return;
    setCoverError(null);
    startCoverTransition(() => {
      void (async () => {
        try {
          const form = new FormData();
          form.append("file", file);
          const response = await fetch(`/api/projects/${project.id}/cover`, {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(30_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setCoverError(
              result.error === "invalid_type"
                ? t("detail.coverInvalidType")
                : result.error === "file_too_large"
                  ? t("detail.coverTooLarge")
                  : result.error || tCommon("error"),
            );
            return;
          }
          router.refresh();
        } catch {
          setCoverError(tCommon("error"));
        }
      })();
    });
  }

  function removeCover() {
    startCoverTransition(() => {
      void (async () => {
        try {
          await fetch(`/api/projects/${project.id}/cover`, {
            method: "DELETE",
            signal: AbortSignal.timeout(20_000),
          });
          router.refresh();
        } catch {
          setCoverError(tCommon("error"));
        }
      })();
    });
  }

  function submitNote() {
    const body = note.trim();
    if (!body) {
      setNoteError(t("detail.noteRequired"));
      return;
    }
    setNoteError(null);
    startNoteTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/projects/${project.id}/activities`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body }),
              signal: AbortSignal.timeout(20_000),
            },
          );
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setNoteError(result.error || tCommon("error"));
            return;
          }
          setNote("");
          setMode("overview");
          router.refresh();
        } catch {
          setNoteError(tCommon("error"));
        }
      })();
    });
  }

  function addLabel() {
    const name = labelDraft.trim();
    if (!name) {
      setLabelError(t("detail.labelRequired"));
      return;
    }
    setLabelError(null);
    startLabelTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/projects/${project.id}/labels`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setLabelError(
              result.error === "duplicate_label"
                ? t("detail.labelDuplicate")
                : result.error || tCommon("error"),
            );
            return;
          }
          setLabelDraft("");
          setAddingLabel(false);
          router.refresh();
        } catch {
          setLabelError(tCommon("error"));
        }
      })();
    });
  }

  function removeLabel(labelId: string) {
    startLabelTransition(() => {
      void (async () => {
        try {
          await fetch(`/api/projects/${project.id}/labels/${labelId}`, {
            method: "DELETE",
            signal: AbortSignal.timeout(20_000),
          });
          router.refresh();
        } catch {
          /* ignore */
        }
      })();
    });
  }

  function createQuote() {
    setActionError(null);
    startQuoteTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              title: tQuotes("defaultTitle"),
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as {
            error?: string;
            quoteId?: string;
          };
          if (!response.ok || !result.quoteId) {
            setActionError(result.error || tCommon("error"));
            return;
          }
          router.push(`/projecten/${project.id}/offertes/${result.quoteId}`);
        } catch {
          setActionError(tCommon("error"));
        }
      })();
    });
  }

  function runPrimaryAction() {
    if (project.status === "execution") {
      setMode("work");
      return;
    }
    if (
      project.status === "completed" ||
      project.status === "operationally_completed" ||
      project.status === "administratively_completed"
    ) {
      setMode("money");
      return;
    }
    createQuote();
  }

  const primaryLabel =
    project.status === "execution"
      ? t("detail.ctaOpenWork")
      : project.status === "completed" ||
          project.status === "operationally_completed" ||
          project.status === "administratively_completed"
        ? t("detail.ctaOpenMoney")
        : tQuotes("newQuote");
  const showPrimaryCta = project.status !== "archived";
  const primaryIsQuote =
    project.status !== "execution" &&
    project.status !== "completed" &&
    project.status !== "operationally_completed" &&
    project.status !== "administratively_completed";

  return (
    <div className="space-y-5 pb-24">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          uploadCover(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="relative overflow-hidden rounded-xl bg-[#09133A]">
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-0",
            project.coverUrl
              ? "bg-gradient-to-t from-black/80 via-black/45 to-black/25"
              : "bg-[#09133A]",
          )}
        />

        <div className="relative flex min-h-[16rem] flex-col justify-end gap-4 p-5 sm:min-h-[18rem] sm:p-6">
          <div className="absolute top-4 right-4 flex items-center gap-2 sm:top-5 sm:right-5">
            {showPrimaryCta ? (
              <Button
                type="button"
                size="sm"
                disabled={primaryIsQuote && isQuotePending}
                onClick={runPrimaryAction}
              >
                {primaryIsQuote ? <Plus className="size-3.5" /> : null}
                {primaryIsQuote && isQuotePending
                  ? tCommon("loading")
                  : primaryLabel}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  aria-label={t("detail.moreActions")}
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => void copyShareLink()}>
                  <Share2 className="size-3.5" />
                  {t("detail.share")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  {t("detail.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isFavoritePending}
                  onClick={toggleFavorite}
                >
                  <Star
                    className={cn(
                      "size-3.5",
                      favorited && "fill-current text-amber-500",
                    )}
                  />
                  {favorited
                    ? t("detail.unfavorite")
                    : t("detail.favorite")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isCoverPending}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Camera className="size-3.5" />
                  {t("detail.changeCover")}
                </DropdownMenuItem>
                {project.coverUrl ? (
                  <DropdownMenuItem
                    disabled={isCoverPending}
                    onClick={removeCover}
                  >
                    {t("detail.removeCover")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => {
                    setAddingLabel(true);
                    setMode("overview");
                  }}
                >
                  <Plus className="size-3.5" />
                  {t("detail.addLabel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="max-w-3xl space-y-3 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {project.name}
              </h2>
              <Badge
                variant={statusBadgeVariant(project.status)}
                className="border-0"
              >
                {t(`status.${project.status}`)}
              </Badge>
            </div>
            <p className="text-sm text-white/75">
              {project.projectNumber}
              {" · "}
              {project.customerName}
            </p>
            <div className="space-y-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: hasWorkItems ? `${progressPercent ?? 0}%` : "0%",
                  }}
                />
              </div>
              <p className="text-xs text-white/80">
                {hasWorkItems
                  ? t("detail.progressPercent", {
                      percent: progressPercent ?? 0,
                    })
                  : t("detail.progressEmptyShort")}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="size-3.5 opacity-80" />
                {hasWorkItems
                  ? t("detail.heroWork", {
                      done: taskStats.done,
                      total: taskStats.total,
                    })
                  : t("detail.heroWorkEmpty")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-3.5 opacity-80" />
                {t("detail.heroQuotes", { count: quotes.length })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="size-3.5 opacity-80" />
                {invoices.length > 0
                  ? t("detail.heroInvoiced", {
                      amount: formatEuroFromCents(invoicedCents),
                    })
                  : t("detail.heroInvoicedEmpty")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {shareMessage || coverError || actionError || labelError ? (
        <p className="text-sm text-destructive">
          {coverError || actionError || labelError || (
            <span className="text-muted-foreground">{shareMessage}</span>
          )}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {modeItems.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors",
                  active
                    ? "border-transparent bg-primary/10 font-medium text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
        <Link
          href="/planning"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          {t("detail.openInPlanning")}
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {(project.labels.length > 0 || addingLabel) && mode === "overview" ? (
        <div className="flex flex-wrap items-center gap-2">
          {project.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {label.name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-primary/15"
                disabled={isLabelPending}
                onClick={() => removeLabel(label.id)}
                aria-label={t("detail.removeLabel")}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {addingLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={labelDraft}
                onChange={(event) => setLabelDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLabel();
                  }
                }}
                disabled={isLabelPending}
                placeholder={t("detail.labelPlaceholder")}
                className="border-input bg-background h-8 w-40 rounded-lg border px-2.5 text-sm outline-none"
              />
              <Button
                type="button"
                size="sm"
                disabled={isLabelPending}
                onClick={addLabel}
              >
                {isLabelPending ? tCommon("loading") : t("detail.saveLabel")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isLabelPending}
                onClick={() => {
                  setAddingLabel(false);
                  setLabelDraft("");
                  setLabelError(null);
                }}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "overview" ? (
        <ProjectDetailOverview
          project={project}
          customer={customer}
          quotes={quotes}
          workItems={workItems}
          activities={activities}
          invoices={invoices}
          taskStats={taskStats}
          onOpenMode={setMode}
        />
      ) : null}

      {mode === "quotes" ? (
        <QuotesList quotes={quotes} projectId={project.id} />
      ) : null}

      {mode === "work" ? (
        <div className="space-y-5">
          {workOrders.length > 0 ? (
            <PageCard className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-medium">
                  {t("detail.tabs.workOrders")}
                </h3>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/werkbonnen">
                    {t("detail.viewAllWorkOrders")}
                  </Link>
                </Button>
              </div>
              <ul className="divide-y divide-border/80">
                {workOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">
                        {order.workOrderNumber}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.title}
                      </p>
                    </div>
                    <Badge
                      variant={
                        order.status === "done"
                          ? "success"
                          : order.status === "in_progress"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {tWorkOrders(`status.${order.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </PageCard>
          ) : null}
          <ProjectWorkItemsWorkspace
            projectId={project.id}
            workItems={workItems}
            staff={staff}
            activities={activities}
            minutesByWorkItem={minutesByWorkItem}
            articles={articles}
          />
        </div>
      ) : null}

      {mode === "files" ? (
        <FilesWorkspace
          projectId={project.id}
          projectName={project.name}
          embedded
        />
      ) : null}

      {mode === "money" ? (
        <ProjectFinancialPanel
          projectId={project.id}
          projectName={project.name}
          invoices={invoices}
        />
      ) : null}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("detail.edit")}</DialogTitle>
          </DialogHeader>
          <ProjectDetailForm
            project={project}
            customers={customers}
            staff={staff}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur-sm md:left-[var(--sidebar-width)]">
        <div className="mx-auto flex w-[90%] max-w-5xl items-center gap-2">
          <StickyNote className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitNote();
              }
            }}
            disabled={isNotePending}
            placeholder={t("detail.notePlaceholder")}
            className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <Button
            type="button"
            size="icon"
            disabled={isNotePending || !note.trim()}
            onClick={submitNote}
            aria-label={t("detail.postNote")}
          >
            <Send className="size-4" />
          </Button>
        </div>
        {noteError ? (
          <p className="mx-auto mt-2 w-[90%] max-w-5xl text-sm text-destructive">
            {noteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
