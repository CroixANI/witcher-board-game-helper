#!/usr/bin/env bash
# E2E в любой сессии: `scripts/session/e2e.sh [аргументы playwright test]`.
# Проверяет уже собранный `dist/` — сначала `npm run build`.
# - Установлены Chromium и WebKit текущей версии Playwright (локально, CI) → обычный `npm run test:e2e`.
# - Есть только Chromium этой версии → он, только проект Pixel 7.
# - Нет ничего (облачная сессия: прокси не пускает к cdn.playwright.dev) → предустановленный
#   Chromium из $PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers), только Pixel 7.
# WebKit (iPhone 14) в последних двух режимах пропускается — его проверяет job `e2e` в CI.
source "$(dirname "$0")/_lib.sh"

path_of() { node -e "console.log(require('playwright-core').$1.executablePath())" 2>/dev/null || true; }
chromium=$(path_of chromium)
webkit=$(path_of webkit)

if [[ -x "$chromium" && -x "$webkit" ]]; then
  exec npm run test:e2e -- "$@"
fi

exe=$chromium
if [[ ! -x "$exe" ]]; then
  browsers=${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}
  exe=$(ls -d "$browsers"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell \
    2>/dev/null | sort -V | tail -1 || true)
fi
[[ -n "$exe" && -x "$exe" ]] \
  || die "нет браузеров Playwright: npx playwright install chromium webkit (или прогон в CI)"
echo "e2e: Chromium $exe, только Pixel 7 (WebKit/iPhone 14 — в CI)" >&2
PW_CHROMIUM_EXECUTABLE="$exe" exec npm run test:e2e -- "$@"
