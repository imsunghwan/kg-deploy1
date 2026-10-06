// 사이트의 모든 문구와 이미지 경로를 한곳에서 관리합니다.
// 서비스 소개 페이지로 바꿀 때는 이 파일부터 수정하면 됩니다.

export const BRAND = {
  mark: 'Kigle.',
  tagline: '우리는 Kigle 입니다!',
  credits: 'Designed and Developed by Im Sunghwan',
  year: 2026,
}

export const NAV = [
  { label: 'about kigle', to: '/about', angle: -0.45 },
  { label: 'about me', to: '/me', angle: 0 },
  { label: 'showcase', to: '/showcase', angle: 0.45 },
]

const img = (name: string) => `/images/${name}.webp`

export const IMAGES = {
  texture: img('texture-concrete'),
  aboutHero: img('about-hero-playground'), // 사용자가 제공한 코코비 공식 배너 (1903×520). 팀 카드 컷은 이전 이미지(about-hero-cocobi)에서 오린 것
  objectHero: img('object-hero'),
  object1: img('object-1'),
  object2: img('object-2'),
  object3: img('object-3'),
  object4: img('object-4'),
}

export const ABOUT = {
  label: '[about]',
  title: ['아이들의 첫 번째 놀이터'],
  lead:
    "키글의 미션은 아이들을 위한 즐겁고 상상력 넘치는 서비스로 '전 세계 아이들의 첫 번째 놀이터'를 만드는 것입니다.",
}

// about kigle 페이지의 팀 카드 (이미지: scripts/imagegen-teams.jsonl 로 생성)
// 사용자가 제공한 코코비 공식 이미지에서 원본 픽셀 그대로 오려낸 컷 (public/cocobi/cut-*.webp)
// width: 카드 너비 대비 크기(%)
export const BUDDIES = {
  duo: { src: '/cocobi/cut-duo.webp', width: 62 },
  glasses: { src: '/cocobi/cut-glasses.webp', width: 30 },
  little: { src: '/cocobi/cut-little.webp', width: 27 },
}
export const HEARTS = ['/cocobi/heart-gold.webp', '/cocobi/heart-red.webp', '/cocobi/heart-pink.webp']

type Buddy = keyof typeof BUDDIES

// about kigle 페이지의 팀 카드 (이미지: scripts/imagegen-teams.jsonl 로 생성)
// id: 조직도에서 카드로 이동할 때 쓰는 앵커 (#team-<id>)
// buddy/side: 카드 아래 모서리에서 빼꼼 내다보는 코코비 캐릭터와 위치
export const TEAMS = {
  title: ['한 팀처럼 움직이는', 'CEO와 아홉 개의 팀'],
  list: [
    { name: '개발팀', en: 'Development', id: 'dev', image: img('team-dev'), buddy: 'glasses' as Buddy, side: 'right' as const },
    { name: '앱디자인팀', en: 'App Design', id: 'design', image: img('team-design'), buddy: 'little' as Buddy, side: 'left' as const },
    { name: '앱기획팀', en: 'App Planning', id: 'planning', image: img('team-planning'), buddy: 'duo' as Buddy, side: 'right' as const },
    { name: '앱사업팀', en: 'App Business', id: 'business', image: img('team-business'), buddy: 'glasses' as Buddy, side: 'left' as const },
    { name: '애니메이션팀', en: 'Animation', id: 'animation', image: img('team-animation'), buddy: 'little' as Buddy, side: 'right' as const },
    { name: '뉴미디어팀', en: 'New Media', id: 'media', image: img('team-media'), buddy: 'duo' as Buddy, side: 'left' as const },
    { name: '글로벌팀', en: 'Global', id: 'global', image: img('team-global'), buddy: 'glasses' as Buddy, side: 'right' as const },
    { name: '경영지원팀', en: 'Management Support', id: 'support', image: img('team-support'), buddy: 'little' as Buddy, side: 'left' as const },
    { name: '업무지원팀', en: 'Operations Support', id: 'ops', image: img('team-ops'), buddy: 'duo' as Buddy, side: 'right' as const },
  ],
}

// about kigle 페이지 하단 조직도. 팀 목록은 TEAMS.list 를 그대로 사용합니다.
export const ORG = {
  title: ['키글의 조직'],
  // avatar: 사용자가 제공한 코코비 공식 이미지 (189px, 모서리 투명). 레티나에서도 선명하도록 최대 94px 로 표시
  ceo: { id: 'ceo', name: '대표이사', en: 'CEO', avatar: '/cocobi/ceo-avatar.webp' },
}

