---
name: 학급 대시보드
description: 빙글빙글 돌림판의 '출석부와 칭찬 도장'을 이어받은 학급 대시보드. 흰 종이와 먹색 괘선, 왼쪽 목차와 오늘 한 장, 확인하면 빨간 도장
colors:
  paper: "#ffffff"
  paper-2: "#f4f5f7"
  ink: "#1e2228"
  ink-hover: "#363d45"
  ink-2: "#474f58"
  ink-3: "#6a727b"
  dim: "#a9b0b8"
  on-ink-muted: "#d5d9de"
  rule: "#dadde2"
  field-line: "#868e97"
  quiet-line: "#b9bfc7"
  scroll-thumb: "#c3c8cf"
  stamp: "#d2392c"
  blue: "#2d6cb0"
  disabled-ink: "#9aa1a9"
  wheel-fill-a: "#ffffff"
  wheel-fill-b: "#f0f2f4"
  wheel-fill-c: "#f7f8f9"
  wheel-fill-dim: "#f3f4f6"
typography:
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  list:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.5
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
  headline:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  display-sm:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  stage:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif"
    fontSize: "clamp(4rem, 11vw, 9rem)"
    fontWeight: 800
    lineHeight: 1.05
rounded:
  inner: "4px"
  r: "6px"
  big: "8px"
  dialog: "10px"
  pill: "1rem"
  round: "50%"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.75rem"
  page-y: "1.5rem"
  page-x: "2.2rem"
  col-gap: "2.5rem"
  rail-w: "15rem"
  row-min: "2.6rem"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.r}"
    padding: "0 1rem"
    height: "2.75rem"
  button-hover:
    backgroundColor: "{colors.paper-2}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.r}"
    padding: "0 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
  button-sm:
    rounded: "{rounded.r}"
    padding: "0 0.8rem"
    height: "2.35rem"
  button-big:
    rounded: "{rounded.big}"
    padding: "0 1.5rem"
    height: "3.4rem"
  text-button:
    textColor: "{colors.blue}"
    padding: "0.15rem 0.1rem"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    size: "2.75rem"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "0 0.8rem"
    height: "2.75rem"
  seg-option:
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
    padding: "0 0.85rem"
    height: "2.2rem"
  seg-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  switch-track:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    width: "2.75rem"
    height: "1.6rem"
  switch-track-on:
    backgroundColor: "{colors.ink}"
  nav-link:
    textColor: "{colors.ink}"
    padding: "0 0.6rem"
    height: "{spacing.row-min}"
  nav-link-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.r}"
  list-row:
    textColor: "{colors.ink}"
    typography: "{typography.list}"
    padding: "0.7rem 0.6rem"
  list-row-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.r}"
  period:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    padding: "0.7rem 0.55rem 0.8rem"
  period-now:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.big}"
  check-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.big}"
    padding: "0 0.55rem 0 0.4rem"
    height: "3.5rem"
  stamp-mini:
    textColor: "{colors.stamp}"
    rounded: "{rounded.round}"
    size: "2.3rem"
  stamp-done:
    textColor: "{colors.stamp}"
    rounded: "{rounded.round}"
    size: "2.9rem"
  kind-tag:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.inner}"
    padding: "0.1rem 0.45rem"
  hub:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.round}"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    width: "min(36rem, calc(100vw - 2rem))"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.big}"
    padding: "0.75rem 0.85rem 0.75rem 1.15rem"
---

# Design System: 학급 대시보드

## Overview

**Creative North Star: "출석부와 칭찬 도장"**

화면은 흰 종이에 먹색 잉크로 쓴 학급 출석부다. 빙글빙글 돌림판에서 세운 세계를 그대로 이어받았고 대시보드는 여기에 목차와 하루 한 쪽을 더했다. 왼쪽에는 출석부 앞장 같은 목차가 세로로 서고 오른쪽에는 오늘 한 장이 놓인다. 글자와 괘선이 거의 모든 일을 맡으며 칸 나눔은 제목 아래 굵은 먹선과 줄 사이 옅은 괘선으로 해결된다.

색은 둘만 일한다. 인주 빨강은 '확인됐다'는 표시, 곧 도장과 돌림판 바늘과 채점 O·X에 쓴다. 볼펜 파랑은 사람이 손으로 남긴 표시와 키보드로 다니는 길을 맡는다. 나머지는 모두 먹과 종이의 농담이다. 밝은 화면 하나만 둔다(`color-scheme: light`). 형광등 켜진 교실 앞 TV를 스무 명 남짓이 멀리서 볼 때 흰 바탕의 먹색 글씨가 가장 또렷했다.

