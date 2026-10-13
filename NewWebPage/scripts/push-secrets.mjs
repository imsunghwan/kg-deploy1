// .env 에서 값이 채워진 항목만 골라 Cloudflare(kg-deploy1) 비밀 설정에 올립니다.
// 빈 항목은 건너뛰어 이미 올라간 값을 지우지 않습니다. 화면에는 이름만 보여 주고 값은 출력하지 않습니다.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const ALLOWED = ['OPENAI_API_KEY', 'TYPESAFE_API_KEY', 'ADMIN_PASSWORD', 'STATS_PASSWORD', 'SMTP_USER', 'SMTP_PASS', 'NOTIFY_TO', 'SMTP_HOST', 'SMTP_PORT']

let text
try {
  text = readFileSync(new URL('../.env', import.meta.url), 'utf8')
} catch {
  console.error('.env 파일이 없어요. .env.example 을 복사해 .env 를 만들고 값을 채워 주세요.')
  process.exit(1)
}

const secrets = {}
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim()
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  const key = line.slice(0, i).trim()
  let value = line.slice(i + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
  if (!value) continue
  if (!ALLOWED.includes(key)) {
    console.warn(`  건너뜀: ${key} (알 수 없는 항목)`)
    continue
  }
  secrets[key] = value
}

const keys = Object.keys(secrets)
if (!keys.length) {
  console.log('.env 에 채워진 값이 없어요. 값을 넣은 뒤 다시 실행해 주세요.')
  process.exit(0)
}
console.log(`Cloudflare kg-deploy1 에 올릴 항목: ${keys.join(', ')}`)
const r = spawnSync('npx', ['wrangler', 'secret', 'bulk'], { input: JSON.stringify(secrets), stdio: ['pipe', 'inherit', 'inherit'] })
process.exit(r.status ?? 1)
