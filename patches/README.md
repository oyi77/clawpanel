# ClawPanel Feature Patches

Modular patches to add Usage, Skills, and Workflow features to ClawPanel.
These patches are designed to be applied ON TOP of the upstream qingchencloud/clawpanel base.

## Quick Start (Sync from upstream + apply patches)

```bash
# 1. Add upstream remote (only once)
git remote add qingchen https://github.com/qingchencloud/clawpanel.git

# 2. Sync from upstream
./patches/sync-upstream.sh
```

## Manual Application

If you already have a fresh qingchencloud/clawpanel checkout:

```bash
git apply patches/0001-i18n-usage-skills.patch
git apply patches/0002-tauri-api.patch
git apply patches/0003-usage-page.patch
git apply patches/0004-skills-page.patch
git apply patches/0005-workflow-full.patch
git apply patches/0006-workflow-css.patch
```

## Patch Order (MUST be applied in this order)

| # | Patch | What it does |
|---|-------|--------------|
| 1 | `0001-i18n-usage-skills.patch` | Translation keys for Usage & Skills UI |
| 2 | `0002-tauri-api.patch` | Frontend API bindings |
| 3 | `0003-usage-page.patch` | Full Usage page implementation |
| 4 | `0004-skills-page.patch` | Full Skills page implementation |
| 5 | `0005-workflow-full.patch` | Full Workflow page + backend APIs |
| 6 | `0006-workflow-css.patch` | CSS additions for modals & workflow |

## Features Added

### Usage Page (`/usage`)
- Token consumption & cost analysis
- Top models/providers/tools/agents/channels rankings
- Token breakdown with visual bar
- Daily usage chart
- Session details list
- 1d/7d/30d time range selector

### Skills Page (`/skills`)
- Installed tab: skill groups (available, missing deps, disabled, blocked)
- Store tab: SkillHub/ClawHub search & install
- Install/uninstall functionality
- Dependency auto-installation
- Skill detail modal

### Workflow Center (`/workflow`)
- AI settings management
- Template CRUD: create, edit, delete
- Run controls: start, stop, pause, resume
- Run filtering by status
- Run detail modal with logs
- Backend API stubs for workflow management

## Upstream Sync Workflow

```bash
# Option A: Using the sync script (recommended)
./patches/sync-upstream.sh

# Option B: Manual
git fetch qingchen
git checkout main
git merge qingchen/main
git apply patches/*.patch
git push origin main
```

## If Conflicts Occur

Patches modify specific files. If upstream changes the same files:

1. **i18n.js** — conflict unlikely, just new keys added at the end
2. **tauri-api.js** — new API methods added, look for duplicates
3. **usage.js/skills.js/workflow.js** — complete rewrites, may conflict
4. **dev-api.js** — new methods added, look for duplicates
5. **CSS files** — appended styles at end, may conflict

For CSS conflicts: keep BOTH sets of styles (they don't overlap).
For JS conflicts: the patch version is the feature version, upstream changes may need manual merge.

## Regenerating Patches

If you modify these features and need to regenerate:

```bash
# After making changes
git diff 6443495..HEAD -- src/lib/i18n.js > patches/0001-i18n-usage-skills.patch
git diff 6443495..HEAD -- src/lib/tauri-api.js > patches/0002-tauri-api.patch
git diff 6443495..HEAD -- src/pages/usage.js > patches/0003-usage-page.patch
git diff 6443495..HEAD -- src/pages/skills.js > patches/0004-skills-page.patch
git diff 6443495..HEAD -- src/pages/workflow.js scripts/dev-api.js > patches/0005-workflow-full.patch
git diff 6443495..HEAD -- src/style/components.css src/style/pages.css > patches/0006-workflow-css.patch
```

The base commit `6443495` is the merge point with qingchencloud/clawpanel v0.9.5.
