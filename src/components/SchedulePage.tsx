import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { CrystalCube } from './CrystalCube';
import { SiteHeader } from './SiteHeader';
import {
  DEFAULT_SITE_SETTINGS,
  fetchSiteSettings,
  isInternalFormUrl,
  SiteSettings
} from '../lib/siteSettings';

type ClassStatus = 'confirmed' | 'urgent' | 'pending';

interface ScheduleClassItem {
  id: string;
  title: string;
  cohort: string;
  status: ClassStatus;
  statusLabel: string;
  instructorName: string;
  instructorInitials: string;
  instructorAccent: string;
  weekdayLabel: string;
  timeLabel: string;
  startDateLabel: string;
  location: string;
  enrolled: number;
  minToOpen: number;
  capacity: number;
  basePrice: number;
  currentPrice: number;
  nextDropHint: string;
  calendarDates: number[];
  isExample: boolean;
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 2026년 12월 기준 달력 셀 생성 (12월 1일 = 화요일, 31일)
function buildMonthCells(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDay; i += 1) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d += 1) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

export default function SchedulePage() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClassStatus>('ALL');
  const [instructorFilter, setInstructorFilter] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<number | null>(1);
  const [monthOffset, setMonthOffset] = useState<0 | 1>(0); // 0: 2026.12, 1: 2027.01
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [scheduleClasses, setScheduleClasses] = useState<ScheduleClassItem[]>([]);

  useEffect(() => {
    fetchSiteSettings().then(setSiteSettings);

    async function loadPublishedClasses() {
      try {
        const q = query(
          collection(db, 'classes'),
          where('status', 'in', ['published', 'confirmed', 'started', 'closed'])
        );
        const snap = await getDocs(q);
        const list: ScheduleClassItem[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const enrolled = Number(d.enrolledCount || 0);
          const minToOpen = Number(d.minToOpen || 1);
          const capacity = Number(d.capacity || 15);
          const basePrice = Number(d.basePrice || 25000);
          const remaining = Math.max(0, capacity - enrolled);
          const mappedStatus: ClassStatus =
            enrolled >= minToOpen
              ? remaining <= 3
                ? 'urgent'
                : 'confirmed'
              : 'pending';
          const statusLabel =
            mappedStatus === 'confirmed'
              ? '개설 확정'
              : mappedStatus === 'urgent'
                ? '마감 임박'
                : '개설 대기';

          return {
            id: docSnap.id,
            title: String(d.title || 'AI 실무 클래스'),
            cohort: `${d.category || '클래스'} · ${d.sessionCount || 6}회`,
            status: mappedStatus,
            statusLabel,
            instructorName: String(d.instructorName || 'DO-DAHAM 강사'),
            instructorInitials: String(d.instructorName || 'AI').slice(0, 2).toUpperCase(),
            instructorAccent: 'var(--acid)',
            weekdayLabel: String(d.startDate || '일정 협의'),
            timeLabel: `${d.startTime || '19:30'} – ${d.endTime || '21:30'}`,
            startDateLabel: String(d.startDate || '확정 시 안내'),
            location: String(d.location || '확정 시 안내'),
            enrolled,
            minToOpen,
            capacity,
            basePrice,
            currentPrice: basePrice,
            nextDropHint: `정원 ${capacity}명 · 잔여 ${remaining}석`,
            calendarDates: [],
            isExample: false
          };
        });
        setScheduleClasses(list);
      } catch {
        setScheduleClasses([]);
      }
    }

    loadPublishedClasses();
  }, []);

  const canApply = Boolean(siteSettings.classApplicationOpen);
  const activeApplyTarget = siteSettings.classApplicationFormUrl || '/apply/class-apply';

  const currentYear = monthOffset === 0 ? 2026 : 2027;
  const currentMonthIndex = monthOffset === 0 ? 11 : 0; // 11 = Dec, 0 = Jan
  const monthLabel = monthOffset === 0 ? '2026년 12월' : '2027년 1월';

  const monthCells = useMemo(
    () => buildMonthCells(currentYear, currentMonthIndex),
    [currentYear, currentMonthIndex]
  );

  const instructorNames = useMemo(
    () => ['ALL', ...Array.from(new Set(scheduleClasses.map((c) => c.instructorName)))],
    [scheduleClasses]
  );

  const filteredClasses = useMemo(() => {
    return scheduleClasses.filter((c) => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchInstructor = instructorFilter === 'ALL' || c.instructorName === instructorFilter;
      return matchStatus && matchInstructor;
    });
  }, [scheduleClasses, statusFilter, instructorFilter]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, ScheduleClassItem[]>();
    if (monthOffset !== 0) return map;
    filteredClasses.forEach((cls) => {
      cls.calendarDates.forEach((d) => {
        const list = map.get(d) || [];
        list.push(cls);
        map.set(d, list);
      });
    });
    return map;
  }, [filteredClasses, monthOffset]);

  const mobileWeeklyList = useMemo(() => {
    const entries = Array.from(eventsByDay.entries()).sort((a, b) => a[0] - b[0]);
    return entries;
  }, [eventsByDay]);

  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay) || [] : [];

  const confirmedCount = scheduleClasses.filter((c) => c.status === 'confirmed').length;
  const totalSessionsThisMonth = scheduleClasses.reduce((acc, c) => acc + c.calendarDates.length, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Top Navigation */}
      <SiteHeader
        badge="CLASS"
        ctaLabel={canApply ? '1기 사전 신청 →' : '강의 문의 →'}
        ctaHref={canApply ? activeApplyTarget : siteSettings.classInquiryFormUrl}
      />

      {/* Page Header */}
      <header className="pt-28 sm:pt-36 pb-10 sm:pb-14 px-[22px] sm:px-8 lg:px-14 border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/class"
            className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.14em] text-[#8C8C8C] hover:text-[#C6FF00] transition-colors mb-5 min-h-[44px]"
          >
            <ArrowLeft size={14} /> AI 실무 클래스로 돌아가기
          </Link>

          <div className="text-[11px] font-extrabold tracking-[0.18em] text-[#C6FF00] mb-3">
            CLASS · SCHEDULE &amp; STATUS
          </div>
          <h1 className="ff-disp text-4xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight mb-5">
            수업 일정 및
            <br />
            <span className="text-[#C6FF00]">신청 현황</span>
          </h1>
          <p className="text-sm sm:text-base text-[#8C8C8C] leading-relaxed max-w-2xl break-keep">
            현재 모집 중인 클래스의 인원 현황과 개설 확정 여부를 달력으로 확인하세요.
          </p>

          {/* Summary 3 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8">
            <div className="bg-[#11120E] border border-white/[0.08] rounded-[2px] p-5">
              <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#8C8C8C] mb-1.5">
                OPEN CLASSES
              </div>
              <div className="ff-disp text-3xl text-[#F2F2F2]">{scheduleClasses.length}개</div>
              <div className="text-xs text-[#8C8C8C] mt-1">현재 모집 · 대기 중 과정</div>
            </div>
            <div className="bg-[#11120E] border border-[#C6FF00]/35 rounded-[2px] p-5">
              <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-1.5">
                CONFIRMED
              </div>
              <div className="ff-disp text-3xl text-[#C6FF00]">{confirmedCount}개 확정</div>
              <div className="text-xs text-[#8C8C8C] mt-1">최소 인원 달성 클래스</div>
            </div>
            <div className="bg-[#11120E] border border-white/[0.08] rounded-[2px] p-5">
              <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#8C8C8C] mb-1.5">
                SESSIONS THIS MONTH
              </div>
              <div className="ff-disp text-3xl text-[#F2F2F2]">{totalSessionsThisMonth}회</div>
              <div className="text-xs text-[#8C8C8C] mt-1">12월 예정 총 수업 회차</div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section
        className="py-6 px-[22px] sm:px-8 lg:px-14 border-b border-white/[0.08] bg-[#0D0E0A]"
        aria-label="수업 필터"
      >
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#8C8C8C] mb-2">
              STATUS · 개설 상태
            </div>
            <div className="inst-filter-scroll">
              {[
                { value: 'ALL', label: '전체 상태' },
                { value: 'confirmed', label: '개설 확정' },
                { value: 'urgent', label: '마감 임박' },
                { value: 'pending', label: '개설 대기' }
              ].map((opt) => {
                const active = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(opt.value as 'ALL' | ClassStatus)}
                    className={`inst-filter-chip ${active ? 'is-active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#8C8C8C] mb-2">
              INSTRUCTOR · 강사별
            </div>
            <div className="inst-filter-scroll">
              {instructorNames.map((name) => {
                const active = instructorFilter === name;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setInstructorFilter(name)}
                    className={`inst-filter-chip ${active ? 'is-active' : ''}`}
                  >
                    {name === 'ALL' ? '전체 강사' : name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Calendar + Class Cards */}
      <main className="py-12 sm:py-16 px-[22px] sm:px-8 lg:px-14 border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Calendar Column (Desktop/Tablet Monthly Grid, Mobile Weekly List) */}
          <section className="lg:col-span-5 bg-[#0E0F0B] border border-white/[0.1] rounded-[2px] p-5 sm:p-6" aria-label="수업 달력">
            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#C6FF00]" aria-hidden="true" />
                <h2 className="ff-disp text-xl sm:text-2xl">{monthLabel}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMonthOffset(0)}
                  disabled={monthOffset === 0}
                  aria-label="이전 달"
                  className="w-11 h-11 flex items-center justify-center border border-white/[0.16] rounded-[2px] text-[#F2F2F2] disabled:opacity-30 hover:border-[#C6FF00] cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setMonthOffset(1)}
                  disabled={monthOffset === 1}
                  aria-label="다음 달"
                  className="w-11 h-11 flex items-center justify-center border border-white/[0.16] rounded-[2px] text-[#F2F2F2] disabled:opacity-30 hover:border-[#C6FF00] cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Desktop / Tablet Monthly Grid (hidden on <= 600px) */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#8C8C8C] mb-2">
                {WEEKDAYS_KO.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((cell, idx) => {
                  if (!cell.day) {
                    return <div key={`empty-${idx}`} className="h-12 rounded-[2px] bg-white/[0.01]" />;
                  }
                  const dayEvents = eventsByDay.get(cell.day) || [];
                  const isSelected = selectedDay === cell.day;
                  return (
                    <button
                      key={cell.day}
                      type="button"
                      onClick={() => setSelectedDay(cell.day)}
                      aria-pressed={isSelected}
                      aria-label={`${currentMonthIndex + 1}월 ${cell.day}일 수업 ${dayEvents.length}건`}
                      className={`h-12 rounded-[2px] border text-left p-1.5 flex flex-col justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#C6FF00] bg-[#C6FF00]/12'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.25]'
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${isSelected ? 'text-[#C6FF00]' : 'text-[#F2F2F2]'}`}>
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {dayEvents.map((ev) => (
                            <span
                              key={ev.id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ev.instructorAccent }}
                              title={ev.title}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Date Detail */}
              <div className="mt-5 pt-4 border-t border-white/[0.08]">
                <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#8C8C8C] mb-2">
                  {selectedDay ? `${currentMonthIndex + 1}월 ${selectedDay}일 일정` : '날짜를 선택하세요'}
                </div>
                {monthOffset === 1 || selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-[#8C8C8C]">선택한 날짜에 예정된 수업이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-black/50 border border-white/[0.08] rounded-[2px] flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#F2F2F2]">{ev.title}</div>
                          <div className="text-[11px] text-[#8C8C8C]">
                            {ev.timeLabel} · {ev.instructorName}
                          </div>
                        </div>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.instructorAccent }}
                          aria-hidden="true"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Weekly List Alternative (visible on <= 600px) */}
            <div className="sm:hidden space-y-2.5">
              {monthOffset === 1 || mobileWeeklyList.length === 0 ? (
                <p className="text-sm text-[#8C8C8C] py-4">
                  이 달에는 아직 공개된 수업 일정이 없습니다.
                </p>
              ) : (
                mobileWeeklyList.map(([day, items]) => {
                  const weekday = WEEKDAYS_KO[new Date(currentYear, currentMonthIndex, day).getDay()];
                  return (
                    <div
                      key={day}
                      className="p-3.5 bg-black/50 border border-white/[0.08] rounded-[2px]"
                    >
                      <div className="text-xs font-extrabold text-[#C6FF00] mb-2">
                        12월 {day}일 ({weekday})
                      </div>
                      <div className="space-y-2">
                        {items.map((ev) => (
                          <div key={ev.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-[#F2F2F2]">{ev.title}</span>
                            <span className="text-[#8C8C8C] shrink-0">{ev.timeLabel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Class Cards Column */}
          <section className="lg:col-span-7 space-y-5" aria-label="수업 목록">
            {filteredClasses.length === 0 ? (
              <div className="border border-white/[0.1] bg-[#11120E] rounded-[2px] p-10 text-center">
                <p className="text-base font-bold text-[#F2F2F2] mb-2">
                  지금 조건에 맞는 수업이 없어요.
                </p>
                <p className="text-sm text-[#8C8C8C] mb-6">
                  필터를 초기화하거나 카카오톡 채널(@AI다함스튜디오)로 새 수업 소식을 받아보세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setInstructorFilter('ALL');
                  }}
                  className="hero-cta"
                >
                  전체 수업 보기 →
                </button>
              </div>
            ) : (
              filteredClasses.map((cls) => {
                const fillPercent = Math.min(100, Math.round((cls.enrolled / cls.capacity) * 100));
                const minPercent = Math.round((cls.minToOpen / cls.capacity) * 100);
                const isConfirmed = cls.enrolled >= cls.minToOpen;

                return (
                  <article
                    key={cls.id}
                    className={`rounded-[2px] p-6 sm:p-7 border transition-colors ${
                      cls.status === 'confirmed'
                        ? 'bg-gradient-to-br from-[#12160A] to-[#0B0B0B] border-[#C6FF00]/45 shadow-[0_0_40px_rgba(198,255,0,0.06)]'
                        : 'bg-gradient-to-br from-[#13130C] to-[#0B0B0B] border-white/[0.1]'
                    }`}
                  >
                    {/* Header: Badge + Cohort */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] ${
                            cls.status === 'confirmed'
                              ? 'bg-[#C6FF00] text-[#0A0A0A]'
                              : cls.status === 'urgent'
                                ? 'border border-[#F2F2F2] text-[#F2F2F2]'
                                : 'border border-white/40 text-[#8C8C8C]'
                          }`}
                        >
                          {cls.statusLabel}
                        </span>
                        <span className="text-xs font-bold text-[#8C8C8C]">{cls.cohort}</span>
                      </div>
                      {cls.isExample && (
                        <span className="text-[10px] font-bold text-[#8C8C8C] border border-white/[0.12] px-2 py-0.5 rounded-[2px]">
                          예시 데이터
                        </span>
                      )}
                    </div>

                    {/* Title + Instructor + Schedule Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                      <div>
                        <h3 className="ff-disp text-[28px] sm:text-[32px] leading-tight mb-2">
                          {cls.title}
                        </h3>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black"
                            style={{ borderColor: cls.instructorAccent, color: cls.instructorAccent }}
                          >
                            {cls.instructorInitials}
                          </span>
                          <span className="text-sm font-bold text-[#F2F2F2]">{cls.instructorName}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-[#8C8C8C] sm:text-right">
                        <div className="flex sm:justify-end items-center gap-1.5 text-[#F2F2F2] font-semibold">
                          <Clock size={13} className="text-[#C6FF00]" aria-hidden="true" />
                          <span>{cls.weekdayLabel} {cls.timeLabel}</span>
                        </div>
                        <div>시작: {cls.startDateLabel}</div>
                        <div className="flex sm:justify-end items-center gap-1">
                          <MapPin size={12} aria-hidden="true" />
                          <span>{cls.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Enrollment Bar */}
                    <div className="bg-black/45 border border-white/[0.08] rounded-[2px] p-4 mb-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
                        <div className="flex items-baseline gap-2">
                          <Users size={14} className="text-[#C6FF00] self-center" aria-hidden="true" />
                          <span className="text-xs font-bold text-[#8C8C8C]">현재 신청</span>
                          <span className="ff-disp text-[28px] leading-none text-[#F2F2F2]">
                            {cls.enrolled}
                          </span>
                          <span className="text-xs font-bold text-[#8C8C8C]">
                            명 / 정원 {cls.capacity}명
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#C6FF00]">
                          {cls.nextDropHint}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div
                        role="progressbar"
                        aria-valuenow={cls.enrolled}
                        aria-valuemin={0}
                        aria-valuemax={cls.capacity}
                        aria-label={`${cls.title} 신청 인원 ${cls.enrolled}명 / 정원 ${cls.capacity}명`}
                        className="relative h-2.5 bg-white/[0.08] rounded-[2px] overflow-hidden"
                      >
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${fillPercent}%`,
                            backgroundColor: isConfirmed ? 'var(--acid)' : 'var(--ink)'
                          }}
                        />
                        {/* Min-to-open marker */}
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-[#0A0A0A]"
                          style={{ left: `${minPercent}%` }}
                          title={`최소 개설 ${cls.minToOpen}명`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-[#8C8C8C] mt-1.5">
                        <span>0명</span>
                        <span>{cls.minToOpen}명 개설</span>
                        <span>10 · 14 · 18명 할인</span>
                        <span>{cls.capacity}명</span>
                      </div>
                    </div>

                    {/* Footer Price + Button Only */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <div>
                        <div className="text-[11px] font-bold text-[#8C8C8C]">
                          현재 인원 기준 회당 (기본 {cls.basePrice.toLocaleString('ko-KR')}원)
                        </div>
                        <div className="ff-disp text-2xl sm:text-3xl text-[#C6FF00]">
                          {cls.currentPrice.toLocaleString('ko-KR')}원
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {cls.id === 'class-1st-ai' && (
                          <Link to="/class" className="hero-cta-secondary">
                            수강료 계산기 →
                          </Link>
                        )}
                        {(() => {
                          const classQuery = `classId=${encodeURIComponent(cls.id)}&classTitle=${encodeURIComponent(cls.title)}&instructor=${encodeURIComponent(cls.instructorName)}&schedule=${encodeURIComponent(`${cls.weekdayLabel} ${cls.timeLabel}`)}`;
                          const applyTo = `${activeApplyTarget}${activeApplyTarget.includes('?') ? '&' : '?'}${classQuery}`;
                          const inquiryTo = `${siteSettings.classInquiryFormUrl}${siteSettings.classInquiryFormUrl.includes('?') ? '&' : '?'}${classQuery}`;

                          if (canApply) {
                            return isInternalFormUrl(activeApplyTarget) ? (
                              <Link to={applyTo} className="hero-cta">
                                사전 신청하기 →
                              </Link>
                            ) : (
                              <a
                                href={activeApplyTarget}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hero-cta"
                              >
                                사전 신청하기 <ExternalLink size={14} />
                              </a>
                            );
                          }

                          return isInternalFormUrl(siteSettings.classInquiryFormUrl) ? (
                            <Link to={inquiryTo} className="hero-cta">
                              수강 · 개설 문의 →
                            </Link>
                          ) : (
                            <a
                              href={siteSettings.classInquiryFormUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hero-cta"
                            >
                              신청 준비 중 (문의) <ExternalLink size={14} />
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <div className="footer-logo">
          <CrystalCube size={34} pfx="schftr" />
          <span className="footer-logo-text uppercase tracking-widest">DO-DAHAM</span>
        </div>
        <div className="footer-copy">
          <div>do-daham.com</div>
          <div>문의 · 카카오톡 @AI다함스튜디오</div>
          <div className="acid mt-1">CREATIVE REBELS · AI STUDIO × EDUCATION</div>
        </div>
      </footer>
    </div>
  );
}
