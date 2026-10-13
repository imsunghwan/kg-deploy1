import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// index.html 의 %SITE_URL% 을 배포 주소로 바꿉니다.
// 링크 미리보기(OG 이미지)는 https:// 로 시작하는 전체 주소여야 카카오톡·슬랙 등에서 보입니다.
//   - Vercel: .env.production / .env.test 의 SITE_URL
//   - Cloudflare: package.json 의 deploy 스크립트가 SITE_URL 을 넘김 (환경 변수가 .env 보다 우선)
function siteUrl(url: string): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
  }
}

/** 테스트 빌드는 검색에 안 잡히게 하고, 탭 제목에 [TEST] 표시 */
function testChannel(): Plugin {
  return {
    name: 'test-channel',
    transformIndexHtml: (html) =>
      html
        .replace('<title>', '<title>[TEST] ')
        .replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>'),
  }
}

// 빌드 채널 (src/channel.ts 참고)
//   vite build              → 정식 빌드  dist/        (주소 /)
//   vite build --mode test  → 테스트 빌드 dist/test/   (주소 /test/)
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '')
  const url = (env.SITE_URL ?? '').replace(/\/+$/, '')
  const test = mode === 'test'
  if (command === 'build' && !url) {
    console.warn('\n[site-url] SITE_URL 이 비어 있어 OG 이미지가 상대 주소로 들어갑니다.\n')
  }
  return {
    base: test ? '/test/' : '/',
    // 테스트 빌드는 이미지 등 public 파일을 정식 빌드와 같이 쓰므로 다시 복사하지 않음
    publicDir: test ? false : 'public',
    plugins: [react(), siteUrl(url), ...(test ? [testChannel()] : [])],
    build: {
      outDir: test ? 'dist/test' : 'dist',
      // three.js 가 포함된 단일 번들(약 235KB gzip)이라 기본 경고 기준을 올려 둡니다
      chunkSizeWarningLimit: 1000,
    },
  }
})
