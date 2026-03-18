#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== ClawPanel Sync ==="
git fetch qingchen
git stash push -m "auto-stash before sync" || true
git merge qingchen/main --no-edit || {
    echo "Merge conflict! Resolving..."
    git checkout --theirs package-lock.json 2>/dev/null || true
    git add package-lock.json
    git commit -m "Resolve package-lock conflict" || true
}
git stash pop || {
    echo "Conflicts remain:"
    git diff --name-only --diff-filter=U
    exit 1
}
echo "=== Sync Complete ==="
