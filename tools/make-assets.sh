#!/bin/zsh
# 아이콘(icons/*.png)과 링크 공유 그림(og.png)을 tools/의 HTML에서 다시 찍는다.
# 먼저 이 폴더를 서빙해 두어야 한다: python3 -m http.server 4395 --directory class-dashboard
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="${BASE:-http://127.0.0.1:4395}"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=4000 --window-size="$2" --screenshot="$PWD/$3" "$BASE/$1" >/dev/null 2>&1; echo "만듦: $3"; }
shot tools/icon.html 512,512 icons/icon-512.png
# 크롬은 아주 작은 창을 최소 폭으로 열어 그림이 한쪽으로 밀리므로, 512로 찍은 뒤 줄인다
sips -z 192 192 icons/icon-512.png --out icons/icon-192.png >/dev/null && echo "만듦: icons/icon-192.png"
sips -z 180 180 icons/icon-512.png --out icons/apple-touch-icon.png >/dev/null && echo "만듦: icons/apple-touch-icon.png"
shot tools/og.html 1200,630 og.png
