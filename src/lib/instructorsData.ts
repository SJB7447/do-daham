import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { BASE_LECTURE_HOURS, BASE_STUDENTS } from './classMetrics';

export type FieldFilter = 'ALL' | 'AI 영상 · 연출' | '웹 · 서비스' | '업무 자동화';
export type DayKey = 'ALL' | '일' | '월' | '화' | '수' | '목' | '금' | '토';

export interface InstructorProfile {
  id: string;
  name: string;
  initials: string;
  isLead: boolean;
  isExample: boolean;
  badgeText: string;
  accent: string;
  role: string;
  bio: string;
  detailBio: string;
  fields: Exclude<FieldFilter, 'ALL'>[];
  tags: string[];
  credentials: { label: string; text: string }[];
  activeDays: Exclude<DayKey, 'ALL'>[];
  scheduleTime: string;
  activeClassTitle: string;
  activeClassStatus: string;
  activeClassTo?: string;
  showStats?: boolean;
  lectureHours?: number;
  studentCount?: number;
  photoUrl?: string;
}

export const WEEK_DAYS: Exclude<DayKey, 'ALL'>[] = ['일', '월', '화', '수', '목', '금', '토'];
export const FIELD_OPTIONS: { value: FieldFilter; label: string }[] = [
  { value: 'ALL', label: '전체 분야' },
  { value: 'AI 영상 · 연출', label: 'AI 영상 · 연출' },
  { value: '웹 · 서비스', label: '웹 · 서비스' },
  { value: '업무 자동화', label: '업무 자동화' }
];

export function toThemeAccent(hex: string): string {
  const normalized = hex.trim().toUpperCase();
  if (normalized === '#C6FF00') return 'var(--acid)';
  if (normalized === '#28B8E8' || normalized === '#28C8F0') return 'var(--cyan)';
  if (normalized === '#F5C400') return 'var(--amber)';
  if (normalized === '#E02898') return 'var(--magenta)';
  return hex;
}

export function getLeadInstructor(metrics?: {
  totalHours?: number;
  totalStudents?: number;
}): InstructorProfile {
  return {
    id: 'sim-jeongbo',
    name: '심정보',
    initials: 'SJB',
    isLead: true,
    isExample: false,
    badgeText: '대표 강사',
    accent: '#C6FF00',
    role: 'DO-DAHAM 대표 · AI 크리에이티브 디렉터',
    bio: '광고·숏폼·웹서비스를 직접 제작하는 크리에이터. 도구를 외우는 수업이 아니라 각자의 실제 결과물을 완성하는 실전 강의를 진행합니다.',
    detailBio:
      '경기관광공사 AI 영상 공모전 입상작(Code:M Studio)을 비롯해 다양한 AI 영상 프로젝트와 웹서비스를 직접 기획·제작하고 있습니다. 수강생의 직무와 목표에 맞춘 프롬프트 설계부터 최종 결과물 피드백까지 전 과정을 함께합니다.',
    fields: ['AI 영상 · 연출', '웹 · 서비스', '업무 자동화'],
    tags: ['AI 영상 연출', '홈페이지 · 웹 구축', '실무 AI 자동화'],
    credentials: [
      { label: 'AWARD', text: '경기관광공사 AI 영상 공모전 입상 (Code:M Studio)' },
      { label: 'MAIN', text: 'AI 디지털 튜터 양성 과정 메인 강사' },
      { label: 'TEACHING', text: '에이블런 · 디지털 배움터 · 기관/기업 실무 출강' }
    ],
    activeDays: ['화', '목', '토'],
    scheduleTime: '19:00 – 21:00 · 주말 협의',
    activeClassTitle: 'AI 실무 클래스 1기 (6회)',
    activeClassStatus: '사전 모집 중 · 1~30명 규모별 개설',
    activeClassTo: '/class',
    showStats: true,
    lectureHours: metrics?.totalHours || BASE_LECTURE_HOURS,
    studentCount: metrics?.totalStudents || BASE_STUDENTS
  };
}

const CACHE_TTL_MS = 60_000;
const APPROVED_INSTRUCTORS_CACHE_KEY = 'dodaham-approved-instructors-v1';

let approvedMemoryCache: { value: InstructorProfile[]; cachedAt: number } | null = null;
let inflightApproved: Promise<InstructorProfile[]> | null = null;

function readStoredApprovedCache(): InstructorProfile[] | null {
  try {
    const raw = sessionStorage.getItem(APPROVED_INSTRUCTORS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: InstructorProfile[]; cachedAt?: number };
    if (
      Array.isArray(parsed?.value) &&
      typeof parsed.cachedAt === 'number' &&
      Date.now() - parsed.cachedAt < CACHE_TTL_MS
    ) {
      return parsed.value;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function writeApprovedCache(value: InstructorProfile[]) {
  const cachedAt = Date.now();
  approvedMemoryCache = { value, cachedAt };
  try {
    sessionStorage.setItem(APPROVED_INSTRUCTORS_CACHE_KEY, JSON.stringify({ value, cachedAt }));
  } catch {
    // Ignore quota errors
  }
}

export async function fetchApprovedInstructors(): Promise<InstructorProfile[]> {
  if (approvedMemoryCache && Date.now() - approvedMemoryCache.cachedAt < CACHE_TTL_MS) {
    return approvedMemoryCache.value;
  }

  const stored = readStoredApprovedCache();
  if (stored) {
    approvedMemoryCache = { value: stored, cachedAt: Date.now() };
    return stored;
  }

  if (inflightApproved) {
    return inflightApproved;
  }

  inflightApproved = (async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'instructors'), where('status', '==', 'approved'))
      );
      if (snap.empty) {
        writeApprovedCache([]);
        return [];
      }

      const palette = ['#28B8E8', '#F5C400', '#C6FF00'];
      const loaded: InstructorProfile[] = snap.docs.map((docSnap, idx) => {
        const d = docSnap.data();
        const name = String(d.displayName || '파트너 강사');
        const accent = palette[idx % palette.length];
        const tags: string[] = Array.isArray(d.tags) ? d.tags.filter(Boolean) : [];
        return {
          id: docSnap.id,
          name,
          initials: name.slice(0, 2).toUpperCase(),
          isLead: false,
          isExample: false,
          badgeText: '파트너 강사',
          accent,
          role: String(d.title || 'DO-DAHAM 파트너 강사'),
          bio: String(d.bio || ''),
          detailBio: String(d.bio || ''),
          fields: ['AI 영상 · 연출', '웹 · 서비스', '업무 자동화'],
          tags,
          credentials: Array.isArray(d.credentials)
            ? d.credentials
                .filter((c: unknown) => typeof c === 'string' && c.trim())
                .map((c: string, i: number) => ({ label: `CAREER ${i + 1}`, text: c }))
            : [],
          activeDays: Array.isArray(d.activeDays) ? d.activeDays : [],
          scheduleTime: String(d.scheduleTime || '시간 협의'),
          activeClassTitle: '개설 수업 준비 중',
          activeClassStatus: '일정 공지 예정',
          showStats: Boolean(d.showStats),
          lectureHours: Number(d.lectureHours || 0),
          studentCount: Number(d.studentCount || 0),
          photoUrl: String(d.photoUrl || '')
        };
      });

      writeApprovedCache(loaded);
      return loaded;
    } catch {
      return [];
    } finally {
      inflightApproved = null;
    }
  })();

  return inflightApproved;
}
