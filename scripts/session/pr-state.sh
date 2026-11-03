#!/usr/bin/env bash
# Состояние PR: open | merged | closed.
# Использование: scripts/session/pr-state.sh <номер>
source "$(dirname "$0")/_lib.sh"
[[ $# -eq 1 ]] || die "usage: pr-state.sh <pr-number>"
gh api "repos/$(repo)/pulls/$1" \
  --jq 'if .merged_at then "merged\t\(.merged_at)" elif .state == "closed" then "closed" else "open" end'
