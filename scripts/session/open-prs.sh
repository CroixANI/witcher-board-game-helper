#!/usr/bin/env bash
# Список открытых PR: номер, ветка, заголовок.
# Использование: scripts/session/open-prs.sh
source "$(dirname "$0")/_lib.sh"
gh api "repos/$(repo)/pulls?state=open&per_page=100" \
  --jq '.[] | "#\(.number)\t\(.head.ref)\t\(.title)"'