밀도는 장부처럼 촘촘하다. 대신 한 화면에서 고른 것 하나만 먹으로 채운다. 목차의 고른 항목, 지금 교시, 고른 목록 줄, 오늘 요일 칸이 그렇다. 체크는 어느 화면이든 학생 이름 칸을 눌러 빨간 도장을 찍는 손동작 하나로 통일된다. '크게 보기'를 켜면 목차가 사라지고 글자가 교실 뒤에서도 읽히는 크기로 커진다.

**Key Characteristics:**
- 흰 종이, 먹색 잉크, 2px 먹선과 1px 괘선
- 빨강은 도장·바늘·채점 표시, 파랑은 손 표시·링크·초점
- 고른 것 하나는 먹색 채움, 지난 것은 흐린 회색
- Pretendard 한 가지 글꼴, 여덟 단계 크기, 숫자는 고정폭
- 왼쪽 목차와 괘선으로 나눈 오늘 한 장, 같은 크기 카드 타일은 없음
- 서명 동작: 이름 칸을 누르면 도장이 1.9배에서 내려앉고 다 끝나면 '다 함'

## Colors

먹과 종이의 회색 농담 위에 인주 빨강과 볼펜 파랑 두 색만 얹는다.

### Primary
- **인주 빨강** (stamp): 확인됨을 뜻하는 자리에만 쓴다. 체크판 칸의 작은 도장('냄'·'함'), 1인1역 도장, '다 함'·'확인'·'N번째' 도장, 돌림판의 3시 바늘과 칸 속 '뽑힘' 도장, OX 게임에서 답을 열 때 나오는 O·X 채점 표시. 교사가 빨간 펜으로 채점하는 교실의 물건을 그대로 옮긴 것이다.

### Secondary
- **볼펜 파랑** (blue): 사람이 손으로 남긴 표시와 키보드 길. 출결 칸의 파란 테두리와 '결석·질병' 같은 꼬리표, 결석한 이름의 파란 취소선, 오늘 화면의 '출결 확인 전', 링크와 글자 단추, 키보드 초점 테(2.5px), 입력칸 초점 테두리와 커서, 글자 선택 배경(20% 투명도). 화면 맨 위 예시 안내 띠의 글자도 파랑이다.

### Neutral
- **종이** (paper): 화면 바탕, 창과 칸 바탕, 먹 채움 위의 글자.
- **옅은 종이** (paper-2): 단추·목록 줄·목차 항목의 마우스 올림 바탕, 예시 안내 띠, 시간표 표의 오늘 열, 고른 체크 상자.
- **먹** (ink): 본문 글자, 굵은 먹선(2px), 단추 테두리, 주 단추, 고른 목차와 목록 줄, 지금 교시, 돌리기 원, 알림 띠.
- **눌린 먹** (ink-hover): 주 단추 마우스 올림.
- **연한 먹** (ink-2): 보조 문장, 지금 교시 줄, 재적·출석 귀퉁이, 입력 이름표.
- **흐린 먹** (ink-3): 번호, 표 머리, 날짜·시각, 꼬리표, 도움말, 남은 사람 줄.
- **흐림** (dim): 지난 교시 과목, 시간표 빈 칸 안내, 숨긴 타이머의 '?.??', 돌림판이 멈춘 뒤 물러난 칸 글자.
- **먹 위 흐린 글자** (on-ink-muted): 먹으로 채운 칸 안의 보조 글자. 고른 목차의 개수, 지금 교시의 교시 이름과 시각, 고른 목록 줄의 날짜.
- **괘선** (rule): 줄 사이 1px 선, 목차와 본문 사이 경계, 체크 칸의 기본 테두리.
- **입력칸 선** (field-line): 입력칸 1.5px 테두리. 먹 단추보다 한 단계 옅다.
- **조용한 선** (quiet-line): 덜 중요한 단추의 테두리.
- **스크롤 막대** (scroll-thumb): 얇은 스크롤 막대 손잡이.
- **쓸 수 없음** (disabled-ink): 이름이 없을 때 돌리기 원, 빈 돌림판의 점선 테.
- **돌림판 칸** (wheel-fill-a, wheel-fill-b, wheel-fill-c): '뽑기' 화면의 돌림판에서 흰 칸과 옅은 회색 칸이 번갈아 든다. 칸 수가 홀수면 마지막 칸을 세 번째 농담으로 칠해 같은 색 두 칸이 붙지 않게 한다.
- **멈춘 뒤 칸** (wheel-fill-dim): 돌림판이 멈추면 뽑힌 칸만 흰색으로 남고 나머지 칸은 이 바탕으로 물러난다.

