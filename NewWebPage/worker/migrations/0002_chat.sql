-- 챗봇: 관리자가 관리하는 질문·답변(카테고리별), 대화 기록, 차단 목록, 규칙 설정

CREATE TABLE faq_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE faq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES faq_categories (id) ON DELETE SET NULL,
  question TEXT NOT NULL,            -- 대표 질문
  answer TEXT NOT NULL,              -- 챗봇이 그대로 또는 근거로 쓰는 답
  keywords TEXT NOT NULL DEFAULT '', -- 쉼표로 구분. 바로 답하기(모델 호출 없음) 판단에 사용
  enabled INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_faq_items_category ON faq_items (category_id, sort);

-- 대화 한 번(채팅 창을 연 페이지 한 번) 단위
CREATE TABLE chat_sessions (
  session TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,       -- 날마다 바뀌는 익명 해시 (분석과 같은 방식)
  started_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  host TEXT,
  channel TEXT,                -- test | prod
  country TEXT,
  device TEXT,
  lang TEXT,
  messages INTEGER NOT NULL DEFAULT 0,
  flagged INTEGER NOT NULL DEFAULT 0,  -- 규칙 위반이 있었던 대화
  notified INTEGER NOT NULL DEFAULT 0  -- 시작 알림 메일 보냄
);
CREATE INDEX idx_chat_sessions_started ON chat_sessions (started_at);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT NOT NULL,
  visitor TEXT NOT NULL,
  ts INTEGER NOT NULL,
  role TEXT NOT NULL,          -- user | bot
  content TEXT NOT NULL,
  source TEXT,                 -- bot: faq(바로 답) | llm | rule(규칙으로 거절) | limit | blocked | fallback
  verdict TEXT,                -- user: ok | off_topic | injection | spam | abuse | repeat
  faq_id INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER
);
CREATE INDEX idx_chat_messages_session ON chat_messages (session, ts);
CREATE INDEX idx_chat_messages_visitor ON chat_messages (visitor, ts);
CREATE INDEX idx_chat_messages_ts ON chat_messages (ts);

CREATE TABLE chat_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor TEXT NOT NULL,
  until INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_chat_blocks_visitor ON chat_blocks (visitor, until);

-- 규칙·문구 설정 (관리자 페이지에서 수정). 값은 JSON
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
