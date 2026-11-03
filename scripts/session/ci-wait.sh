#!/usr/bin/env bash
# Дождаться завершения всех check runs для коммита.
# Использование: scripts/session/ci-wait.sh [sha=HEAD] [timeout_sec=1800]
# Код выхода: 0 — всё зелёное; 1 — есть упавшие; 2 — таймаут; 3 — проверок нет (CI ещё не настроен).
source "$(dirname "$0")/_lib.sh"
sha=$(git rev-parse "${1:-HEAD}"); timeout=${2:-1800}; grace=180
R=$(repo); start=$(date +%s)
while :; do
  # total pending failed
  read -r total pending failed < <(gh api "repos/$R/commits/$sha/check-runs?per_page=100" --jq '
    [.check_runs[]] as $r
    | "\($r | length) \([$r[] | select(.status != "completed")] | length) \([$r[] | select(.status == "completed" and (.conclusion | IN("success","skipped","neutral") | not))] | length)"')
  elapsed=$(( $(date +%s) - start ))
  if (( total == 0 )); then
    if (( elapsed > grace )); then echo "Нет check runs для $sha (CI не настроен?)"; exit 3; fi
  elif (( pending == 0 )); then
    gh api "repos/$R/commits/$sha/check-runs?per_page=100" \
      --jq '.check_runs[] | "\(.name): \(.conclusion)  \(.html_url)"'
    if (( failed > 0 )); then echo "CI: FAILED"; exit 1; fi
    echo "CI: OK"; exit 0
  fi
  if (( elapsed > timeout )); then echo "CI: TIMEOUT ($pending в процессе)"; exit 2; fi
  sleep 20
done