### Named Rules
**The Two Inks Rule.** 빨강은 '확인됐다', 파랑은 '사람이 손댔다'만 뜻한다. 두 색이 다른 뜻을 맡거나 세 번째 색이 들어오면 출석부가 무너진다. 오류, 경고, 모자람에도 빨강을 쓰지 않는다. 예외는 조용히 신호등 화면 하나다. 신호등이라 초록·노랑·빨강 등을 켜고, 그 색은 `.signal` 안에만 둔다.

**The Ink Fill Rule.** 지금 고른 것, 지금 진행 중인 것 하나만 먹으로 채운다. 목차 항목, 목록 줄, 지금 교시, 오늘 요일 칸, 고르기 단추의 고른 칸이 같은 방식이다. 지난 것은 흐림으로 물러난다.

**The Gray Wheel Rule.** 돌림판 칸은 흰색과 옅은 회색 농담으로만 칠한다. 칸마다 다른 색을 넣지 않는다.

## Typography

**Display Font:** Pretendard Variable (자체 호스팅 `fonts/pretendard`, 없으면 Apple SD Gothic Neo, 맑은 고딕, system-ui)
**Body Font:** 같은 글꼴
**Label/Mono Font:** 같은 글꼴, 숫자에는 `font-variant-numeric: tabular-nums`

**Character:** 한 글꼴의 굵기만으로 위계를 만든다. 600~800의 굵은 글자가 많아 멀리서도 이름과 과목이 먹물처럼 진하게 읽힌다.

뿌리 글자 크기는 `clamp(15px, calc(0.42vw + 9px), 20px)`로 화면 폭에 따라 커지고 모든 크기는 rem으로 그 위에 얹힌다. 1920 화면의 TV에서는 저절로 커진다. 줄바꿈은 `word-break: keep-all`로 어절을 지킨다.

### Hierarchy
크기는 여덟 단계다. 각 단계는 대표값 하나와 그 둘레의 허용 범위를 가진다. 빌드의 스타일시트에는 108개 글자 크기 선언에 40가지 값이 쓰이는데 뿌리 크기와 돌리기 원, 순서 번호의 0.7em을 뺀 모든 값이 아래 범위 안에 든다. 새 화면은 대표값을 쓰고 범위 안의 다른 값은 이미 있는 자리에서만 남긴다.

- **Label** (700, 0.85rem, 범위 0.72~0.92rem): 표 머리, 목차 개수와 학년도, 번호, 목록 메타, 꼬리표, 작은 도움말, 도장 속 글자. 대문자 변환이나 넓은 자간은 없다.
- **Body** (400~700, 1rem, 1.5, 범위 0.95~1.02rem): 설명문, 단추 글자, 목차 항목, 표 칸, 입력 이름표. 긴 설명은 40em 폭에서 끊는다.
- **List** (600~800, 1.1rem, 범위 1.05~1.15rem): 목록 제목, 구역 제목, 행사·할 것 줄, 입력칸 글자, 관찰 기록 본문(1.6 줄 간격, 46em 폭), 지금 교시 줄.
- **Title** (700~800, 1.25rem, 범위 1.2~1.3rem): 체크 칸 이름, 시간표 표의 과목, 큰 단추, 창 제목, 게임 이름, 큰 개수 숫자.
- **Headline** (800, 1.5rem, -0.02em, 범위 1.4~1.6rem): 시간표 띠의 과목, 알림장 줄, 급훈, 목차 맨 위 이름, 체크판 제목, 순서 목록 이름.
- **Display-sm** (800, 1.8rem, -0.02em, 범위 1.7~2.2rem): 쪽 제목(1.75rem), 오늘 날짜(2rem), 운영비 금액, '크게 보기'의 알림장 줄과 급훈.
- **Display** (800, 3rem, 1, -0.03em, 범위 2.6~4rem): 시계(2.9rem, TV 4rem), 뽑힌 이름(3.4rem), 업다운 화살표 줄, TV 날짜.
- **Stage** (800, 화면 폭에 따른 clamp): 게임 무대의 한 가지 큰 글자. 초성 낱말 `clamp(4rem, 11vw, 9rem)`(TV `clamp(6rem, 15vw, 14rem)`), 퀴즈 문장 `clamp(2rem, 4.4vw, 3.6rem)`(TV `clamp(2.6rem, 5vw, 4.8rem)`, 30em 폭), 타이머 숫자 `clamp(5rem, 16vw, 13rem)`, -0.04em.

