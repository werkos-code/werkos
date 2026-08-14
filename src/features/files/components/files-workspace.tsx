"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageCard } from "@/features/shell/components/page-card";
import type {
  DocumentProjectOption,
  FileFolderRow,
  ProjectFileRow,
} from "@/features/files/lib/files";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type FilesWorkspaceProps = {
  /** When set, skip project picker and open this project. */
  projectId?: string;
  projectName?: string;
  projects?: DocumentProjectOption[];
  /** Compact embed for project detail tab */
  embedded?: boolean;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesWorkspace({
  projectId: initialProjectId,
  projectName: initialProjectName,
  projects = [],
  embedded = false,
}: FilesWorkspaceProps) {
  const t = useTranslations("files");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId ?? null,
  );
  const [projectName, setProjectName] = useState(initialProjectName ?? "");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FileFolderRow[]>([]);
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<FileFolderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  function load(nextProjectId: string, nextFolderId: string | null) {
    startTransition(() => {
      void (async () => {
        setError(null);
        const params = new URLSearchParams({ projectId: nextProjectId });
        if (nextFolderId) params.set("folderId", nextFolderId);
        const res = await fetch(`/api/files?${params.toString()}`, {
          signal: AbortSignal.timeout(20_000),
        });
        const data = (await res.json()) as {
          error?: string;
          project?: DocumentProjectOption;
          folders?: FileFolderRow[];
          files?: ProjectFileRow[];
          breadcrumbs?: FileFolderRow[];
        };
        if (!res.ok || data.error) {
          setError(data.error || tCommon("error"));
          return;
        }
        setProjectId(nextProjectId);
        setProjectName(data.project?.name ?? initialProjectName ?? "");
        setFolderId(nextFolderId);
        setFolders(data.folders ?? []);
        setFiles(data.files ?? []);
        setBreadcrumbs(data.breadcrumbs ?? []);
      })();
    });
  }

  useEffect(() => {
    if (initialProjectId) {
      load(initialProjectId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial open only
  }, [initialProjectId]);

  function openProject(project: DocumentProjectOption) {
    setShowNewFolder(false);
    load(project.id, null);
  }

  function createFolder() {
    if (!projectId || !newFolderName.trim()) return;
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_folder",
            projectId,
            parentId: folderId,
            name: newFolderName.trim(),
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok || data.error) {
          setError(
            data.error === "folder_not_empty"
              ? t("errors.folderNotEmpty")
              : data.error || tCommon("error"),
          );
          return;
        }
        setNewFolderName("");
        setShowNewFolder(false);
        load(projectId, folderId);
        router.refresh();
      })();
    });
  }

  function uploadFiles(list: FileList | null) {
    if (!projectId || !list?.length) return;
    startTransition(() => {
      void (async () => {
        for (const file of Array.from(list)) {
          const form = new FormData();
          form.set("projectId", projectId);
          if (folderId) form.set("folderId", folderId);
          form.set("file", file);
          const res = await fetch("/api/files", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60_000),
          });
          const data = (await res.json()) as { error?: string };
          if (!res.ok || data.error) {
            setError(
              data.error === "file_too_large"
                ? t("errors.tooLarge")
                : data.error || tCommon("error"),
            );
            return;
          }
        }
        load(projectId, folderId);
        router.refresh();
      })();
    });
  }

  function removeItem(type: "file" | "folder", id: string) {
    if (!projectId) return;
    const confirmMsg =
      type === "folder" ? t("deleteFolderConfirm") : t("deleteFileConfirm");
    if (!window.confirm(confirmMsg)) return;
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/files", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id }),
          signal: AbortSignal.timeout(20_000),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok || data.error) {
          setError(
            data.error === "folder_not_empty"
              ? t("errors.folderNotEmpty")
              : data.error || tCommon("error"),
          );
          return;
        }
        load(projectId, folderId);
        router.refresh();
      })();
    });
  }

  function downloadFile(id: string) {
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/files/${id}/download`, {
          signal: AbortSignal.timeout(20_000),
        });
        const data = (await res.json()) as {
          error?: string;
          url?: string;
          name?: string;
        };
        if (!res.ok || !data.url) {
          setError(data.error || tCommon("error"));
          return;
        }
        window.open(data.url, "_blank", "noopener,noreferrer");
      })();
    });
  }

  if (!projectId && !initialProjectId) {
    return (
      <div className={cn("space-y-4", !embedded && "pb-8")}>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <PageCard className="overflow-hidden p-0">
          {projects.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              {t("emptyProjects")}
            </p>
          ) : (
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => openProject(project)}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-5 py-3.5 text-left last:border-0 hover:bg-muted/50"
                  >
                    <Folder className="size-4 text-amber-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {project.projectNumber}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageCard>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", !embedded && "pb-8")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {!initialProjectId ? (
            <>
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  setProjectId(null);
                  setFolderId(null);
                  setFolders([]);
                  setFiles([]);
                  setBreadcrumbs([]);
                }}
              >
                {t("allProjects")}
              </button>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </>
          ) : null}
          <button
            type="button"
            className={cn(
              "truncate font-medium",
              breadcrumbs.length
                ? "text-primary hover:underline"
                : "text-foreground",
            )}
            onClick={() => projectId && load(projectId, null)}
          >
            {projectName || t("project")}
          </button>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <button
                type="button"
                className={cn(
                  "truncate",
                  index === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-primary hover:underline",
                )}
                onClick={() => projectId && load(projectId, crumb.id)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setShowNewFolder((v) => !v)}
          >
            <FolderPlus className="size-3.5" />
            {t("newFolder")}
          </Button>
          <Button type="button" size="sm" disabled={isPending} asChild>
            <label className="cursor-pointer">
              <Upload className="size-3.5" />
              {t("upload")}
              <input
                type="file"
                multiple
                className="sr-only"
                disabled={isPending}
                onChange={(event) => {
                  uploadFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      </div>

      {showNewFolder ? (
        <PageCard className="flex flex-wrap items-end gap-2 p-3">
          <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
            <span className="text-muted-foreground">{t("folderName")}</span>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              placeholder={t("folderNamePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createFolder();
                }
              }}
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={isPending || !newFolderName.trim()}
            onClick={createFolder}
          >
            <Plus className="size-3.5" />
            {tCommon("save")}
          </Button>
        </PageCard>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <PageCard className="overflow-hidden p-0">
        {folders.length === 0 && files.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul>
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="flex items-center gap-2 border-b border-border/40 px-5 py-3 last:border-0 hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => projectId && load(projectId, folder.id)}
                >
                  <Folder className="size-4 shrink-0 text-amber-600" />
                  <span className="truncate font-medium">{folder.name}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={t("delete")}
                  onClick={() => removeItem("folder", folder.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 border-b border-border/40 px-5 py-3 last:border-0 hover:bg-muted/50"
              >
                <File className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.sizeBytes)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={t("download")}
                  onClick={() => downloadFile(file.id)}
                >
                  <Download className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={t("delete")}
                  onClick={() => removeItem("file", file.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PageCard>

      {!embedded && projectId ? (
        <p className="text-xs text-muted-foreground">
          <Link
            href={`/projecten/${projectId}`}
            className="text-primary hover:underline"
          >
            {t("openProject")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
