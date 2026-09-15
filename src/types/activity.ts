export type ActivityCategory = 'photo' | 'press';

export interface ActivityItem {
  id: string;
  category: ActivityCategory; // 'photo': 강의 현장 사진, 'press': 언론 기사/인터뷰
  title: string;              // 강의명 또는 기사 헤드라인
  organization: string;       // 대상 기관 (예: 삼성전자, 서울시교육청) 또는 언론사 (예: 전자신문, 한국경제)
  date: string;               // 활동 일시 (예: 2026.03)
  imageUrl: string;           // 대표 이미지/사진 (URL 또는 Base64 data URI)
  link?: string;              // 외부 링크 (언론 기사 원문 또는 상세 링크)
  description: string;        // 한 줄 설명 / 강의 개요 / 인용구
  tags?: string[];            // 태그 키워드 (예: ['AI특강', '생성형AI', '출강'])
  createdAt: number;          // 생성 타임스탬프 (정렬용)
}