돌림판 글자는 캔버스에 같은 글꼴로 그린다. 보통 칸은 650, 뽑힌 칸은 800이며 칸 폭에 맞춰 최대 46px까지 커진다. 넘치면 72%까지 줄이고 그래도 길면 말줄임표를 붙인다. 글자가 9px보다 작아질 만큼 칸이 많으면 이름을 그리지 않는다.

### Named Rules
**The One Face Rule.** 글꼴은 Pretendard 하나다. 위계는 크기와 굵기로만 만든다.

**The Eight Steps Rule.** 새 글자 크기는 여덟 단계의 대표값에서 고른다. 범위 안이라고 새 값을 더 만들지 않는다.

**The Tabular Number Rule.** 줄을 맞춰 읽는 숫자(번호, 개수, 시각, 시계, D-day, 날짜, 금액, 타이머)는 모두 고정폭 숫자로 쓴다.

## Layout

넓은 화면은 두 칸이다. 왼쪽 목차(rail-w, 15rem)는 화면 높이에 붙어 서고 1px 괘선으로 본문과 나뉜다. 목차 맨 위에 대시보드 이름과 학년도가 있고 2px 먹선 아래로 기능 이름이 줄지어 내려간다. 기능 묶음 사이에는 0.6rem 빈 줄이 들어가고 맨 아래 설정과 '크게 보기' 단추가 붙는다.

본문 쪽은 1.5rem 2.2rem 3rem 여백으로 시작한다. 모든 쪽 머리는 제목과 오른쪽 끝 행동 단추로 이루어지고 2px 먹선으로 끝난다. 구역 사이는 1.8rem이다.

'오늘' 한 장은 위 줄이 세 칸이다. 왼쪽에 날짜와 지금 교시, 가운데에 위아래 1.5px 먹선 사이의 급훈, 오른쪽 끝에 시계와 재적·출석·결석 한 줄이 놓인다. 그 아래 2px 먹선 밑으로 1.3 대 1 두 단(사이 2.5rem)이 이어진다. 왼쪽에 시간표 띠·알림장·학습 사이트 단추 줄, 오른쪽에 다가오는 행사와 아직 확인할 것이 든다. 같은 크기 카드 타일은 두지 않고 모든 구획을 괘선으로 나눈다.

여러 단 목록(1인1역, 학습 사이트, 게임 목록, 기능 켜고 끄기)은 `auto-fill`로 16~19rem 단을 만들고 단 사이를 1.75rem 띄운다. 줄마다 아래 1px 괘선이 붙는다. 체크판은 10rem 이상 칸을 바둑판으로 채운다.

1100px 이하에서는 목차가 13rem으로 줄고 오늘 두 단, 목록과 상세의 두 단, 돌림판과 뽑힌 순서가 모두 한 단으로 쌓인다. 관찰 기록의 학생 목록은 고르기 상자로 바뀐다. 860px 이하에서는 목차가 왼쪽에서 밀려 나오는 서랍이 되고 위에 3.5rem 머리줄(2px 먹선)이 생긴다. 급훈은 둘째 줄로 내려가고 시간표 띠는 가로로 넘기며 본다. 입력 양식은 한 단, 체크 칸은 8.5rem 이상이다.

'크게 보기'는 목차와 예시 안내 띠를 숨기고 본문을 화면 전체로 넓힌다. 날짜·시계·급훈·알림장·시간표 띠·오른쪽 단 글자가 모두 한두 단계 커진다. 교사용 단추와 키보드 안내는 숨겨지고 게임 무대는 남은 높이를 채워 가운데에 놓인다. 나가는 단추만 오른쪽 아래 구석에 남는다.

## Elevation & Depth

평면이 기본이다. 깊이는 먹선 굵기(2px 대 1px)와 종이 농담, 먹 채움으로 나타낸다. 그림자는 종이 위에 따로 놓인 물건에만 준다. 손으로 누르는 돌리기 원과 바늘, 종이 위로 떠오르는 창·알림 띠, 휴대폰에서 밀려 나오는 목차 서랍이 그렇다. 모두 먹색 계열의 부드러운 퍼짐이고 어긋나게 찍힌 단단한 그림자는 없다.

