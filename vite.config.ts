import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// index.html 의 %SITE_URL% 을 배포 주소로 바꿉니다.
// 링크 미리보기(OG 이미지)는 https:// 로 시작하는 전체 주소여야 카카오톡·슬랙 등에서 보입니다.
//   SITE_URL=https://example.com npm run build   또는   .env.production 에 SITE_URL=... 추가
function siteUrl(url: string): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
  }
}

export default defineConfig(({ command, mode }) => {
  // loadEnv 는 .env 파일과 셸 환경 변수(SITE_URL=... npm run build)를 함께 읽음
  const env = loadEnv(mode, '.', '')
  const url = (env.SITE_URL ?? '').replace(/\/+$/, '')
  if (command === 'build' && !url) {
    console.warn('\n[site-url] SITE_URL 이 비어 있어 OG 이미지가 상대 주소로 들어갑니다. 배포 전에 설정하세요.\n')
  }
  return {
    plugins: [react(), tailwindcss(), siteUrl(url)],
  }
})
