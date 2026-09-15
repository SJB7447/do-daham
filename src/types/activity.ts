export type ActivityCategory = 'photo' | 'press';

export interface ActivityQuote {
  speaker: string; // 수강생 또는 인터뷰이 이름
  role?: string;   // 소속 또는 역할 (예: '수강생', '의류 브랜드 예비 창업자')
  text: string;    // 인터뷰 인용문 전문
}

export interface ActivityItem {
  id: string;
  category: ActivityCategory;   // 'photo': 강의 현장 사진, 'press': 언론 기사/인터뷰
  title: string;                // 강의명 또는 기사 헤드라인
  organization: string;         // 대상 기관 또는 언론사 (예: 고양특례시, 창조혁신캠퍼스성사)
  date: string;                 // 활동 일시 (예: 2024.08)
  imageUrl: string;             // 대표 이미지/사진 (URL 또는 Base64)
  link?: string;                // 외부 링크 (언론 기사 원문 링크 등)
  description: string;          // 카드에 표시될 핵심 요약
  fullContent?: string;         // 취재 르포 전문 / 강의 상세 스토리
  quote?: ActivityQuote;        // 수강생 생생 인터뷰 인용구
  additionalImages?: string[];  // 보조 사진 목록 (결과물, 강의실 모습 등)
  tags?: string[];              // 태그 키워드 (예: ['AI특강', '생성형AI', '출강'])
  createdAt: number;            // 생성 타임스탬프 (정렬용)
}
