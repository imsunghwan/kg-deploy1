-- 방문 분석 이벤트 (쿠키·개인정보 없음)
-- visitor: 매일 바뀌는 무작위 소금값으로 만든 해시 → 같은 날 같은 방문자만 묶이고 개인은 식별 불가
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,     -- 기록 시각 (ms)
  day TEXT NOT NULL,       -- 한국 시간 기준 날짜 YYYY-MM-DD
  session TEXT NOT NULL,   -- 페이지를 한 번 열 때마다 새로 만드는 무작위 값
  visitor TEXT NOT NULL,
  type TEXT NOT NULL,      -- view | chapter | character | constellation | lang | link | time
  name TEXT,               -- 장 id, 캐릭터 id, 링크 이름 등
  value REAL,              -- time: 머문 초
  host TEXT,               -- 접속 주소 (Vercel / Cloudflare)
  ref TEXT,                -- 유입 경로
  country TEXT,
  device TEXT,             -- mobile | tablet | desktop
  lang TEXT                -- ko | en
);
CREATE INDEX idx_events_day_type ON events (day, type);
CREATE INDEX idx_events_session ON events (session, ts);

-- 날마다 새로 만드는 해시용 소금값 (이틀 지나면 지워서 지난 해시를 되돌릴 수 없게)
CREATE TABLE salts (
  day TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);