### Shadow Vocabulary
- **돌리기 원** (`box-shadow: 0 0.45rem 1.2rem rgba(30, 34, 40, 0.24)` 위에 안쪽 먹 고리와 28% 흰 고리): 누르는 물건임을 보인다.
- **바늘** (`filter: drop-shadow(0 2px 3px rgba(30, 34, 40, 0.28))`): 돌림판 위에 얹힌 조각처럼.
- **창** (`box-shadow: 0 1.5rem 3.5rem rgba(16, 19, 23, 0.3)`), 뒤 배경 45% 먹.
- **알림 띠** (`box-shadow: 0 0.7rem 1.8rem rgba(16, 19, 23, 0.32)`).
- **목차 서랍** (`box-shadow: 0 0 2rem rgba(16, 19, 23, 0.2)`): 860px 이하에서만, 뒤 배경 40% 먹.

### Named Rules
**The Paper Stays Flat Rule.** 표, 목록 줄, 체크 칸, 단추, 입력칸에는 그림자가 없다. 그림자는 손으로 잡는 것과 종이 위에 떠오르는 것에만 쓴다.

## Shapes

모서리는 작게 둥글린다. 단추·입력칸·아이콘 단추·고른 목차 항목·고른 목록 줄은 6px, 큰 단추와 체크 칸과 알림 띠는 8px, 창은 10px다. 고르기 단추 안쪽 칸과 종류 꼬리표는 4px. 지금 교시 칸은 위쪽이 먹선에 붙고 아래 두 모서리만 8px로 둥글어 띠에서 늘어진 꼬리표처럼 보인다. 시간표 표의 오늘 요일 머리는 그 반대로 위쪽만 6px다. 켜고 끄는 스위치만 1rem 둥근 막대 모양이다. 동그라미는 돌림판, 돌리기 원, 도장 셋뿐이다. 목록 줄과 표는 모서리 없는 직선으로 괘선에 붙는다.

선 굵기에 뜻이 있다. 2px 먹선은 쪽 머리·목록 위·표 머리 아래·창 테두리, 1.5px 먹선은 단추와 고르기·조절기·스위치 테두리와 급훈 위아래, 1.5px 옅은 선은 입력칸, 1.5px 괘선은 아직 확인하지 않은 체크 칸, 1px 괘선은 줄 사이다.

도장은 모두 -12도 기울어 찍힌다. 두 겹 원 안에 글자나 숫자가 들어간다. 바깥은 굵은 빨간 테, 안쪽은 흰 틈 너머의 반투명 빨간 고리(`inset` 그림자로 그림)다.

## Components

### Buttons
글자로 말하는 단추. 아이콘은 꼭 필요한 곳에만 붙는다.
- **Shape:** 작게 둥근 모서리(6px), 1.5px 먹 테두리, 최소 높이 2.75rem, 700 글자.
- **Primary:** 먹으로 채우고 흰 글자. 한 영역(쪽 머리, 창, 결과 줄)의 주 행동 하나에만 쓴다.
- **Secondary:** 흰 바탕에 먹 테두리와 먹 글자. 덜 중요한 단추(고치기, 그대로 두기, 다시 넣기)는 조용한 선 테두리.
- **Danger:** 지우기를 묻는 확인 창의 단추도 먹 테두리와 먹 글자 그대로다. 위험을 빨강으로 알리지 않고 창의 문장으로 알린다.
- **Small / Big:** 작은 단추는 높이 2.35rem, 0.95rem 글자. 큰 단추는 높이 3.4rem, 1.2rem 글자, 8px 모서리. 숫자 자판 단추는 3.6rem 높이에 1.5rem 숫자.
- **Hover / Focus:** 마우스를 올리면 옅은 종이 바탕(주 단추는 눌린 먹), 누르면 1px 내려앉는다. 초점은 2.5px 파랑 테에 2px 띄움. 쓸 수 없을 때는 40% 불투명.
- **Text button:** 파란 밑줄 글자(1.5px, 0.2em 띄움). 구역 머리 오른쪽의 '시간표 보기' 같은 이동에 쓴다.
- **Icon button:** 테두리 없는 2.75rem 정사각형, 1.5rem 선 아이콘.

