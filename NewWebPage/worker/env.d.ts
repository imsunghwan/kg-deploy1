// wrangler 는 .html 을 문자열 모듈로 묶어 줍니다
declare module '*.html' {
  const html: string
  export default html
}
