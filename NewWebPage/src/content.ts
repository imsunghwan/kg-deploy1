export type Lang = 'ko' | 'en'
export type Group = 'siblings' | 'family' | 'friends'

export interface Character {
  id: string
  group: Group
  name: { ko: string; en: string }
  role: { ko: string; en: string }
  species: { ko: string; en: string }
  age?: number
  trait: { ko: string; en: string }
  desc: { ko: string; en: string }
  /** 원본 사이트의 상세 카드 배경색 */
  color: string
  /** 정사각 썸네일 (투명 배경 컷아웃이면 cutout: true) */
  portrait: string
  scene?: string
  cutout?: boolean
}

const img = (id: string) => `/characters/${id}.png`
const scene = (id: string) => `/characters/${id}-scene.png`

// 이름·설명은 cocobi.net 원본(KR/EN)에서 가져왔습니다.
// 코코·러비는 메인 페이지, 나머지는 캐릭터 페이지의 문구입니다. (한글 표기: Lobi = 러비)
export const characters: Character[] = [
  {
    id: 'coco',
    group: 'siblings',
    name: { ko: '코코', en: 'Coco' },
    role: { ko: '누나', en: 'Big sister' },
    species: { ko: '꼬마공룡', en: 'Little dino' },
    age: 6,
    trait: { ko: '씩씩한 골목대장', en: 'Natural-born leader' },
    desc: {
      ko: '6살 코코는 씩씩한 골목대장이에요. 엄마, 아빠, 남동생 러비와 함께 살고 있죠. 춤추고 노래하는 것을 좋아한답니다!',
      en: '6-year-old Coco is a natural-born leader. She lives with her mom, dad, and little brother Lobi. Coco loves to sing and dance!',
    },
    color: '#ff5fa2',
    portrait: img('coco'),
    cutout: true,
  },
  {
    id: 'lobi',
    group: 'siblings',
    name: { ko: '러비', en: 'Lobi' },
    role: { ko: '남동생', en: 'Little brother' },
    species: { ko: '꼬마공룡', en: 'Little dino' },
    age: 4,
    trait: { ko: '솔직한 귀염둥이', en: 'Honest & adorable' },
    desc: {
      ko: '4살 러비는 솔직한 귀염둥이예요. 식성이 좋아 무엇이든 다 잘 먹는답니다! 러비는 자신을 챙겨주는 누나 코코를 엄청 사랑해요.',
      en: '4-year-old Lobi is an honest and adorable boy. He loves to eat and adores his older sister Coco who always has his back.',
    },
    color: '#ffc61a',
    portrait: img('lobi'),
    cutout: true,
  },
  {
    id: 'donna',
    group: 'family',
    name: { ko: '도나', en: 'Donna' },
    role: { ko: '엄마', en: 'Mommy' },
    species: { ko: '마이아사우라', en: 'Maiasaura' },
    trait: { ko: '정리정돈', en: 'Organizing' },
    desc: {
      ko: '엄마 도나는 마이아사우라로 코코비 가족 중 가장 현명해요. 정리정돈을 잘하지만 요리 솜씨는 별로 좋지 않답니다.',
      en: 'Mommy Donna is a Maiasaura and she is the wisest of the Cocobi family. Donna is not a very good cook but she’s great at organizing!',
    },
    color: '#00a695',
    portrait: img('donna'),
    scene: scene('donna'),
  },
  {
    id: 'bob',
    group: 'family',
    name: { ko: '밥', en: 'Bob' },
    role: { ko: '아빠', en: 'Daddy' },
    species: { ko: '알로사우루스', en: 'Allosaurus' },
    trait: { ko: '연기·상상력', en: 'Acting' },
    desc: {
      ko: '아빠 밥은 알로사우루스로 코코비 가족의 분위기 메이커예요. 상상력이 풍부하고 연기력이 좋아 코코비 남매와 잘 놀아주신답니다.',
      en: 'Daddy Bob is an Allosaurus, and the kids love to play with him. He is fun, imaginative, and has a talent for acting.',
    },
    color: '#3f43eb',
    portrait: img('bob'),
    scene: scene('bob'),
  },
  {
    id: 'lala',
    group: 'family',
    name: { ko: '라라', en: 'Lala' },
    role: { ko: '막내', en: 'Baby' },
    species: { ko: '???', en: '???' },
    trait: { ko: '미스터리 파워', en: 'Mystery power' },
    desc: {
      ko: '라라는 코코비 가족의 막내로 유일하게 몸 색깔이 다르답니다. 미스터리한 막내 라라에게는 어떤 능력이 숨겨져 있을까요?',
      en: 'Baby Lala is a unique member of the family. She is the only red dino in her family and shows signs of having mysterious powers!',
    },
    color: '#e64614',
    portrait: img('lala'),
    scene: scene('lala'),
  },
  {
    id: 'george',
    group: 'family',
    name: { ko: '조지', en: 'George' },
    role: { ko: '할아버지', en: 'Grandpa' },
    species: { ko: '마이아사우라', en: 'Maiasaura' },
    trait: { ko: '손재주·낚시', en: 'Craftsman' },
    desc: {
      ko: '할아버지 조지는 마이아사우라로 낚시터를 운영하고 있어요. 손재주가 좋아서 코코비가 원하는 걸 뚝딱뚝딱 만들어 주신답니다.',
      en: 'Grandpa George is a Maiasaura and runs a fishing site on the island. He’s a great craftsman and loves to make things for his grandkids.',
    },
    color: '#16127b',
    portrait: img('george'),
    scene: scene('george'),
  },
  {
    id: 'martha',
    group: 'family',
    name: { ko: '마샤', en: 'Martha' },
    role: { ko: '할머니', en: 'Grandma' },
    species: { ko: '마이아사우라', en: 'Maiasaura' },
    trait: { ko: '텃밭·요리', en: 'Gardening' },
    desc: {
      ko: '마이아사우라 마샤는 코코비의 지혜로운 할머니예요. 텃밭에서 가꾼 채소들로 가족들에게 맛있는 요리를 해주시기도 해요.',
      en: 'Grandma Martha is a wise Maiasaura. She loves gardening and cooks delicious meals for the family.',
    },
    color: '#8e033a',
    portrait: img('martha'),
    scene: scene('martha'),
  },
  {
    id: 'sean',
    group: 'family',
    name: { ko: '션', en: 'Sean' },
    role: { ko: '삼촌', en: 'Uncle' },
    species: { ko: '알로사우루스', en: 'Allosaurus' },
    trait: { ko: '서핑·캠핑', en: 'Surfing' },
    desc: {
      ko: '삼촌 션은 알로사우루스로 서핑샵을 운영하고 있어요. 코코비를 데리고 캠핑을 다니기도 하는 멋진 삼촌이랍니다.',
      en: 'Uncle Sean is an Allosaurus and runs a surfing shop on the island. He’s an awesome uncle who loves to go camping with Coco and Lobi.',
    },
    color: '#00875c',
    portrait: img('sean'),
    scene: scene('sean'),
  },
  {
    id: 'jackjack',
    group: 'friends',
    name: { ko: '잭잭', en: 'Jack Jack' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '티라노사우루스', en: 'Tyrannosaurus' },
    age: 4,
    trait: { ko: '엄청난 힘', en: 'Super strong' },
    desc: {
      ko: '잭잭은 4살 티라노사우루스로 소심하고 수줍음이 많은 성격이랍니다. 하지만 힘이 엄청 세서 화를 내면 아무도 말리지 못 해요.',
      en: '4-year-old Jack Jack is a shy Tyrannosaurus. But don’t make him angry because he is super strong!',
    },
    color: '#930aa7',
    portrait: img('jackjack'),
    scene: scene('jackjack'),
  },
  {
    id: 'bell',
    group: 'friends',
    name: { ko: '벨', en: 'Bell' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '벨로시랩터', en: 'Velociraptor' },
    age: 4,
    trait: { ko: '만능 스포츠', en: 'Sports' },
    desc: {
      ko: '4살 벨로시랩터 벨은 보이쉬한 매력의 소유자예요. 축구, 농구, 야구 등 모든 운동을 잘하지만 그림은 잘 못 그린답니다.',
      en: '4-year-old Bell is a tomboy Velociraptor. Bell is a terrible artist! But she’s great at sports like soccer, basketball, baseball, and more.',
    },
    color: '#dc3537',
    portrait: img('bell'),
    scene: scene('bell'),
  },
  {
    id: 'rou',
    group: 'friends',
    name: { ko: '루', en: 'Rou' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '브라키오사우루스', en: 'Brachiosaurus' },
    age: 4,
    trait: { ko: '다정함', en: 'Kindness' },
    desc: {
      ko: '루는 4살 브라키오사우루스예요. 행동이 느리지만 착해서 친구들과 사이좋게 잘 지낸답니다.',
      en: '4-year-old Rou is a Brachiosaurus. He is slow like a sloth but he is a great friend and everyone adores him.',
    },
    color: '#06a11c',
    portrait: img('rou'),
    scene: scene('rou'),
  },
  {
    id: 'tom',
    group: 'friends',
    name: { ko: '톰', en: 'Tom' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '트리케라톱스', en: 'Triceratops' },
    age: 6,
    trait: { ko: '기억력', en: 'Memory' },
    desc: {
      ko: '6살 톰은 트리케라톱스로 기억력이 좋고 똑똑한 여자아이예요. 가수 방탄공룡단(BDS)의 열렬한 팬이랍니다.',
      en: '6-year-old Tom is a super smart Triceratops with an exceptional memory. She is a loyal fan of BDS, the Bangtan Dinosaurs pop stars.',
    },
    color: '#ab61ff',
    portrait: img('tom'),
    scene: scene('tom'),
  },
  {
    id: 'nico',
    group: 'friends',
    name: { ko: '니코', en: 'Nico' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '벨로시랩터', en: 'Velociraptor' },
    age: 6,
    trait: { ko: '시크·인기', en: 'Cool' },
    desc: {
      ko: '6살 벨로시랩터 니코는 벨의 오빠예요. 지적이고 시크한 성격의 소유자로 학교에서 인기가 많답니다.',
      en: 'Nico the Velociraptor is Bell’s older brother. Nico is popular in school because he is both smart and cool.',
    },
    color: '#1155e1',
    portrait: img('nico'),
    scene: scene('nico'),
  },
  {
    id: 'jackson',
    group: 'friends',
    name: { ko: '잭슨', en: 'Jackson' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '티라노사우루스', en: 'Tyrannosaurus' },
    age: 6,
    trait: { ko: '열정', en: 'Energy' },
    desc: {
      ko: '6살 티라노사우루스 잭슨은 잭잭의 형이에요. 단순하고 열정 넘치는 성격으로 니코를 라이벌로 생각하고 있어요.',
      en: 'Jackson the Tyrannosaurus is Jack Jack’s older brother. He is super energetic and secretly thinks of Nico as his rival.',
    },
    color: '#454141',
    portrait: img('jackson'),
    scene: scene('jackson'),
  },
  {
    id: 'elon',
    group: 'friends',
    name: { ko: '엘론', en: 'Elon' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '스테고사우루스', en: 'Stegosaurus' },
    age: 4,
    trait: { ko: '발명', en: 'Inventing' },
    desc: {
      ko: '4살 스테고사우루스 엘론은 칭찬을 좋아하는 꼬마발명가예요. 똑똑하고 자존심이 세서 남에게 지는 걸 싫어해요.',
      en: '4-year-old Stegosaurus Elon is a clever inventor who loves compliments. He is rather proud and hates to lose.',
    },
    color: '#861ce8',
    portrait: img('elon'),
    scene: scene('elon'),
  },
  {
    id: 'pinky',
    group: 'friends',
    name: { ko: '핑키', en: 'Pinky' },
    role: { ko: '친구', en: 'Friend' },
    species: { ko: '시조새', en: 'Archaeopteryx' },
    age: 6,
    trait: { ko: '패션', en: 'Fashion' },
    desc: {
      ko: '핑키는 6살 시조새예요. 패션감각이 뛰어난 수다쟁이랍니다.',
      en: '6-year-old Pinky is a bird dinosaur. She is a chatterbox with a great sense of style and fashion!',
    },
    color: '#ff61ee',
    portrait: img('pinky'),
    scene: scene('pinky'),
  },
]

