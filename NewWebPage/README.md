# NewWebPage — COCOBI 인터랙티브 사이트

[edolus.com](https://edolus.com) 의 연출(로딩 스플래시 → 히어로 → 스크롤로 이어지는 3D 장면 → 엔딩)을
코코비 세계관으로 다시 만든 페이지입니다. 캐릭터 이미지는 cocobi.net 캐릭터 페이지의 원본을 사용합니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
```

## 배포

GitHub `imsunghwan/kg-deploy1` 저장소의 `main` 에 푸시하면 두 곳에 자동 배포됩니다.

| 플랫폼 | 프로젝트 | 루트 폴더 | 빌드 설정 |
| --- | --- | --- | --- |
| Cloudflare Workers | `kg-deploy1` (https://kg-deploy1.kg-landing.workers.dev) | `NewWebPage` | 빌드 `npm run build` → 배포 `npx wrangler deploy` (`wrangler.jsonc`) |
| Vercel | `kg-deploy1` (https://kg-deploy1-git-main-imsunghwan.vercel.app) | 저장소 루트 | 루트 `vercel.json` 이 `NewWebPage` 를 설치·빌드해 `NewWebPage/dist` 를 배포 |

이 폴더에서 `npm run deploy` 로 Cloudflare `kg-deploy1` 에 직접 올릴 수 있습니다.
(저장소 루트의 `npm run deploy:cf` 도 같은 `kg-deploy1` 에 이전 Kigle 사이트를 올리므로 실행하지 마세요.)

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
