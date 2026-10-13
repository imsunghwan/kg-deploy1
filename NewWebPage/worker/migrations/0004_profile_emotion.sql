-- 대화 시작 전 이름·이메일·동의, 그리고 Jev 감정 분석 결과

ALTER TABLE chat_sessions ADD COLUMN name TEXT;
ALTER TABLE chat_sessions ADD COLUMN email TEXT;
ALTER TABLE chat_sessions ADD COLUMN consent_at INTEGER;     -- 개인정보 수집·이용 동의 시각
ALTER TABLE chat_sessions ADD COLUMN consent_version TEXT;   -- 동의한 안내문 버전
ALTER TABLE chat_sessions ADD COLUMN emotion TEXT;           -- 대화 전체에서 가장 두드러진 감정
ALTER TABLE chat_sessions ADD COLUMN emotion_probs TEXT;     -- 대화 전체 감정 비율 (JSON)

ALTER TABLE chat_messages ADD COLUMN emotion TEXT;           -- 이 메시지의 가장 높은 감정
ALTER TABLE chat_messages ADD COLUMN emotion_probs TEXT;     -- 감정별 확률 (JSON)

-- 입력하는 동안·보낼 때마다 Jev 가 분류한 감정 기록 (대화 흐름 파악용)
CREATE TABLE chat_emotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT NOT NULL,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,          -- typing(입력 중) | message(보낸 메시지)
  text_hash TEXT NOT NULL,     -- 같은 문장을 다시 분류하지 않도록
  text_len INTEGER NOT NULL,
  top TEXT NOT NULL,
  prob REAL NOT NULL,
  probs TEXT NOT NULL,
  confidence REAL
);
CREATE INDEX idx_chat_emotions_session ON chat_emotions (session, ts);
CREATE INDEX idx_chat_emotions_ts ON chat_emotions (ts);

-- 이제 이름·이메일을 받으므로 기본 '개인정보' 안내 답변 갱신 (관리자가 이미 고쳤으면 그대로 둠)
UPDATE faq_items
SET answer = '대화를 시작할 때 동의를 받고 이름과 이메일을 받아요. 이름은 대화 중에 불러 드리고, 이메일은 문의에 답할 때만 써요. 대화 내용과 입력 중 문장의 감정 분석 결과는 상담 응대와 서비스 개선에 쓰이고, 답변 생성(OpenAI)과 감정 분석(TypeSafe)을 위해 미국 서버로 전송돼요. 삭제를 원하시면 biz@kiglestudio.com 으로 알려 주세요. 방문 통계는 쿠키 없이 익명으로만 집계해요.',
    updated_at = 0
WHERE question = '개인정보를 수집하나요?'
  AND answer LIKE '이 사이트는 쿠키를 쓰지 않아요.%';
