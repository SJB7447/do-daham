import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type FormSubmissionType =
  | 'class_apply'
  | 'instructor_recruit'
  | 'class_inquiry'
  | 'project_inquiry';

export type FormSubmissionStatus =
  | 'new'
  | 'contacted'
  | 'in_progress'
  | 'completed'
  | 'archived';

export interface FormSubmissionRecord {
  id: string;
  formType: FormSubmissionType;
  name: string;
  contact: string;
  email: string;
  organization: string;
  tier: string;
  sessions: string;
  categories: string[];
  budget: string;
  schedulePref: string;
  portfolioUrl: string;
  message: string;
  consent: boolean;
  status: FormSubmissionStatus;
  adminMemo: string;
  createdAtMs: number;
  createdAtLabel: string;
}

export interface CreateFormSubmissionPayload {
  formType: FormSubmissionType;
  name: string;
  contact: string;
  email?: string;
  organization?: string;
  tier?: string;
  sessions?: string;
  categories?: string[];
  budget?: string;
  schedulePref?: string;
  portfolioUrl?: string;
  message?: string;
}

export const FORM_TYPE_LABELS: Record<FormSubmissionType, string> = {
  class_apply: '1기 수강 신청',
  instructor_recruit: '강사 합류 신청',
  class_inquiry: '강의 · 출강 문의',
  project_inquiry: '제작 의뢰 문의'
};

export const FORM_TYPE_COLORS: Record<FormSubmissionType, string> = {
  class_apply: '#C6FF00',
  instructor_recruit: '#28B8E8',
  class_inquiry: '#F5C400',
  project_inquiry: '#E02898'
};

export const STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  new: '신규 접수',
  contacted: '연락 완료',
  in_progress: '상담 중',
  completed: '등록/계약 완료',
  archived: '보류/종료'
};

export const STATUS_COLORS: Record<FormSubmissionStatus, string> = {
  new: '#C6FF00',
  contacted: '#28B8E8',
  in_progress: '#F5C400',
  completed: '#34D17A',
  archived: '#8C8C8C'
};

function toMillis(val: unknown): number {
  if (!val) return 0;
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number') return val;
  return 0;
}

function formatDateTime(ms: number): string {
  if (!ms) return '-';
  try {
    return new Date(ms).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

export async function createFormSubmission(payload: CreateFormSubmissionPayload): Promise<string> {
  const docPayload: Record<string, unknown> = {
    formType: payload.formType,
    name: payload.name.trim(),
    contact: payload.contact.trim(),
    email: (payload.email || '').trim(),
    organization: (payload.organization || '').trim(),
    tier: (payload.tier || '').trim(),
    sessions: (payload.sessions || '').trim(),
    categories: Array.isArray(payload.categories) ? payload.categories.slice(0, 20) : [],
    budget: (payload.budget || '').trim(),
    schedulePref: (payload.schedulePref || '').trim(),
    portfolioUrl: (payload.portfolioUrl || '').trim(),
    message: (payload.message || '').trim(),
    consent: true,
    status: 'new',
    adminMemo: '',
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'form_submissions'), docPayload);
  return docRef.id;
}

export async function fetchFormSubmissions(): Promise<FormSubmissionRecord[]> {
  const q = query(collection(db, 'form_submissions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const ms = toMillis(data.createdAt);
    const rawType = String(data.formType || 'class_inquiry') as FormSubmissionType;
    const rawStatus = String(data.status || 'new') as FormSubmissionStatus;
    return {
      id: d.id,
      formType: rawType in FORM_TYPE_LABELS ? rawType : 'class_inquiry',
      name: String(data.name || ''),
      contact: String(data.contact || ''),
      email: String(data.email || ''),
      organization: String(data.organization || ''),
      tier: String(data.tier || ''),
      sessions: String(data.sessions || ''),
      categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
      budget: String(data.budget || ''),
      schedulePref: String(data.schedulePref || ''),
      portfolioUrl: String(data.portfolioUrl || ''),
      message: String(data.message || ''),
      consent: Boolean(data.consent),
      status: rawStatus in STATUS_LABELS ? rawStatus : 'new',
      adminMemo: String(data.adminMemo || ''),
      createdAtMs: ms,
      createdAtLabel: formatDateTime(ms)
    };
  });
}

export async function updateFormSubmission(
  id: string,
  updates: { status?: FormSubmissionStatus; adminMemo?: string }
): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp()
  };
  if (updates.status !== undefined) {
    patch.status = updates.status;
  }
  if (updates.adminMemo !== undefined) {
    patch.adminMemo = updates.adminMemo.trim();
  }
  await updateDoc(doc(db, 'form_submissions', id), patch);
}

export async function deleteFormSubmission(id: string): Promise<void> {
  await deleteDoc(doc(db, 'form_submissions', id));
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/\r?\n/g, ' ');
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportSubmissionsToCsv(
  items: FormSubmissionRecord[],
  filename = `do-daham-submissions-${new Date().toISOString().slice(0, 10)}.csv`
): void {
  const headers = [
    '접수일시',
    '폼 유형',
    '진행 상태',
    '성함/담당자',
    '연락처',
    '이메일',
    '기업/기관/브랜드',
    '희망 규모/대상',
    '희망 회차',
    '선택 분야',
    '예상 예산',
    '선호 일정/장소',
    '포트폴리오/참고 URL',
    '상세 내용',
    '관리자 메모'
  ];

  const rows = items.map((item) => [
    item.createdAtLabel,
    FORM_TYPE_LABELS[item.formType] || item.formType,
    STATUS_LABELS[item.status] || item.status,
    item.name,
    item.contact,
    item.email,
    item.organization,
    item.tier,
    item.sessions,
    item.categories.join(', '),
    item.budget,
    item.schedulePref,
    item.portfolioUrl,
    item.message,
    item.adminMemo
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(String(cell || ''))).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