### Icons
직접 그린 선 아이콘 열다섯 개를 `index.html`의 sprite에 둔다. 닫기, 더하기·빼기, 확인, 왼쪽·오른쪽·아래 꺾쇠, 메뉴, 소리 켜짐·꺼짐, 새 창, 위·아래 화살표, O·X. 24 격자에 선 굵기 2(크게 쓸 때 2.4~2.6), 둥근 끝을 쓰며 글자 색을 따른다.

### Chips (종류 꼬리표)
- **Style:** 관찰 기록의 분류와 운영비의 받음·씀은 1.5px 먹 테두리 4px 모서리 안에 0.82rem 800 글자를 쓴다. '받음'만 먹으로 채운다.
- **Scope tag:** 행사·할 것 줄의 '학교'·'안내장' 같은 꼬리는 테두리 없이 제목 뒤에 0.8rem 흐린 먹으로 붙는다.

### Inputs / Fields
- **Style:** 흰 바탕, 1.5px 입력칸 선, 6px 모서리, 최소 높이 2.75rem, 1.05rem 글자. 자리 표시 글자는 흐린 먹. 긴 글칸은 1.65 줄 간격.
- **Focus:** 테두리가 파랑으로 바뀌고 25% 파랑 2.5px 테가 붙는다.
- **Error:** 양식 아래 굵은 글자 한 줄.
- **이름표:** 0.95rem 700 연한 먹, 입력칸 위 0.4rem.
- **학생 고르기 상자:** 1.5px 괘선 테두리, 6px 모서리, 고르면 먹 테두리와 옅은 종이 바탕.

### Segmented control / Switch / Stepper
고르기 단추는 1.5px 먹 테두리 안에 4px 모서리 칸이 들고 고른 칸은 먹으로 채운다. 뽑기의 돌림판·순서 정하기·모둠 나누기, 관찰 기록 분류 거르기가 이 모양이다. 스위치는 2.75rem 둥근 막대에 먹 손잡이가 들고 켜면 막대가 먹으로 차고 손잡이가 흰색으로 옮겨 간다. 단계 조절기는 같은 먹 테두리에 빼기·더하기 아이콘과 고정폭 숫자 800.

### Navigation (목차)
줄마다 1px 괘선이 그어진 세로 목록이다. 항목은 최소 2.6rem, 1.02rem 600 먹 글자이고 오른쪽 끝에 남은 개수를 0.85rem 흐린 먹 숫자로 둔다. 마우스를 올리면 옅은 종이, 지금 화면이면 6px 모서리의 먹 채움에 흰 글자가 되고 개수는 먹 위 흐린 글자로 바뀐다. 860px 이하에서는 머리줄의 '목차' 단추가 서랍을 연다.

### Ruled lists (줄 목록)
과제·안내장·미션 고르기, 뽑힌 순서, 학생 고르기가 같은 줄 목록이다. 2px 먹선 아래로 줄이 이어지고 줄마다 1.1rem 700 제목, 그 아래 0.88rem 흐린 먹 메타, 오른쪽에 '18/25' 같은 개수(굵은 숫자에 흐린 분모)가 든다. 고른 줄은 목차처럼 먹으로 채운다.

'오늘'의 다가오는 행사와 아직 확인할 것은 한 줄 문법을 함께 쓴다. 맨 왼쪽 4.2rem 칸에 굵은 고정폭 D-day 또는 '오늘', 그다음 날짜(행사)나 굵은 제목과 작은 꼬리(할 것), 그 아래 남은 사람 줄, 오른쪽 끝에 제출 수 또는 '다 함' 도장이다. 알림장은 번호 붙은 줄 목록이며 1.45rem 600 글자로 멀리서 읽히게 쓴다.

### Timetable strip (시간표 띠)
2px 먹선 아래 그날 마지막 수업까지 교시 칸이 같은 폭으로 가로로 줄 선다. 칸마다 위에 교시 이름(0.82rem 흐린 먹), 가운데 과목(1.5rem 800), 아래 시작 시각(고정폭)이 있고 칸 사이는 1px 괘선이다. 지금 교시는 먹으로 채워지고 지난 교시 과목은 흐림으로 물러난다. 점심·쉬는 칸은 1.05rem 흐린 먹. 시간표 쪽의 큰 표도 같은 규칙으로 오늘 요일 머리를 먹으로 채우고 오늘 열은 옅은 종이, 지금 칸은 먹이다.

