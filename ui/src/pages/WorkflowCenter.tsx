import { useTranslation } from "react-i18next";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkflowCenter() {
  const { t } = useTranslation();

  const handleSync = () => {
    console.log("Triggering upstream sync...");
    // Future implementation: call /api/companies/:id/sync or similar
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("Workflow Center")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage modular patches and upstream repository synchronization.
          </p>
        </div>
        <Button onClick={handleSync} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          {t("Sync")}
        </Button>
      </div>

      <div className="grid gap-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Upstream Heads</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
              <div>
                <p className="text-sm font-medium">qingchen116/ClawPanel</p>
                <p className="text-xs text-muted-foreground font-mono">main | a2b8d0f7</p>
              </div>
              <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20 font-medium">
                SYNCED
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
              <div>
                <p className="text-sm font-medium">zhaoxinyi02/ClawPanel</p>
                <p className="text-xs text-muted-foreground font-mono">ui-tweaks | c4e1f99g</p>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
                PATCHED
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Modular Patches (LIFO)</h2>
          <div className="space-y-3">
            {[
              { id: 'p1', name: 'i18n-layer', status: 'Applied' },
              { id: 'p2', name: 'workflow-center-ui', status: 'Applied' },
              { id: 'p3', name: 'ayi77-backend-config', status: 'Applied' },
            ].map(patch => (
              <div key={patch.id} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-mono text-muted-foreground w-12">{patch.id}</span>
                <span className="flex-1">{patch.name}</span>
                <span className="text-xs text-muted-foreground">{patch.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
