# NewWebPage — COCOBI 인터랙티브 사이트

[edolus.com](https://edolus.com) 의 연출(로딩 스플래시 → 히어로 → 스크롤로 이어지는 3D 장면 → 엔딩)을
코코비 세계관으로 다시 만든 페이지입니다. 캐릭터 이미지는 cocobi.net 캐릭터 페이지의 원본을 사용합니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173 (정식 빌드 화면)
npm run build    # dist/ = 정식 빌드, dist/test/ = 테스트 빌드
```

## 빌드 채널: 정식(`/`)과 테스트(`/test/`)

같은 코드에서 두 번 빌드합니다. 새 기능은 먼저 **테스트 빌드에서만 켜고**, 승인되면 정식 빌드에도 켭니다.

| 채널 | 주소 | 빌드 | 비고 |
| --- | --- | --- | --- |
| 정식 | `/` | `vite build` → `dist/` | 방문 분석 집계 |
| 테스트 | `/test/` | `vite build --mode test` → `dist/test/` | 탭 제목 `[TEST]`, 검색 제외(noindex), 분석 집계 안 함 |

- 기능 스위치: `src/channel.ts` 의 `FEATURES`
- **정식 승격** = 해당 스위치를 `true` 로 바꾼 뒤 배포 (예: 챗봇 → `chatbot: true`)
- 지금 테스트 빌드에만 있는 기능: 없음 (챗봇은 2026-10-13 정식 승격)

## 배포

| 플랫폼 | 주소 | 배포 방법 |
| --- | --- | --- |
| Vercel | https://kg-deploy1-git-main-imsunghwan.vercel.app (`/`, `/test/`) | GitHub `main` 에 푸시하면 자동. 루트 `vercel.json` 이 `NewWebPage` 를 빌드 |
| Cloudflare Workers `kg-deploy1` | https://kg-deploy1.kg-landing.workers.dev (`/`, `/test/`, `/stats`, `/admin`) | 이 폴더에서 `npm run deploy` |

챗봇·분석·관리자 API 는 Cloudflare Worker 에만 있고, Vercel 주소의 페이지도 이 Worker 를 부릅니다.
(저장소 루트의 `npm run deploy:cf` 는 같은 `kg-deploy1` 에 이전 Kigle 사이트를 올리므로 실행하지 마세요.)

## 비밀 설정 (`.env`)

`.env.example` 을 참고해 같은 폴더의 `.env` 에 값을 채우고(`.env` 는 git 에 안 올라감):

```bash
npm run secrets   # 값이 채워진 항목만 Cloudflare kg-deploy1 비밀 설정에 올림 (빈 항목은 건너뜀)
```

| 항목 | 용도 |
| --- | --- |
| `OPENAI_API_KEY` | 챗봇 모델 `gpt-5.6-terra` 호출 (없으면 등록된 질문·답변만으로 응답) |
| `TYPESAFE_API_KEY` | 감정 분석 TypeSafe Jev (없으면 감정 분석 없이 응답) |
| `ADMIN_PASSWORD` | 챗봇 관리자 페이지 `/admin` |
| `SMTP_USER` / `SMTP_PASS` | 대화 시작 알림 메일 — Gmail 주소와 Google 앱 비밀번호 (smtp.gmail.com:465) |
| `NOTIFY_TO` | 알림 받을 주소 (비우면 `SMTP_USER`) |
| `STATS_PASSWORD` | 방문 분석 `/stats` (이미 설정됨, 바꿀 때만) |

로컬 시험(`npx wrangler dev`)은 `.dev.vars` 의 값을 씁니다 (`.dev.vars` 도 git 에 안 올라감).
`.dev.vars` 에 `JEV_MOCK=1` 을 넣으면 Jev 키 없이 낱말로 흉내 내는 가짜 감정 분류로 시험할 수 있어요 (배포에는 넣지 말 것).

## 챗봇 (코코비 도우미) — 정식·테스트 빌드

- 화면: `src/components/ChatWidget.tsx` (우측 하단 버튼, `/api/chat` 호출)
- 대화 시작 전: 이름·이메일 + **개인정보 수집·이용 동의(필수 체크)** → `/api/chat/start`
  - 동의 안내문은 `ChatWidget.tsx` 의 `CONSENT_ITEMS`. 바꾸면 `worker/chat.ts` 의 `CONSENT_VERSION` 도 올릴 것 (대화마다 동의 시각·버전 저장)
  - 동의 기록이 없는 세션의 질문은 받지 않음
- 감정 분석 (TypeSafe Jev 로 분류 → OpenAI 로 응대, `worker/emotion.ts`)
  - 입력하는 동안 잠깐 멈출 때마다(0.7초) 지금까지 쓴 문장을 `/api/chat/emotion` 으로 보내 7가지 감정 확률을 기록
  - 질문을 보내면 그 문장도 분류해, `[사용자 이름]`·`[감정] 분노·짜증 65%, …`·`[대화 흐름] 평온 → 혼란 → 분노` 를 developer 메시지로 AI 에 함께 전달
  - 가장 높은 감정이 기준 비율 이상이면 답 첫머리에 정해진 첫마디(예: “기분이 많이 상하셨을 것 같아요.”). 등록된 답을 바로 보낼 때도 같은 첫마디와 이름을 붙임
  - 감정별 기준 비율·첫마디·말투, 분석 간격·상한은 관리자 '규칙 설정'에서 수정
- 서버: `worker/chat.ts` — 답하는 순서
  1. 차단된 방문자 → 차단 안내
  2. 너무 긴 질문, 분당·하루·대화당 질문 수 초과 → 제한 안내
  3. 지침 빼내기·탈옥 문구 → 거절 + 경고
  4. 의미 없는 입력(ㅋㅋㅋ, asdf…) → 안내 + 경고
  5. 같은 질문 반복 → 반복 안내 + 경고
  6. 인사·감사 → 정해진 인사
  7. 등록된 질문과 딱 맞음 → **등록된 답 그대로 (AI 호출 없음)**
  8. 그 밖 → AI 가 **등록된 질문·답변만 근거로** 판단·답변. 서비스 무관 / 지침 빼내기 /
     크레딧 낭비성(긴 글·시·노래 작성, N번 반복, 역할극, 끝말잇기, 말만 바꾼 반복, 대량 요청 반복)은 정해진 문구로 거절 + 경고
  - 하루 경고가 기준을 넘으면 정해진 시간 차단. AI 키가 없거나 하루·분당 호출 상한에 닿으면 등록된 답만으로 응답
- 관리자: https://kg-deploy1.kg-landing.workers.dev/admin (`ADMIN_PASSWORD`, 아이디는 아무거나)
  - 질문·답변(카테고리별) 작성·수정·삭제, 규칙·문구 설정, 대화 기록(이름·이메일·동의 시각·메시지별 감정·감정 흐름), 차단 해제, 연결 상태, 테스트 메일
  - 감정 분석 탭: 문장을 넣으면 바로 Jev 로 분류, 기간별 감정 분포, 부정적 감정 메시지 모아 보기
- 대화가 시작되면(첫 질문) SMTP 로 알림 메일: 시간, 이름·이메일, 감정, 나라·기기·언어, 접속 주소(테스트/정식), 첫 질문과 답
- 데이터: D1 `cocobi-analytics` 의 `faq_*`, `chat_*`(감정 기록 `chat_emotions` 포함), `settings` 테이블 (`worker/migrations/`)

## 방문 분석

- 분석 페이지: https://kg-deploy1.kg-landing.workers.dev/stats (비밀번호 필요, 아이디는 아무거나)
- 사이트(Vercel·Cloudflare 두 주소 모두)가 `src/analytics.ts` 로 이벤트를 보내면
  `worker/analytics.ts` 의 `/api/track` 이 Cloudflare D1(`cocobi-analytics`)에 저장합니다.
- 쿠키를 쓰지 않고, 방문자는 날마다 바뀌는 소금값 해시로만 구분합니다(이틀 뒤 소금값 삭제).
  개발 중(localhost)과 브라우저 '추적 안 함' 설정이면 보내지 않습니다.
- 비밀번호 설정·변경: 이 폴더에서 `npx wrangler secret put STATS_PASSWORD`
- 테이블 구조: `worker/migrations/` (변경 시 `npx wrangler d1 migrations apply cocobi-analytics --remote`)
- 테스트 빌드(`/test/`) 방문은 집계하지 않습니다.

## 장면 구성 (스크롤 = 화면 수)

| 구간 | 장면 | 파일 |
| --- | --- | --- |
| 0 – 1 | 히어로: 궤도에서 본 공룡 행성 | `src/three/SpaceStage.ts` |
| 1 – 3 | HELLO COCOBI: 코코 & 러비 | 〃 |
| 3 – 5.5 | 가족 별자리 (카드 클릭 → 상세) | 〃 |
| 5.5 – 6.6 | 구름 뚫고 하강 | 〃 |
| 6.6 – 9.4 | 공룡섬 지도 + 장소 핀 | `src/three/IslandStage.ts` |
| 9.4 – 15.0 | DINO STREET: 섬 안쪽 오솔길과 친구 8명의 게시판 | `src/three/VillageStage.ts` |
| 15.0 – 17.7 | 엔딩: 캐릭터 고리를 두른 행성 | `src/three/SpaceStage.ts` |

- 구간 경계와 장면 전환(흰색/검은색 가림막)은 `src/timeline.ts` 한 곳에서 관리합니다.
- 텍스트 등장/퇴장은 `src/choreo.ts` 가 매 프레임 스크롤 위치에 맞춰 갱신합니다.
- 캐릭터 이름·설명(KR/EN)과 장소 핀은 `src/content.ts` 에 있습니다.

## 에셋

- `public/characters/<id>.png` — 정사각 썸네일 (코코·로비는 투명 컷아웃)
- `public/characters/<id>-scene.png` — 캐릭터 상세 장면
- `public/brand/` — Hello Cocobi 로고, 단체 이미지
- 행성·섬·홀·리본 등 3D 요소는 이미지 없이 코드(셰이더/지오메트리)로 생성합니다.
