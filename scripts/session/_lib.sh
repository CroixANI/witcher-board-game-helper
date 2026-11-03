#!/usr/bin/env bash
# Общие функции для скриптов сессии. Только REST API (GraphQL в облачных сессиях закрыт).
set -euo pipefail

# owner/repo из origin (https или ssh), можно переопределить через REPO=owner/name
repo() {
  if [[ -n "${REPO:-}" ]]; then echo "$REPO"; return; fi
  git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##'
}

die() { echo "ERROR: $*" >&2; exit 1; }
