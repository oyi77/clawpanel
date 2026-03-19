#!/bin/bash
# Sync ClawPanel from upstream qingchencloud + apply feature patches
# Usage: ./patches/sync-upstream.sh

set -e

echo "=== ClawPanel Upstream Sync ==="
echo ""

# Check if qingchen remote exists
if ! git remote get-url qingchen 2>/dev/null; then
    echo "Adding qingchencloud/clawpanel as upstream remote..."
    git remote add qingchen https://github.com/qingchencloud/clawpanel.git
fi

# Fetch latest from upstream
echo "[1/4] Fetching upstream (qingchencloud/clawpanel)..."
git fetch qingchen

# Checkout/switch to main
echo "[2/4] Checking out main and pulling latest..."
git checkout main 2>/dev/null || git checkout -b main
git reset --hard qingchen/main

# Apply patches in order
echo "[3/4] Applying feature patches..."
for patch in patches/0*.patch; do
    if [ -f "$patch" ]; then
        echo "  Applying: $patch"
        git apply "$patch" || {
            echo "  WARNING: Patch $patch failed, trying with --3way..."
            git apply --3way "$patch" || echo "  WARNING: $patch could not be applied cleanly"
        }
    fi
done

# Build to verify
echo "[4/4] Running build to verify..."
npm run build >/dev/null 2>&1 && echo "  Build: OK" || echo "  Build: FAILED (check manually)"

echo ""
echo "=== Sync Complete ==="
echo "Review changes: git diff --stat"
echo "To push: git push origin main"
