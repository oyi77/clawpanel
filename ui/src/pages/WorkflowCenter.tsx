import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCcw,
  Plus,
  Play,
  Square,
  Pause,
  RotateCcw,
  Trash2,
  Pencil,
  ScrollText,
  MoreHorizontal,
  Download,
  Eraser,
  GitBranch,
  Layers,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WorkflowStatus = "running" | "stopped" | "paused" | "error" | "idle";
type LogLevel = "info" | "warn" | "error" | "debug";

interface WorkflowLog {
  id: string;
  workflowId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  lastRunAt: string | null;
  template: string;
}

interface UpstreamHead {
  id: string;
  repo: string;
  branch: string;
  commit: string;
  synced: boolean;
}

interface PatchEntry {
  id: string;
  name: string;
  applied: boolean;
}

const INITIAL_WORKFLOWS: WorkflowItem[] = [
  {
    id: "wf-1",
    name: "Nightly Sync",
    description: "Pull upstream changes and rebase patches every night at 02:00 UTC",
    status: "running",
    createdAt: "2026-03-10T08:00:00Z",
    lastRunAt: "2026-03-20T02:00:00Z",
    template: "sync",
  },
  {
    id: "wf-2",
    name: "PR Validator",
    description: "Run type-check and lint on every incoming pull request",
    status: "paused",
    createdAt: "2026-03-12T14:30:00Z",
    lastRunAt: "2026-03-19T16:45:00Z",
    template: "ci",
  },
  {
    id: "wf-3",
    name: "Deploy Staging",
    description: "Build and deploy to staging environment on main branch push",
    status: "stopped",
    createdAt: "2026-03-15T09:15:00Z",
    lastRunAt: null,
    template: "deploy",
  },
];

const INITIAL_LOGS: WorkflowLog[] = [
  { id: "l-1", workflowId: "wf-1", timestamp: "2026-03-20T02:00:12Z", level: "info", message: "Sync started — fetching upstream heads" },
  { id: "l-2", workflowId: "wf-1", timestamp: "2026-03-20T02:00:14Z", level: "info", message: "Fetched 3 upstream refs successfully" },
  { id: "l-3", workflowId: "wf-1", timestamp: "2026-03-20T02:00:18Z", level: "debug", message: "Rebasing patch i18n-layer onto a2b8d0f7" },
  { id: "l-4", workflowId: "wf-1", timestamp: "2026-03-20T02:00:22Z", level: "info", message: "All patches applied cleanly" },
  { id: "l-5", workflowId: "wf-2", timestamp: "2026-03-19T16:45:01Z", level: "info", message: "PR #47 received — running checks" },
  { id: "l-6", workflowId: "wf-2", timestamp: "2026-03-19T16:45:30Z", level: "warn", message: "Lint warning: unused import in Dashboard.tsx" },
  { id: "l-7", workflowId: "wf-2", timestamp: "2026-03-19T16:46:02Z", level: "error", message: "Type check failed: missing property 'status' on WorkflowItem" },
];

const UPSTREAM_HEADS: UpstreamHead[] = [
  { id: "uh-1", repo: "qingchen116/ClawPanel", branch: "main", commit: "a2b8d0f7", synced: true },
  { id: "uh-2", repo: "zhaoxinyi02/ClawPanel", branch: "ui-tweaks", commit: "c4e1f99g", synced: false },
];

const INITIAL_PATCHES: PatchEntry[] = [
  { id: "p1", name: "i18n-layer", applied: true },
  { id: "p2", name: "workflow-center-ui", applied: true },
  { id: "p3", name: "ayi77-backend-config", applied: true },
];

function statusColor(status: WorkflowStatus) {
  switch (status) {
    case "running":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "paused":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "stopped":
      return "bg-muted text-muted-foreground border-border";
    case "error":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "idle":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }
}