### Stamp board (도장 체크판)
안내장·과제·아침독서·출결이 같은 판을 쓴다. 2px 먹선 아래 학생 이름 칸이 바둑판으로 놓인다. 칸은 8px 모서리, 1.5px 괘선 테두리, 높이 3.5rem이며 번호(0.85rem 흐린 먹)·이름(1.2rem 700)·도장 자리 세 칸이다. 누르면 테두리가 먹으로 바뀌고 오른쪽에 2.3rem 작은 도장이 1.9배·-30도에서 -12도로 내려앉는다(0.45초). 다시 누르면 지워진다. 판 위에는 제목과 큰 개수, 그 아래 '아직: ○○, ○○' 줄이 있다.

출결 판에서는 도장 대신 볼펜 파랑을 쓴다. 기록이 있는 칸은 파란 테두리에 '결석·질병' 같은 파란 꼬리표가 붙고 결석이면 이름에 파란 2px 취소선을 긋는다. 날짜 옆 '확인' 도장은 그날 출결을 다 봤다는 표시다.

1인1역은 같은 도장을 두 줄 칸(역할 이름과 맡은 사람)에 찍는다.

### Stamps
- **작은 도장** (2.3rem): 체크 칸과 1인1역의 '냄'·'함'. 0.72rem 800 글자.
- **다 함 도장** (2.9rem, 3px 테): '오늘'의 다 끝난 할 것, 출결 '확인', 뽑기의 'N번째'(3.4rem). 0.78rem 800 글자.

