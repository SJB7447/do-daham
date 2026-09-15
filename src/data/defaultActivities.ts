import { ActivityItem } from '../types/activity';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const ADMIN_EMAILS = ['sjb76337447@gmail.com'];

export function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-goyang-biz',
    category: 'photo',
    title: '소상공인 & 비즈니스 실무진을 위한 AI 마케팅 심화 실전 특강',
    organization: '창조혁신캠퍼스성사 16층 경기 AI·디지털 배움터',
    date: '2024.08',
    imageUrl: '/images/activities/goyang_6.jpg',
    description: '건축사 사무소 대표, 예비 소상공인, 직장인을 대상으로 챗GPT·제미나이 프롬프트 엔지니어링, 캔바 디자인, 영상 마케팅 기획 및 편집까지 현업에 즉시 적용하는 16인 맞춤형 실전 집중 강의를 진행했습니다.',
    fullContent: `오후 3시 반이 되자, 체험존 바로 옆에 마련된 AI·디지털 배움터 강의실에 사람들이 하나둘 찾아든다. 청년부터 중년, 어르신까지 다양한 연령대로 구성된 이들은 체험존 방문객과는 사뭇 다른 진지한 표정이다. AI에 대한 기초 지식을 어느 정도 보유한 ‘AI 심화교육’ 수강생들이다.

건축사 사무소 대표부터 개인 창업을 앞둔 예비 소상공인, 업무 효율을 높이려는 직장인까지 16명의 수강생이 실무 역량을 다지기 위해 해당 교육을 신청했다.

오늘 수업은 콘텐츠 창작 과정을 실습하는 ‘AI로 만드는 홍보물과 QR코드 만들기’다. 챗GPT나 제미나이 등 AI 도구 명령어 작성법부터, ‘캔바’ 같은 디자인 도구를 이용해 자신만의 홍보 문구와 사진, 지도, 음악까지 삽입해 보는 실전형 실습이 진행된다.

특히 이번 과정은 단순한 기능 암기나 툴 사용법을 넘어, 당장 현업에 적용할 수 있는 실전 팁이 쏟아졌다. 최근 필수로 꼽히는 영상 마케팅의 이해부터 기획, 촬영과 편집, 온라인 마케팅 활용 및 결과 분석까지 체계적으로 다뤄 수강생들의 뜨거운 호응을 얻었다.

"기능 배우기가 아니라 '내 홍보물 완성하기' - 오늘 수업은 AI 기능 하나하나를 배우는 시간이 아니라, 내가 실제로 쓸 수 있는 홍보물 한 편을 끝까지 완성하는 시간입니다."`,
    quote: {
      speaker: '최원숙 수강생',
      role: '의류 브랜드 매장 개점 준비 예비 창업자',
      text: '“현재 의류 브랜드 매장 개점을 준비하고 있어요. 막상 홍보를 하려니 방법을 몰라서 막막하더라고요. 혼자 영상을 찾아보기도 했지만, AI 도구도 너무 많아서 오히려 혼란스러웠어요. 여기서 각 도구의 장점과 사용법을 체계적으로 배워 정말 많은 도움이 됐습니다.”'
    },
    additionalImages: [
      '/images/activities/goyang_7.jpg',
      '/images/activities/goyang_12.jpg'
    ],
    tags: ['AI심화교육', '비즈니스AI', '챗GPT', '제미나이', '영상마케팅', '창조혁신캠퍼스성사'],
    createdAt: 1770000000000
  },
  {
    id: 'act-goyang-senior',
    category: 'photo',
    title: '어르신 눈높이 맞춤형 스마트폰 생성형 AI 캐릭터 만들기 특강',
    organization: '덕양구 성사동 고양누리노인복지센터',
    date: '2024.08',
    imageUrl: '/images/activities/goyang_9.jpg',
    description: '60~80대 어르신 20여 명을 대상으로 스마트폰 음성 명령을 활용한 AI 캐릭터 제작 및 메신저 프로필 등록 실습을 진행하여 디지털 격차를 해소하고 배움의 기쁨을 함께 나눴습니다.',
    fullContent: `“어르신, 화면 속 마이크 아이콘을 누르고 천천히 말씀해 보세요.” 강사의 친절한 안내에 따라 한 어르신이 스마트폰 화면을 톡톡 두드리자, AI가 곧장 명쾌한 답변을 띄워낸다. “허허, 거 참 신기한 친구네!” 호기심 어린 탄성과 함께 교실 곳곳에서 웃음꽃이 피어난다.

아침부터 배움의 열기로 가득한 이곳은 덕양구 성사동의 고양누리노인복지센터. 60~80대 어르신 20여 명이 모인 강의실에서 스마트폰을 활용한 AI 교육이 한창이다. 고양시민 모두가 최신 기술과 친숙해지도록 돕는 ‘AI·디지털 배움터’ 교육의 일종으로 경로당, 복지관, 학교, 어린이집 등 고양 내 다양한 기관을 직접 찾아가 수강생들을 가르친다.

오늘의 주제는 AI를 활용한 ‘내 캐릭터 만들기’. 각자의 얼굴을 촬영한 다음 AI 애플리케이션에 사진을 올리고 캐릭터를 만들어 내는 기초 과정이다. 글자를 입력하는 것보다 말이 더 빠른 어르신들은 음성으로 “내 캐릭터를 만들어 줘!”라고 소리친다. 명령을 받은 AI는 몇 초 만에 귀여운 캐릭터를 뚝딱 그려낸다. 자신을 닮았는지 아닌지는 중요하지 않다. 그저 결과물을 얻어냈다는 사실이 신기하고 뿌듯할 따름이다.

다음 단계는 캐릭터를 문구와 스티커로 꾸며 메신저 프로필로 등록하는 과정. “무슨 말인지 알겠는데, 막상 따라 하기가 어렵네. 10년만 젊었어도 잘했을 텐데!” 유쾌한 농담을 던지면서도 3시간의 긴 수업 시간을 지친 기색 없이 몰입한다. 한 분 한 분 찾아가 돕는 강사의 이마에도 기분 좋은 미소가 걸렸다.`,
    quote: {
      speaker: '주경옥 · 신서희 · 이경순 · 정용자 수강생',
      role: '고양누리노인복지센터 수강생 일동',
      text: '“평소엔 스마트폰으로 전화나 문자만 할 줄 알았지, 이런 건 해볼 생각조차 안 했죠. 그런데 말만 하면 AI가 그림도 그려주고 이모티콘도 뚝딱 만들어 주니 참 신기하네요. 친구들에게 제 캐릭터를 보내며 자랑했답니다. 우리 같은 노인들 눈높이에 맞는 이런 교육이 더 많아지면 좋겠네요.”'
    },
    additionalImages: [
      '/images/activities/goyang_8.jpg',
      '/images/activities/goyang_10.jpg',
      '/images/activities/goyang_11.jpg'
    ],
    tags: ['디지털배움터', '시니어AI', '생성형AI', '디지털포용', '출강', '고양누리노인복지센터'],
    createdAt: 1769000000000
  },
  {
    id: 'act-goyang-press',
    category: 'press',
    title: '[고양특례시 매거진] "똑똑한 고양, AI·디지털 배움터의 하루"',
    organization: '고양특례시 시정소식지 (고양을 만드는 시간)',
    date: '2024.08',
    imageUrl: '/images/activities/goyang_2.jpg',
    link: 'https://www.gy1pick.kr/_NBoard/board.php?bo_table=magazine&wr_id=1050',
    description: '고양시 공식 시정 매거진 취재 르포. 어르신 눈높이 맞춤형 스마트폰 AI 교육부터 창조혁신캠퍼스 성사에서 펼쳐진 소상공인·직장인 비즈니스 AI 심화 실무 강의까지, 현장을 이끈 강사 DO-DAHAM의 활동과 수강생들의 생생한 인터뷰가 특집 보도되었습니다.',
    fullContent: `AI가 일상이 된 시대이지만, 누군가에겐 여전히 복잡한 외계어다. 이들에게 실질적인 도움을 주는 ‘AI·디지털 배움터’가 고양에 활짝 열렸다. 누구나 쉽게 최신 기술을 접하고 배우는 공간. 낯선 AI를 내 일상의 든든한 무기로 바꿔 가는 그 생생한 현장을 찾았다. (글: 권상진 / 사진: 최준근)

09:00 AM | 어르신들의 웃음꽃을 피운 AI 친구 (고양누리노인복지센터)
60~80대 어르신 20여 명이 모인 교실에서 진행된 스마트폰 생성형 AI 캐릭터 제작 실습. 한 분 한 분 세심하게 다가가는 강사의 친절한 지도 아래, 어르신들은 직접 만든 AI 캐릭터로 메신저 프로필을 꾸미며 디지털 기술에 대한 두려움을 호기심과 즐거움으로 바꾸었다.

03:30 PM | 내 비즈니스를 키우는 실전 무기, 심화교육 (창조혁신캠퍼스성사 16층)
건축사 사무소 대표, 예비 소상공인, 직장인 등 실전 역량이 필요한 16인의 수강생들과 함께한 'AI로 만드는 홍보물과 QR코드 만들기'. 챗GPT·제미나이 프롬프트 엔지니어링부터 캔바 디자인 툴, 영상 마케팅 기획/촬영/편집까지 비즈니스 실무에 즉시 적용할 수 있는 심화 커리큘럼으로 큰 호응을 얻었다.`,
    quote: {
      speaker: '고양특례시 시정매거진 [고양을 만드는 시간]',
      role: '취재 르포 기사 발췌',
      text: '“낯선 AI를 내 일상의 든든한 무기로 바꿔 가는 그 생생한 현장... 한 분 한 분 찾아가 돕는 강사의 이마에도 기분 좋은 미소가 걸렸다.”'
    },
    additionalImages: [
      '/images/activities/goyang_1.jpg',
      '/images/activities/goyang_3.jpg'
    ],
    tags: ['고양특례시', '언론보도', 'AI디지털배움터', '시정소식지', '취재르포'],
    createdAt: 1768000000000
  }
];