function logLevelColor(level: LogLevel) {
  switch (level) {
    case "info":
      return "text-blue-500";
    case "warn":
      return "text-amber-500";
    case "error":
      return "text-red-500";
    case "debug":
      return "text-muted-foreground";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WorkflowActions({
  workflow,
  onStart,
  onStop,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onViewLogs,
}: {
  workflow: WorkflowItem;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewLogs: () => void;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {workflow.status === "stopped" || workflow.status === "idle" || workflow.status === "error" ? (
          <DropdownMenuItem onClick={onStart}>
            <Play className="h-3.5 w-3.5" />
            {t("workflow_start")}
          </DropdownMenuItem>
        ) : null}
        {workflow.status === "running" ? (
          <>
            <DropdownMenuItem onClick={onPause}>
              <Pause className="h-3.5 w-3.5" />
              {t("workflow_pause")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStop}>
              <Square className="h-3.5 w-3.5" />
              {t("workflow_stop")}
            </DropdownMenuItem>
          </>
        ) : null}
        {workflow.status === "paused" ? (
          <>
            <DropdownMenuItem onClick={onResume}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("workflow_resume")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStop}>
              <Square className="h-3.5 w-3.5" />
              {t("workflow_stop")}
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem onClick={onViewLogs}>
          <ScrollText className="h-3.5 w-3.5" />
          {t("workflow_viewLogs")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          {t("workflow_editTemplate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          {t("workflow_delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkflowList({
  workflows,
  onStart,
  onStop,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onViewLogs,
}: {
  workflows: WorkflowItem[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onEdit: (wf: WorkflowItem) => void;
  onDelete: (id: string) => void;
  onViewLogs: (id: string) => void;
}) {
  const { t } = useTranslation();

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Workflow className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">{t("workflow_noWorkflows")}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{t("workflow_firstWorkflow")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_120px_44px] gap-3 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>{t("workflow_name")}</span>
        <span>{t("workflow_status")}</span>
        <span>{t("workflow_created")}</span>
        <span>{t("workflow_lastRun")}</span>
        <span className="text-right">{t("workflow_actions")}</span>
      </div>
      {workflows.map((wf) => (
        <div
          key={wf.id}
          className="grid sm:grid-cols-[1fr_100px_120px_120px_44px] gap-2 sm:gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{wf.name}</p>
            <p className="text-xs text-muted-foreground truncate">{wf.description}</p>
          </div>
          <div>
            <span
              className={`inline-flex text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor(wf.status)}`}
            >
              {wf.status.toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(wf.createdAt)}</span>
          <span className="text-xs text-muted-foreground">
            {wf.lastRunAt ? formatDate(wf.lastRunAt) : "—"}
          </span>
          <div className="flex justify-end">
            <WorkflowActions
              workflow={wf}
              onStart={() => onStart(wf.id)}
              onStop={() => onStop(wf.id)}
              onPause={() => onPause(wf.id)}
              onResume={() => onResume(wf.id)}
              onEdit={() => onEdit(wf)}
              onDelete={() => onDelete(wf.id)}
              onViewLogs={() => onViewLogs(wf.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function NewWorkflowDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string, template: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("sync");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), template);
    setName("");
    setDescription("");
    setTemplate("sync");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("workflow_new")}</DialogTitle>
          <DialogDescription>{t("workflow_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wf-name">{t("workflow_name")}</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nightly Deploy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-desc">{t("workflow_description_label")}</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sync">Upstream Sync</SelectItem>
                <SelectItem value="ci">CI / Validation</SelectItem>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            {t("workflow_new")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditWorkflowDialog({
  workflow,
  open,
  onOpenChange,
  onSave,
}: {
  workflow: WorkflowItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, name: string, description: string, template: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [template, setTemplate] = useState(workflow?.template ?? "sync");

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen && workflow) {
        setName(workflow.name);
        setDescription(workflow.description);
        setTemplate(workflow.template);
      }
      onOpenChange(isOpen);
    },
    [workflow, onOpenChange],
  );

  const handleSave = () => {
    if (!workflow || !name.trim()) return;
    onSave(workflow.id, name.trim(), description.trim(), template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("workflow_editTemplate")}</DialogTitle>
          <DialogDescription>{workflow?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t("workflow_name")}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">{t("workflow_description_label")}</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sync">Upstream Sync</SelectItem>
                <SelectItem value="ci">CI / Validation</SelectItem>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowLogsPanel({
  logs,
  selectedWorkflowId,
  workflows,
  onSelectWorkflow,
  onClear,
  onDownload,
}: {
  logs: WorkflowLog[];
  selectedWorkflowId: string | null;
  workflows: WorkflowItem[];
  onSelectWorkflow: (id: string | null) => void;
  onClear: () => void;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  const filtered = selectedWorkflowId
    ? logs.filter((l) => l.workflowId === selectedWorkflowId)
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select
          value={selectedWorkflowId ?? "all"}
          onValueChange={(v) => onSelectWorkflow(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("workflow_runLog")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("workflow_runLog")}</SelectItem>
            {workflows.map((wf) => (
              <SelectItem key={wf.id} value={wf.id}>
                {wf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            <Eraser className="h-3.5 w-3.5" />
            {t("workflow_clearLogs")}
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
            {t("workflow_downloadLogs")}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ScrollText className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">{t("workflow_noLogs")}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[140px_60px_1fr] gap-3 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>{t("workflow_timestamp")}</span>
            <span>{t("workflow_level")}</span>
            <span>{t("workflow_message")}</span>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {filtered.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-[140px_60px_1fr] gap-3 px-4 py-2 text-xs font-mono hover:bg-accent/20 transition-colors"
              >
                <span className="text-muted-foreground">{formatDate(log.timestamp)}</span>
                <span className={`font-semibold uppercase ${logLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-foreground/90 break-words">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkflowCenter() {
  const { t } = useTranslation();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>(INITIAL_WORKFLOWS);
  const [logs, setLogs] = useState<WorkflowLog[]>(INITIAL_LOGS);
  const [syncing, setSyncing] = useState(false);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowItem | null>(null);
  const [logFilterId, setLogFilterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("workflows");

  const handleSync = useCallback(() => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1500);
  }, []);

  const handleCreate = useCallback(
    (name: string, description: string, template: string) => {
      const newWf: WorkflowItem = {
        id: `wf-${Date.now()}`,
        name,
        description,
        status: "idle",
        createdAt: new Date().toISOString(),
        lastRunAt: null,
        template,
      };
      setWorkflows((prev) => [newWf, ...prev]);
      const newLog: WorkflowLog = {
        id: `l-${Date.now()}`,
        workflowId: newWf.id,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Workflow "${name}" created`,
      };
      setLogs((prev) => [newLog, ...prev]);
    },
    [],
  );

  const handleEdit = useCallback(
    (id: string, name: string, description: string, template: string) => {
      setWorkflows((prev) =>
        prev.map((wf) => (wf.id === id ? { ...wf, name, description, template } : wf)),
      );
    },
    [],
  );

  const setStatus = useCallback((id: string, status: WorkflowStatus) => {
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === id
          ? { ...wf, status, lastRunAt: status === "running" ? new Date().toISOString() : wf.lastRunAt }
          : wf,
      ),
    );
    setLogs((prev) => [
      {
        id: `l-${Date.now()}`,
        workflowId: id,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Workflow status changed to ${status}`,
      },
      ...prev,
    ]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
    setLogs((prev) => prev.filter((l) => l.workflowId !== id));
  }, []);

  const handleClearLogs = useCallback(() => {
    if (logFilterId) {
      setLogs((prev) => prev.filter((l) => l.workflowId !== logFilterId));
    } else {
      setLogs([]);
    }
  }, [logFilterId]);

  const handleDownloadLogs = useCallback(() => {
    const filtered = logFilterId ? logs.filter((l) => l.workflowId === logFilterId) : logs;
    const text = filtered
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow-logs.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, logFilterId]);

  const openEditDialog = useCallback((wf: WorkflowItem) => {
    setEditingWorkflow(wf);
    setEditDialogOpen(true);
  }, []);

  const openLogsForWorkflow = useCallback((id: string) => {
    setLogFilterId(id);
    setActiveTab("logs");
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("Workflow Center")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("workflow_description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {t("nav_sync")}
          </Button>
          <Button onClick={() => setNewDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("workflow_new")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">
            <Workflow className="h-3.5 w-3.5" />
            {t("Workflow Center")}
          </TabsTrigger>
          <TabsTrigger value="upstream">
            <GitBranch className="h-3.5 w-3.5" />
            {t("workflow_upstreamHeads")}
          </TabsTrigger>
          <TabsTrigger value="patches">
            <Layers className="h-3.5 w-3.5" />
            {t("workflow_modularPatches")}
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText className="h-3.5 w-3.5" />
            {t("workflow_logs")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-4">
          <WorkflowList
            workflows={workflows}
            onStart={(id) => setStatus(id, "running")}
            onStop={(id) => setStatus(id, "stopped")}
            onPause={(id) => setStatus(id, "paused")}
            onResume={(id) => setStatus(id, "running")}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onViewLogs={openLogsForWorkflow}
          />
        </TabsContent>

        <TabsContent value="upstream" className="mt-4">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">{t("workflow_upstreamHeads")}</h2>
            <div className="space-y-4">
              {UPSTREAM_HEADS.map((head) => (
                <div
                  key={head.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border"
                >
                  <div>
                    <p className="text-sm font-medium">{head.repo}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {head.branch} | {head.commit}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] rounded-full ${
                      head.synced
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}
                  >
                    {head.synced ? t("workflow_synced") : t("workflow_patched")}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="patches" className="mt-4">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">{t("workflow_modularPatches")}</h2>
            <div className="space-y-3">
              {INITIAL_PATCHES.map((patch) => (
                <div key={patch.id} className="flex items-center gap-3 text-sm">
                  <div
                    className={`h-2 w-2 rounded-full ${patch.applied ? "bg-green-500" : "bg-muted-foreground"}`}
                  />
                  <span className="font-mono text-muted-foreground w-12">{patch.id}</span>
                  <span className="flex-1">{patch.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {patch.applied ? t("workflow_applied") : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">{t("workflow_logs")}</h2>
            <WorkflowLogsPanel
              logs={logs}
              selectedWorkflowId={logFilterId}
              workflows={workflows}
              onSelectWorkflow={setLogFilterId}
              onClear={handleClearLogs}
              onDownload={handleDownloadLogs}
            />
          </section>
        </TabsContent>
      </Tabs>

      <NewWorkflowDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onCreate={handleCreate}
      />
      <EditWorkflowDialog
        workflow={editingWorkflow}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEdit}
      />
    </div>
  );
}
