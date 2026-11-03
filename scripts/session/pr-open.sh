#!/usr/bin/env bash
# Открыть PR из текущей ветки в main, назначить labels и milestone.
# Использование:
#   scripts/session/pr-open.sh --title "feat: …" --body-file /tmp/body.md \
#     [--label infra --label content] [--milestone "M0 Репозиторий и каркас"] [--draft]
# Печатает: <номер>\t<url>
source "$(dirname "$0")/_lib.sh"
title=""; body_file=""; milestone=""; draft=false; labels=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) title="$2"; shift 2 ;;
    --body-file) body_file="$2"; shift 2 ;;
    --label) labels+=("$2"); shift 2 ;;
    --milestone) milestone="$2"; shift 2 ;;
    --draft) draft=true; shift ;;
    *) die "unknown arg: $1" ;;
  esac
done
[[ -n "$title" && -f "$body_file" ]] || die "--title и --body-file обязательны"
R=$(repo)
head=$(git rev-parse --abbrev-ref HEAD)
[[ "$head" != "main" ]] || die "нельзя открывать PR из main"
git ls-remote --exit-code --heads origin "$head" >/dev/null || die "ветка $head не запушена"

pr=$(gh api "repos/$R/pulls" -f title="$title" -f head="$head" -f base=main \
       -F draft="$draft" -F body=@"$body_file" --jq '"\(.number)\t\(.html_url)"')
num=${pr%%$'\t'*}

if [[ ${#labels[@]} -gt 0 ]]; then
  args=(); for l in "${labels[@]}"; do args+=(-f "labels[]=$l"); done
  gh api "repos/$R/issues/$num/labels" "${args[@]}" >/dev/null
fi
if [[ -n "$milestone" ]]; then
  ms=$(gh api "repos/$R/milestones?state=open&per_page=100" \
         --jq ".[] | select(.title == \"$milestone\") | .number")
  [[ -n "$ms" ]] || die "milestone не найден: $milestone"
  gh api -X PATCH "repos/$R/issues/$num" -F milestone="$ms" >/dev/null
fi
echo "$pr"
