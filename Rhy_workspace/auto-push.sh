#!/bin/bash
# Auto-push script for RW01

cd /home/admin/.openclaw/workspace/DS_demos

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
    echo "No changes to push"
    exit 0
fi

# Add all changes
git add -A

# Commit with timestamp
COMMIT_MSG="RW01: $(date +'%Y-%m-%d %H:%M:%S') update"
git commit -m "$COMMIT_MSG"

# Push to GitHub
git push origin main

echo "Pushed: $COMMIT_MSG"
