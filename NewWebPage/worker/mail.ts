/**
 * SMTP 로 알림 메일 보내기 (기본: Gmail smtp.gmail.com:465, TLS)
 * 필요한 비밀 설정: SMTP_USER(보내는 주소), SMTP_PASS(Google 앱 비밀번호)
 * 선택: SMTP_HOST, SMTP_PORT(465=TLS, 587=STARTTLS), NOTIFY_TO(받는 주소, 없으면 SMTP_USER)
 */
import { connect } from 'cloudflare:sockets'
import type { Env } from './shared'

export function mailConfigured(env: Env) {
  return !!(env.SMTP_USER && env.SMTP_PASS)
}

/** UTF-8 문자열 → base64 */
function b64(s: string) {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

const dec = new TextDecoder()
const enc = new TextEncoder()

/** 아주 작은 SMTP 대화 도구: 명령을 보내고 응답 코드를 확인 */
class Smtp {
  private buf = ''
  constructor(
    private reader: ReadableStreamDefaultReader<Uint8Array>,
    private writer: WritableStreamDefaultWriter<Uint8Array>,
  ) {}

  /** 여러 줄 응답(250-...)을 마지막 줄(250 ...)까지 읽음 */
  async read() {
    for (;;) {
      const lines = this.buf.split('\r\n')
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          this.buf = lines.slice(i + 1).join('\r\n')
          return { code: parseInt(lines[i], 10), text: lines.slice(0, i + 1).join(' / ') }
        }
      }
      const { value, done } = await this.reader.read()
      if (done) throw new Error('SMTP 서버 연결이 끊겼어요')
      this.buf += dec.decode(value, { stream: true })
    }
  }

  async send(line: string, expect: number[], label = line) {
    await this.writer.write(enc.encode(`${line}\r\n`))
    const r = await this.read()
    if (!expect.includes(r.code)) throw new Error(`SMTP ${label} 실패: ${r.text.slice(0, 200)}`)
    return r
  }
}

export async function sendMail(env: Env, subject: string, text: string) {
  if (!mailConfigured(env)) throw new Error('메일 설정(SMTP_USER, SMTP_PASS)이 아직 없습니다.')
  const host = env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(env.SMTP_PORT || 465)
  const user = env.SMTP_USER!.trim()
  // Google 앱 비밀번호는 4글자씩 띄어 쓴 형태로 보이므로 공백 제거
  const pass = env.SMTP_PASS!.replace(/\s+/g, '')
  const to = (env.NOTIFY_TO || user).trim()

  const socket = connect({ hostname: host, port }, { secureTransport: port === 465 ? 'on' : 'starttls', allowHalfOpen: false })
  const run = async () => {
    let reader = socket.readable.getReader()
    let writer = socket.writable.getWriter()
    let smtp = new Smtp(reader, writer)
    const greet = await smtp.read()
    if (greet.code !== 220) throw new Error(`SMTP 연결 실패: ${greet.text.slice(0, 200)}`)
    await smtp.send('EHLO kg-deploy1.workers.dev', [250], 'EHLO')
    if (port !== 465) {
      // 587: 평문으로 시작해 TLS 로 전환
      await smtp.send('STARTTLS', [220], 'STARTTLS')
      reader.releaseLock()
      writer.releaseLock()
      const tls = socket.startTls()
      reader = tls.readable.getReader()
      writer = tls.writable.getWriter()
      smtp = new Smtp(reader, writer)
      await smtp.send('EHLO kg-deploy1.workers.dev', [250], 'EHLO')
    }
    await smtp.send('AUTH LOGIN', [334], 'AUTH')
    await smtp.send(b64(user), [334], '로그인(아이디)')
    await smtp.send(b64(pass), [235], '로그인(앱 비밀번호)')
    await smtp.send(`MAIL FROM:<${user}>`, [250], 'MAIL FROM')
    await smtp.send(`RCPT TO:<${to}>`, [250, 251], 'RCPT TO')
    await smtp.send('DATA', [354], 'DATA')
    const message = [
      `From: =?UTF-8?B?${b64('코코비 챗봇')}?= <${user}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${crypto.randomUUID()}@kg-deploy1.workers.dev>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(text).replace(/.{76}/g, '$&\r\n'),
      '.',
    ].join('\r\n')
    await smtp.send(message, [250], '본문 전송')
    await smtp.send('QUIT', [221], 'QUIT').catch(() => undefined)
  }
  try {
    // 응답이 없을 때 무한정 기다리지 않도록 20초 제한
    await Promise.race([run(), new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP 응답 시간 초과')), 20_000))])
  } finally {
    socket.close().catch(() => undefined)
  }
}