// Legacy mock IDs to always exclude
const MOCK_IDS = new Set(['act-1', 'act-2', 'act-3', 'act-4', 'act-5', 'act-6']);

export const STORAGE_KEY_ACTIVITIES = 'dodaham_custom_activities_v4';

export function getStoredActivities(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
    if (!raw) return DEFAULT_ACTIVITIES;
    const userItems: ActivityItem[] = JSON.parse(raw);
    if (!Array.isArray(userItems)) return DEFAULT_ACTIVITIES;
    
    // Filter out mockups and duplicates
    const cleanUserItems = userItems.filter(item => !MOCK_IDS.has(item.id));
    const customIds = new Set(cleanUserItems.map(item => item.id));
    const combined = [...cleanUserItems, ...DEFAULT_ACTIVITIES.filter(item => !customIds.has(item.id))];
    return combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.warn('Failed to load activities from localStorage:', err);
    return DEFAULT_ACTIVITIES;
  }
}

export function saveStoredActivities(activities: ActivityItem[]): void {
  try {
    const cleaned = activities.filter(item => !MOCK_IDS.has(item.id));
    localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(cleaned));
  } catch (err) {
    console.error('Failed to save activities to localStorage:', err);
  }
}

/**
 * Fetch activities from Firestore cloud. Fallback to local storage if offline.
 */