export const OBJECT = {
  label: '[the object]',
  title: ['A solid form for', 'work that lasts'],
  lead:
    'Cast in mineral composite and finished by hand, the object turns a digital milestone into something you can hold, weigh and keep on a shelf.',
  paragraphs: [
    'Its proportions come straight from the mark: a single upright volume with the name carved into its face, catching light only where the edges break.',
    'Each piece is poured in small batches, cured slowly and sealed with a matte coating so the surface keeps its raw, stone-like texture.',
  ],
  cta: { label: 'Read the making-of', href: '#' },
}

// icon: 정사각형 앱 아이콘처럼 잘리지 않고 컬러 그대로 보여야 하는 이미지
// variants: 한 프로젝트의 여러 시안. 카드에는 겹쳐서, 모달에는 나란히 보여줍니다. (첫 번째가 대표)
export type Work = {
  title: string
  category: string
  image: string
  link: string
  icon?: boolean
  variants?: { label: string; image: string }[]
}

const work = (n: number, category: string, title: string): Work => ({
  category,
  title,
  image: img(`work-${n}`),
  link: '#',
})

export const SHOWCASE = {
  label: '[showcase]',
  title: ['Coming soon'],
  years: {
    [BRAND.year]: [
      {
        category: '', // 비우면 이름만 굵게 한 줄로 표시됩니다
        title: '코코비 꼬마몬스터병원',
        image: img('monster-hospital-a'),
        link: '#',
        icon: true,
        variants: [
          { label: 'A · 탑재', image: img('monster-hospital-a') },
          { label: 'B', image: img('monster-hospital-b') },
          { label: 'C', image: img('monster-hospital-c') },
        ],
      },
    ],
  } as Record<number, Work[]>,
}

// ---------- 코코비 공식 이미지 ----------
// 회사에서 받은 공식 코코비 이미지(배경이 투명한 PNG 권장)를 public/cocobi/ 에 아래 이름으로 넣으면
// 페이지에 바로 표시됩니다. 파일이 없으면 자리 표시 박스가 보입니다.
// ※ 코코비는 저작권이 있는 캐릭터라 AI로 생성하지 않고, 공식 에셋만 사용합니다.
const cocobi = (name: string) => `/cocobi/${name}.png`

export const COCOBI = {
  teamHero: { src: cocobi('team-hero'), hint: '코코비 캐릭터들이 함께 노트북 앞에 모인 장면 (가로형)' }, // 사용자가 제공한 공식 이미지 (800×400)
  avatar: { src: cocobi('avatar'), hint: '내 자기소개에 쓸 최애 코코비 캐릭터' }, // 사용자가 제공한 공식 이미지 (256×301, 투명 배경)
}

// ---------- about me 페이지 (개발팀 + 자기소개) ----------
export const ME = {
  label: '[about me]',
  title: ['코코비와 함께', '코드를 짓는 개발자'],
  // 히어로 터미널 카드에 한 줄씩 타이핑됩니다
  terminal: [
    '$ git pull origin main',
    '$ npm run build -- --target=cocobi-app',
    '✓ 화면 42개 빌드 완료',
    '$ deploy --env production',
    '✓ 오늘도 코코비 친구들에게 무사히 도착!',
  ],
}

// ---------- 자기소개 페이지 ----------
// [대괄호] 표시된 곳을 본인 정보로 바꿔주세요.
export const PROFILE = {
  name: '임성환',
  nameEn: '', // 영문 이름. 비우면 표시하지 않습니다.
  role: '개발자',
  team: '(주)키글 개발팀',
  // 아래 항목들은 비워두면 해당 카드가 숨겨집니다. 채우면 다시 나타납니다.
  oneLiner: '',
  location: '', // 예: 'Seoul, KR'
  status: '', // 예: '코코비 앱 리뉴얼 작업 중'
  photo: '', // 프로필 사진 경로 (예: /me/profile.jpg). 비워두면 코코비 아바타 자리가 보입니다.
  stack: [] as string[], // 예: ['TypeScript', 'React']
  now: [] as { label: string; value: string }[], // 예: [{ label: 'Building', value: '...' }]
  career: [] as { period: string; title: string; place: string }[],
  stats: [] as { value: string; label: string }[], // 예: [{ value: '5', label: '년차' }]
  links: [] as { label: string; href: string }[],
  funFacts: ['귀여운 것이 세상을 구한다'] as string[],
}
