# ClawPanel Feature Patches

Modular patches to add Usage, Skills, and Workflow features to ClawPanel.
These patches are designed to be applied ON TOP of the upstream qingchencloud/clawpanel base.

## Quick Start

### Single Patch (Recommended)
```bash
git clone https://github.com/qingchencloud/clawpanel.git
cd clawpanel
git checkout v0.9.5
git apply /path/to/ALL-changes.patch
npm run build
```

### Multiple Patches (For debugging)
```bash
git apply patches/0001-i18n-usage-skills-sync.patch
git apply patches/0002-tauri-api.patch
git apply patches/0003-usage-page.patch
git apply patches/0004-skills-page.patch
git apply patches/0005-workflow-full.patch
git apply patches/0006-css.patch
```
Note: 0003-settings-sync.patch is empty, use ALL-changes.patch instead.

## Features Added

### Usage Page - Token/cost tracking, top rankings, daily chart, session details
### Skills Page - Installed/Store tabs, install/uninstall, SkillHub/ClawHub
### Workflow Center - Template CRUD, run controls (start/stop/pause/resume), logs
### Settings - "Sync from Upstream" button with live progress

All features include i18n translations (en, id, zh, ru).

## Updating from Upstream

```bash
git fetch qingchen && git merge qingchen/main
git apply patches/ALL-changes.patch
npm run build && git push
```

## Regenerate Unified Patch

```bash
git diff 6443495 -- . ':(exclude)patches' ':(exclude).gitignore' > patches/ALL-changes.patch
```