export async function fetchActivitiesFromCloud(): Promise<ActivityItem[]> {
  try {
    const docRef = doc(db, 'portfolios', 'admin_default');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const raw = docSnap.data().data;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed.activities && Array.isArray(parsed.activities) && parsed.activities.length > 0) {
        const cleaned = parsed.activities.filter((item: ActivityItem) => !MOCK_IDS.has(item.id));
        saveStoredActivities(cleaned);
        return cleaned.sort((a: ActivityItem, b: ActivityItem) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    }
  } catch (err) {
    console.warn('Failed to fetch activities from Firestore, falling back to local storage:', err);
  }
  return getStoredActivities();
}

/**
 * Save activities to Firestore. Strictly requires authorized admin email.
 */
export async function saveActivitiesToCloud(activities: ActivityItem[], userEmail?: string | null): Promise<boolean> {
  if (!isAuthorizedAdmin(userEmail)) {
    throw new Error('권한이 없습니다. 지정된 관리자 계정(' + ADMIN_EMAILS[0] + ')만 수정 및 등록할 수 있습니다.');
  }

  saveStoredActivities(activities);

  try {
    const docRef = doc(db, 'portfolios', 'admin_default');
    const docSnap = await getDoc(docRef);
    let currentData: any = {};
    if (docSnap.exists()) {
      const raw = docSnap.data().data;
      currentData = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
    currentData.activities = activities;

    await setDoc(docRef, {
      data: JSON.stringify(currentData),
      updated_at: new Date().toISOString()
    }, { merge: true });

    return true;
  } catch (err: any) {
    console.error('Failed to save activities to Firestore:', err);
    throw new Error('클라우드 저장 실패: ' + err.message);
  }
}
