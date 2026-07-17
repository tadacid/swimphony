#!/bin/zsh

set -u

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

PROJECT_DIR="/Users/tada/codex-work/Swimphony/swimphony-starter"
APP_URL="http://localhost:3000/"
LOG_FILE="/tmp/swimphony-dev.log"

show_error() {
  /usr/bin/osascript -e "display dialog \"$1\" with title \"Swimphony\" buttons {\"OK\"} default button \"OK\" with icon stop"
}

is_swimphony_ready() {
  /usr/bin/curl --silent --fail --max-time 2 "$APP_URL" | /usr/bin/grep -q "<title>Swimphony</title>"
}

if ! is_swimphony_ready; then
  if ! command -v npm >/dev/null 2>&1; then
    show_error "Node.js（npm）が見つかりません。"
    exit 1
  fi

  cd "$PROJECT_DIR" || {
    show_error "Swimphonyのフォルダが見つかりません。"
    exit 1
  }

  /usr/bin/nohup npm run dev >"$LOG_FILE" 2>&1 </dev/null &

  for _ in {1..60}; do
    is_swimphony_ready && break
    /bin/sleep 0.5
  done
fi

if ! is_swimphony_ready; then
  show_error "起動できませんでした。ログ: $LOG_FILE"
  exit 1
fi

if [[ -d "/Applications/Google Chrome.app" ]]; then
  /usr/bin/open -a "Google Chrome" "$APP_URL"
else
  /usr/bin/open "$APP_URL"
fi
