import { Link, useLocation } from 'react-router-dom';

const INSTRUCTOR_TABS = [
  { to: '/instructor/profile', label: '내 프로필 편집' },
  { to: '/instructor/classes', label: '내 수업 관리' },
  { to: '/instructor/classes/new', label: '+ 새 수업 등록' },
  { to: '/class#showcase', label: '수료생 결과물 등록' },
  { to: '/class/instructors', label: '공개 강사진' },
  { to: '/class/schedule', label: '수업 일정표' }
];

export function InstructorQuickTabs() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="강사 전용 빠른 메뉴"
      className="mb-7 pb-4 border-b border-white/[0.1] flex flex-wrap items-center gap-2"
    >
      {INSTRUCTOR_TABS.map((tab) => {
        const isActive = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`px-3.5 py-2 text-xs font-bold rounded-[2px] border transition-colors ${
              isActive
                ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]'
                : 'border-white/[0.14] text-[#A3A79F] hover:border-[#C6FF00] hover:text-[#C6FF00]'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
