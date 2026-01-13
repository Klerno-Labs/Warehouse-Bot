#!/bin/bash

# Script to delete remote feature branches after merge
# Run this script with appropriate GitHub credentials

set -e

echo "Deleting remote feature branches..."

BRANCHES=(
  "claude/audit-duplicate-code-bVbol"
  "claude/debug-old-design-display-liYV7"
  "claude/fix-pricing-404-cN6Ne"
  "claude/identify-upgrades-UwIwF"
  "claude/merge-all-branches-lG2CW"
  "claude/redesign-website-hC7Qt"
  "claude/review-app-ux-4j8ox"
  "claude/top-performance-all-categories-4eTSh"
)

for branch in "${BRANCHES[@]}"; do
  echo "Deleting origin/$branch..."
  git push origin --delete "$branch" || echo "Failed to delete $branch (may already be deleted)"
done

echo ""
echo "✅ Remote branch cleanup complete!"
echo ""
echo "Remaining remote branches:"
git branch -r
