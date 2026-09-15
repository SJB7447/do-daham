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
    id: 'act-goyang-press',
    category: 'press',
    title: '[고양특례시 매거진] "똑똑한 고양, AI·디지털 배움터의 하루"',
    organization: '고양특례시 시정 소식지 (고양을 만드는 시간)',
    date: '2024.08',
    imageUrl: '/images/activities/goyang_2.jpg',
    link: 'https://www.gy1pick.kr/_NBoard/board.php?bo_table=magazine&wr_id=1050',
    description: '고양누리노인복지센터의 어르신 맞춤형 AI 캐릭터 교육부터 창조혁신캠퍼스성사의 소상공인·직장인 대상 실전 AI 심화교육까지, 강사로서 이끌어낸 생생한 교육 현장 취재 및 인터뷰 기사',
    tags: ['고양특례시', '언론보도', 'AI디지털배움터', '시정소식지'],
    createdAt: 1770000000000
  },
  {
    id: 'act-goyang-biz',
    category: 'photo',
    title: '소상공인 & 비즈니스 실무진을 위한 AI 마케팅 심화 실전 특강',
    organization: '창조혁신캠퍼스성사 경기 AI·디지털 배움터',
    date: '2024.08',
    imageUrl: '/images/activities/goyang_6.jpg',
    description: '기능 암기가 아닌 \'내 비즈니스 홍보물 완성\'을 목표로 챗GPT·제미나이 프롬프트 엔지니어링, 캔바 디자인, 영상 마케팅 기획 및 편집까지 실무에 바로 적용하는 16인 맞춤형 심화 실습 강의',
    tags: ['AI심화교육', '비즈니스AI', '챗GPT', '제미나이', '소상공인'],
    createdAt: 1769000000000
  },
  {
    id: 'act-goyang-senior',
    category: 'photo',
    title: '어르신 눈높이 맞춤형 스마트폰 생성형 AI 캐릭터 만들기 특강',
    organization: '고양누리노인복지센터',
    date: '2024.08',
    imageUrl: '/images/activities/goyang_9.jpg',
    description: '60~80대 어르신 20여 명을 대상으로 스마트폰을 활용한 AI 캐릭터 제작 및 메신저 프로필 등록 실습을 진행하여 디지털 격차를 해소하고 배움의 즐거움을 함께 나눈 현장 스케치',
    tags: ['디지털배움터', '시니어AI', '생성형AI', '디지털포용', '출강'],
    createdAt: 1768000000000
  },
  {
    id: 'act-4',
    category: 'photo',
    title: '공공기관 및 교육 리더십 대상 디지털 트랜스포메이션 세미나',
    organization: '디지털 혁신 미래 교육원',
    date: '2025.11',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    description: '급변하는 교육 환경에서 디지털 리터러시와 AI 기반 행정 효율화를 위한 방향성을 공유했습니다.',
    tags: ['공공기관특강', 'DX리더십', '미래교육'],
    createdAt: 1764000000000
  },
  {
    id: 'act-5',
    category: 'press',
    title: '[칼럼] 인공지능 시대, 정답을 외우는 사람보다 질문하는 사람이 이긴다',
    organization: '이코노믹 인사이트 칼럼',
    date: '2025.10',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    link: 'https://youtube.com/@do-daham',
    description: '기술의 발전 속에서 단순 반복 지식이 아닌 본질적 문제 해결 능력과 주도적인 실행력의 가치를 기고했습니다.',
    tags: ['전문가칼럼', '언론기고', '인사이트'],
    createdAt: 1762000000000
  },
  {
    id: 'act-6',
    category: 'photo',
    title: '대학생 & 청년 혁신가를 위한 해커톤 멘토링 및 피칭 워크숍',
    organization: '청년 창업 진흥 아카데미',
    date: '2025.09',
    imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    description: '실제 문제를 정의하고 기술 기반 솔루션 프로토타입을 신속하게 완성하는 해커톤 집중 코칭을 지원했습니다.',
    tags: ['해커톤멘토링', '워크숍', '피칭코칭'],
    createdAt: 1760000000000
  }
];

export const STORAGE_KEY_ACTIVITIES = 'dodaham_custom_activities_v2';

export function getStoredActivities(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
    if (!raw) return DEFAULT_ACTIVITIES;
    const userItems: ActivityItem[] = JSON.parse(raw);
    if (!Array.isArray(userItems)) return DEFAULT_ACTIVITIES;
    
    const customIds = new Set(userItems.map(item => item.id));
    const combined = [...userItems, ...DEFAULT_ACTIVITIES.filter(item => !customIds.has(item.id))];
    return combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.warn('Failed to load activities from localStorage:', err);
    return DEFAULT_ACTIVITIES;
  }
}

export function saveStoredActivities(activities: ActivityItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activities));
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
        saveStoredActivities(parsed.activities);
        return parsed.activities.sort((a: ActivityItem, b: ActivityItem) => (b.createdAt || 0) - (a.createdAt || 0));
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
