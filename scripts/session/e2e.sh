#!/usr/bin/env bash
# E2E в любой сессии: `scripts/session/e2e.sh [аргументы playwright test]`.
# - Браузеры текущей версии Playwright установлены (локально, CI) → обычный `npm run test:e2e`.
# - Иначе (облачная сессия: прокси не пускает к cdn.playwright.dev) → предустановленный
#   Chromium из $PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers), только проект Pixel 7.
#   WebKit (iPhone 14) в этом режиме пропускается — его проверяет job `e2e` в CI.
source "$(dirname "$0")/_lib.sh"

own=$(node -e "console.log(require('playwright-core').chromium.executablePath())" 2>/dev/null || true)
if [[ -n "$own" && -x "$own" ]]; then
  exec npm run test:e2e -- "$@"
fi

browsers=${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}
exe=$(ls -d "$browsers"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell \
  2>/dev/null | sort -V | tail -1 || true)
[[ -n "$exe" && -x "$exe" ]] \
  || die "нет браузеров Playwright: npx playwright install chromium (или прогон в CI)"
echo "e2e: браузеры Playwright не установлены — Chromium из $exe, только Pixel 7 (WebKit — в CI)" >&2
PW_CHROMIUM_EXECUTABLE="$exe" exec npm run test:e2e -- "$@"
