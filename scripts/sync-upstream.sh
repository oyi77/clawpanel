#!/bin/bash
set -e
cd "$(dirname "$0")/.."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/api-keys.env"

API_URL="https://gpt.qt.cool/v1/chat/completions"
MODEL="gpt-5.1-codex-mini"

API_KEYS=(
    "$QTCOOL_API_KEY"
    "$KIMI_API_KEY"
    "$XAI_API_KEY"
    "$NVIDIA_API_KEY"
)

rotate_key() {
    local key="$1"
    shift
    echo "$@"
}

echo "=== ClawPanel Auto-Sync with AI ==="
git fetch qingchen

git stash push -m "auto-stash" || true
git merge qingchen/main --no-edit || {
    echo "Conflict! AI resolving..."
    git checkout --theirs package-lock.json 2>/dev/null || true
    git add package-lock.json
    
    CONFLICTS=$(git diff --name-only --diff-filter=U)
    if [ -n "$CONFLICTS" ]; then
        KEY_INDEX=0
        for FILE in $CONFLICTS; do
            API_KEY="${API_KEYS[$KEY_INDEX]}"
            echo "AI: $FILE (using key ${KEY_INDEX})"
            OURS=$(git show ":2:$FILE" 2>/dev/null)
            THEIRS=$(git show ":3:$FILE" 2>/dev/null)
            
            CONTENT="Resolve merge conflict in $FILE. Keep both features. Output ONLY code.

<<<<<<< HEAD
$OURS
=======
$THEIRS
>>>>>>> qingchen/main"
            
            RESPONSE=$(curl -s "$API_URL" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $API_KEY" \
                -d "{\"model\": \"$MODEL\", \"messages\": [{\"role\": \"user\", \"content\": $CONTENT}], \"max_tokens\": 16000}" | jq -r '.choices[0].message.content // ""')
            
            if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -gt 50 ]; then
                echo "$RESPONSE" > "$FILE"
            else
                echo "Failed, trying next key..."
                KEY_INDEX=$(( (KEY_INDEX + 1) % ${#API_KEYS[@]} ))
                if [ $KEY_INDEX -eq 0 ]; then
                    git checkout --theirs "$FILE"
                fi
            fi
            git add "$FILE"
        done
        git commit -m "AI-resolve" || true
    fi
}

git stash pop || git stash drop 2>/dev/null || true
npm run build
echo "=== Done ==="
