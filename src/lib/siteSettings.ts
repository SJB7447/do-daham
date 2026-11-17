import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SiteSettings {
  kakaoHandle: string;
  kakaoUrl: string;
  projectInquiryFormUrl: string;
  classInquiryFormUrl: string;
  classApplicationOpen: boolean;
  classApplicationFormUrl: string;
  classApplicationClosedMessage: string;
  instructorRecruitOpen: boolean;
  instructorRecruitFormUrl: string;
}

const LEGACY_PLACEHOLDER_FORM_URL = 'https://forms.gle/w1cTzZYUCGkqdDTT6';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  kakaoHandle: '@AI다함스튜디오',
  kakaoUrl: 'https://open.kakao.com/me/dodaham',
  projectInquiryFormUrl: '/apply/project-inquiry',
  classInquiryFormUrl: '/apply/class-inquiry',
  classApplicationOpen: false, // 요청에 따라 1기 강의 신청 폼은 우선 닫아둠 (CMS에서 개방 가능)
  classApplicationFormUrl: '/apply/class-apply',
  classApplicationClosedMessage: '1기 신청 폼 정비 중 · 곧 오픈됩니다',
  instructorRecruitOpen: false, // 요청에 따라 강사 합류 문의 폼도 우선 닫아둠 (CMS에서 개방 가능)
  instructorRecruitFormUrl: '/apply/instructor-recruit'
};

export function isInternalFormUrl(url: string): boolean {
  return url.trim().startsWith('/');
}

function resolveFormUrl(rawValue: unknown, fallback: string, treatLegacyAsEmpty = false): string {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return fallback;
  if (treatLegacyAsEmpty && trimmed === LEGACY_PLACEHOLDER_FORM_URL) {
    return fallback;
  }
  return trimmed;
}

export function normalizeSiteSettings(raw: any): SiteSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SITE_SETTINGS };
  }
  return {
    kakaoHandle: String(raw.kakaoHandle || DEFAULT_SITE_SETTINGS.kakaoHandle),
    kakaoUrl: String(raw.kakaoUrl || DEFAULT_SITE_SETTINGS.kakaoUrl).trim(),
    projectInquiryFormUrl: resolveFormUrl(
      raw.projectInquiryFormUrl,
      DEFAULT_SITE_SETTINGS.projectInquiryFormUrl,
      true
    ),
    classInquiryFormUrl: resolveFormUrl(
      raw.classInquiryFormUrl,
      DEFAULT_SITE_SETTINGS.classInquiryFormUrl,
      true
    ),
    classApplicationOpen:
      typeof raw.classApplicationOpen === 'boolean'
        ? raw.classApplicationOpen
        : DEFAULT_SITE_SETTINGS.classApplicationOpen,
    classApplicationFormUrl: resolveFormUrl(
      raw.classApplicationFormUrl,
      DEFAULT_SITE_SETTINGS.classApplicationFormUrl
    ),
    classApplicationClosedMessage: String(
      raw.classApplicationClosedMessage || DEFAULT_SITE_SETTINGS.classApplicationClosedMessage
    ).trim(),
    instructorRecruitOpen:
      typeof raw.instructorRecruitOpen === 'boolean'
        ? raw.instructorRecruitOpen
        : DEFAULT_SITE_SETTINGS.instructorRecruitOpen,
    instructorRecruitFormUrl: resolveFormUrl(
      raw.instructorRecruitFormUrl,
      DEFAULT_SITE_SETTINGS.instructorRecruitFormUrl
    )
  };
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getDoc(doc(db, 'portfolios', 'admin_default'));
    if (snap.exists()) {
      const raw = snap.data().data;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.siteSettings) {
        return normalizeSiteSettings(parsed.siteSettings);
      }
    }
  } catch {
    // Fallback to defaults
  }
  return { ...DEFAULT_SITE_SETTINGS };
}