export const byId = Object.fromEntries(characters.map((c) => [c.id, c])) as Record<string, Character>
export const siblings = characters.filter((c) => c.group === 'siblings')
export const family = characters.filter((c) => c.group === 'family')
export const friends = characters.filter((c) => c.group === 'friends')

/** 공룡섬 지도 위 장소 핀. pos 는 섬 좌표(x, z) */
export const places = [
  { id: 'home', chars: ['coco', 'lobi'], pos: [-6, 4] as const, ko: '코코비네 집', en: 'Cocobi House' },
  { id: 'fishing', chars: ['george'], pos: [-27, -14] as const, ko: '조지 할아버지 낚시터', en: 'George’s Fishing Site' },
  { id: 'surf', chars: ['sean'], pos: [26, 18] as const, ko: '션 삼촌 서핑샵', en: 'Sean’s Surf Shop' },
  { id: 'garden', chars: ['martha'], pos: [10, -12] as const, ko: '마샤 할머니 텃밭', en: 'Martha’s Garden' },
  { id: 'school', chars: ['nico'], pos: [-14, 22] as const, ko: '학교', en: 'School' },
]

type T = { ko: string; en: string }
const t = (ko: string, en: string): T => ({ ko, en })

export const copy = {
  loading: t('공룡섬과 교신 중', 'CONTACTING DINO ISLAND'),
  heroTitle: t('PLAYTIME\nAT PLANETARY SCALE', 'PLAYTIME\nAT PLANETARY SCALE'),
  heroSub: t('작은 공룡섬에서 시작된 이야기가 전 세계 아이들의 놀이터가 되기까지.', 'From one tiny dino island to a playground for kids all over the planet.'),
  heroCta: t('모험 시작하기', 'INITIATE ADVENTURE'),
  heroHint: t('버튼을 클릭 후 스크롤로 여행해요', 'CLICK THE BUTTON, THEN SCROLL TO TRAVEL'),
  scroll: t('스크롤해서 시작 ↓', 'SCROLL TO BEGIN ↓'),
  helloTitle: t('HELLO\nCOCOBI', 'HELLO\nCOCOBI'),
  helloSub: t('코코비는 씩씩한 코코와 귀여운 러비를 함께 부르는 이름이에요.', 'Cocobi is the fun compound name of brave Coco and cute Lobi!'),
  familyTitle: t('FAMILY\nCONSTELLATION', 'FAMILY\nCONSTELLATION'),
  familySub: t('엄마·아빠·막내 라라, 할아버지·할머니, 그리고 삼촌까지. 별을 눌러 가족을 만나 보세요.', 'Mom, Dad, baby Lala, Grandpa, Grandma and Uncle Sean. Tap a star to meet the family.'),
  islandTitle: t('DINO ISLAND', 'DINO ISLAND'),
  islandSub: t('코코비 가족과 친구들이 함께 사는 섬. 낚시터, 서핑샵, 텃밭, 학교가 모두 여기 있어요.', 'Home to the Cocobi family and friends — a fishing site, a surf shop, a garden and a school.'),
  islandHud: t('ISLAND-01 · 주민 16명 · 날씨 맑음', 'ISLAND-01 · POP. 16 DINOS · SUNNY'),
  friendsTitle: t('DINO STREET', 'DINO STREET'),
  friendsSub: t('섬 안쪽 오솔길을 따라 걸으면 여덟 친구가 기다리고 있어요. 각자의 특별한 힘으로 매일을 놀이로 바꾸죠_', 'Follow the trail into the island and meet eight best friends, each turning every day into playtime with their own special power_'),
  end1: t('작은 공룡섬에서 시작된 이야기.', 'It started on one tiny dino island.'),
  end2: t('이제 우리 모두의 놀이터예요.', 'Now it’s everyone’s playground.'),
  endCta: t('지금 바로 만나보세요!', 'Meet them now!'),
  skyHint: t('우주를 톡 눌러 보세요 ✦', 'TAP THE SKY ✦'),
  meet: t('자세히 보기', 'MEET'),
  close: t('닫기', 'CLOSE'),
  age: t('나이', 'AGE'),
  species: t('종', 'SPECIES'),
  role: t('관계', 'ROLE'),
  power: t('특기', 'POWER'),
  years: t('살', ' Y/O'),
}

export const chapters = [
  { id: 'hero', at: 0, label: t('시작', 'START') },
  { id: 'hello', at: 1.6, label: t('코코비', 'COCOBI') },
  { id: 'family', at: 4.1, label: t('가족', 'FAMILY') },
  { id: 'island', at: 7.9, label: t('공룡섬', 'ISLAND') },
  { id: 'friends', at: 10.0, label: t('친구들', 'FRIENDS') },
  { id: 'end', at: 16.4, label: t('엔딩', 'END') },
]
