import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// index.html 의 %SITE_URL% 을 배포 주소로 바꿉니다.
// 링크 미리보기(OG 이미지)는 https:// 로 시작하는 전체 주소여야 카카오톡·슬랙 등에서 보입니다.
//   - Vercel: .env.production 의 SITE_URL
//   - Cloudflare: package.json 의 deploy 스크립트가 SITE_URL 을 넘김 (환경 변수가 .env 보다 우선)
function siteUrl(url: string): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '')
  const url = (env.SITE_URL ?? '').replace(/\/+$/, '')
  if (command === 'build' && !url) {
    console.warn('\n[site-url] SITE_URL 이 비어 있어 OG 이미지가 상대 주소로 들어갑니다.\n')
  }
  return {
    plugins: [react(), siteUrl(url)],
    // three.js 가 포함된 단일 번들(약 235KB gzip)이라 기본 경고 기준을 올려 둡니다
    build: { chunkSizeWarningLimit: 1000 },
  }
})