### Tables
2px 먹선 아래 0.85rem 700 흐린 먹 머리, 줄 사이 1px 괘선, 1.02rem 칸 글자. 숫자 칸은 오른쪽 맞춤과 고정폭이다. 마우스를 올린 줄은 거의 흰 바탕(#fafbfc)으로 살짝 짚는다. 학생 명단, 출결 한 달 모아 보기, 학급운영비가 이 표를 쓴다. 운영비는 표 위에 받은 돈·쓴 돈·남은 돈 세 칸 요약(1.7rem 고정폭 금액)을 괘선으로 나눠 둔다.

### Privacy curtain and note log (관찰 기록)
관찰 기록은 들어올 때마다 내용 대신 가림막 한 단을 보인다. 빈 화면 제목 한 줄, 설명 한 단락, 큰 주 단추 '기록 보기'뿐이라 TV에 띄운 채 기록이 드러나지 않는다. 연 뒤에는 쪽 머리의 '가리기' 단추로 다시 덮고 5분 동안 손대지 않아도 저절로 덮인다. 기록은 왼쪽 학생 목록(줄 목록, 기록 수)과 오른쪽 기록 줄로 나뉜다. 줄마다 날짜·종류 꼬리표·학생 이름이 한 줄에 서고 오른쪽 끝에 '고치기' 작은 단추, 그 아래 1.08rem 본문이 이어진다.

### Game stages (게임 무대)
무대는 2px 먹선 아래 가운데 정렬로 한 가지 큰 글자만 둔다. 초성 낱말, 퀴즈 문장, 타이머 숫자는 Stage 크기이고 그 아래 1.4rem 연한 먹 보조 줄이 붙는다. OX는 답을 열 때 9rem 빨간 선 O·X가 나타난다. 업다운은 3rem 화살표 줄과 3단 숫자 자판(4.8rem 칸), 추측 기록 한 줄로 이루어진다. 10초 맞히기는 숫자를 감추는 동안 흐림 '?.??'를 보여 준다. 기록은 34rem 폭의 번호 붙은 줄 목록이다. 진행 단추는 무대 아래 가운데에 모이고 교사용 단추는 '크게 보기'에서 숨는다.

### Dialogs
2px 먹 테두리, 10px 모서리, 흰 바탕, 폭 최대 36rem. 머리는 1.3rem 800 제목과 오른쪽 닫기 아이콘 단추이며 2px 먹선으로 끝난다. 본문 양식은 두 단(긴 글칸과 넓은 칸은 한 단)이고 아래에 단추 줄이 붙는다. 열릴 때 1rem 아래에서 0.98배로 떠오른다(0.26초).

### Toast
화면 아래 가운데에 뜨는 먹색 띠, 흰 글자 600, 8px 모서리. 되돌리기 같은 행동은 흰 밑줄 글자로 둔다.

### 돌림판 (Signature, 뽑기 화면)
캔버스에 한 번 그려 두고 돌릴 때는 캔버스만 CSS로 회전한다. 바깥은 가는 먹 테와 굵은 먹 테 두 겹이고 칸 사이 먹선은 칸이 많아질수록 가늘어진다(36칸 초과 0.9px, 60칸 초과 0.6px). 가운데 먹색 원 '돌리기'가 주 행동이다. 바늘은 3시 방향의 빨간 조각이라 멈춘 칸 이름이 가로로 읽힌다. 칸 경계를 넘을 때마다 17도 튕겼다가 70ms 시간 상수로 잦아들며 똑딱 소리를 낸다. 버튼으로 돌리면 7도 뒤로 젖혔다가(0.17초) 약 5초 동안 감속하며 돈다. 손으로 휙 돌리면 놓는 순간의 속도를 이어받는다.

멈추면 뽑힌 칸만 흰색으로 남고 나머지 칸은 흐려지며 뽑힌 칸 안쪽에 빨간 '뽑힘' 도장이 찍힌다. 결과는 띄우는 창 없이 돌림판 아래 한 줄로 바로 나온다. 3.4rem 이름 옆에 'N번째' 도장을 서류의 '이름 (인)'처럼 나란히 찍고 그 옆에 '돌림판에서 빼기'(주 단추)와 '그대로 두기'(조용한 단추)를 둔다. 오른쪽 단에는 뽑힌 순서가 줄 목록으로 쌓인다.

### Motion
감속 곡선 `cubic-bezier(0.2, 0.8, 0.2, 1)`이 창·알림·목차 서랍·스위치에 공통으로 쓰인다. 도장은 `cubic-bezier(0.16, 1, 0.3, 1)`로 튀어 내려앉는다. 움직임 줄이기 설정에서는 애니메이션과 전환을 모두 끄고 바늘 튕김도 멈춘다.

## Do's and Don'ts

### Do:
- **Do** 빨강(stamp)은 도장·바늘·채점 O·X에만, 파랑(blue)은 손으로 남긴 표시·링크·초점에만 쓴다.
- **Do** 지금 고른 것과 지금 진행 중인 것 하나만 먹으로 채우고 지난 것은 흐림(dim)으로 물린다.
- **Do** 체크는 학생 이름 칸을 눌러 도장을 찍고 다시 눌러 지우는 한 가지 손동작으로 만든다.
- **Do** 도장은 이름이나 글자 옆에 나란히 찍는다. 글자 위에 겹치면 끝 음절 모음이 가려 '한수아'가 '한수이'로 읽힌다.
- **Do** 목록은 2px 먹선 아래 같은 문법의 줄로 채우고 줄 사이는 1px 괘선으로 나눈다.
- **Do** 숫자는 고정폭 숫자로 쓴다.
- **Do** 먹으로 채운 주 단추는 한 영역(쪽 머리, 창, 결과 줄)에 하나만 둔다.
- **Do** 새 글자 크기는 여덟 단계의 대표값을 rem으로 써서 clamp 뿌리 크기를 따라 TV에서 커지게 한다.
- **Do** 새 화면에는 '크게 보기'에서 키울 글자와 숨길 교사용 단추를 함께 정한다.

### Don't:
- **Don't** 기능이나 요약을 같은 크기 카드 타일로 바둑판처럼 늘어놓지 않는다. 구획은 괘선으로 나눈다. 학생 이름 칸을 바둑판으로 놓는 체크판은 출석부 칸이라 여기에 들지 않는다.
- **Don't** 오류, 경고, 모자란 금액, 시간 초과를 빨강으로 칠하지 않는다. 빨강은 확인됐다는 뜻 하나다.
- **Don't** 돌림판 칸에 무지개 원색을 칠하지 않는다. 흰색과 옅은 회색 농담만 쓴다.
- **Don't** 뽑힌 순간이나 다 끝난 순간에 색종이, 번쩍임, 게임쇼 같은 효과를 넣지 않는다. 축하는 소리와 도장이 맡는다.
- **Don't** 어두운 화면을 따로 만들지 않는다. 밝은 화면 하나다.
- **Don't** 두 번째 글꼴을 들이지 않는다.
- **Don't** 표, 목록 줄, 체크 칸, 단추, 입력칸에 그림자를 주지 않는다.
- **Don't** 아이콘 묶음이나 글리프 아이콘을 들이지 않는다. 필요한 선 아이콘은 같은 격자와 선 굵기로 직접 그린다.
