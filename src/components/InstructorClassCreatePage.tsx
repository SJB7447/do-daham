import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, CheckCircle2, Clock, LogOut, MapPin, Menu, Save, Sparkles, Users } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { ADMIN_EMAILS } from '../data/defaultActivities';
import { CrystalCube } from './CrystalCube';
import { MobileMenuOverlay } from './MobileMenuOverlay';
import { LetterLimitTextarea } from './LetterLimitTextarea';

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function generateSessionDates(startDateStr: string, count: number): string[] {
  if (!startDateStr) return [];
  const base = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) return [];

  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayName = WEEKDAYS_KO[d.getDay()];
    dates.push(`${yyyy}.${mm}.${dd} (${dayName})`);
  }
  return dates;
}

export default function InstructorClassCreatePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorizedInstructor, setIsAuthorizedInstructor] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('AI 영상 · 연출');
  const [audience, setAudience] = useState('입문자 · 1인 사업자 · 직장인');

  const [startDate, setStartDate] = useState('2026-12-01');
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('21:30');
  const [sessionCount, setSessionCount] = useState<4 | 6 | 8>(6);
  const [location, setLocation] = useState('서울/경기 오프라인 (확정 시 안내)');

  const [capacity, setCapacity] = useState(20);
  const [minToOpen, setMinToOpen] = useState(6);
  const [basePrice, setBasePrice] = useState(25000);
  const [curriculum, setCurriculum] = useState<Array<{ title: string; output: string }>>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      title: `${i + 1}회차 실습`,
      output: ''
    }))
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorizedInstructor(false);
        setAuthLoading(false);
        return;
      }
      const isAdminUser = ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());
      try {
        const snap = await getDoc(doc(db, 'instructors', currentUser.uid));
        setIsAuthorizedInstructor(isAdminUser || snap.exists());
      } catch {
        setIsAuthorizedInstructor(isAdminUser);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCurriculum((prev) => {
      if (prev.length === sessionCount) return prev;
      if (prev.length > sessionCount) return prev.slice(0, sessionCount);
      return [
        ...prev,
        ...Array.from({ length: sessionCount - prev.length }, (_, idx) => ({
          title: `${prev.length + idx + 1}회차 실습`,
          output: ''
        }))
      ];
    });
  }, [sessionCount]);

  const generatedDates = useMemo(
    () => generateSessionDates(startDate, sessionCount),
    [startDate, sessionCount]
  );

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google 로그인에 실패했습니다.');
    }
  };

  const handleSaveClass = async (submitForApproval: boolean) => {
    if (!user) return;
    setErrorMsg('');
    setNotice('');

    if (!title.trim() || !summary.trim()) {
      setErrorMsg('수업 제목과 한 줄 소개를 입력해 주세요.');
      setStep(1);
      return;
    }

    setSaving(true);
    const status = submitForApproval ? 'pending' : 'draft';
    try {
      await addDoc(collection(db, 'classes'), {
        instructorUid: user.uid,
        instructorEmail: (user.email || '').toLowerCase(),
        title: title.trim(),
        summary: summary.trim(),
        category,
        audience: audience.trim(),
        startDate,
        startTime,
        endTime,
        sessionCount,
        sessions: generatedDates,
        location: location.trim(),
        capacity,
        minToOpen,
        basePrice,
        curriculum,
        enrolledCount: 0,
        status,
        createdAt: serverTimestamp()
      });
      setNotice(
        submitForApproval
          ? '수업이 등록되어 운영자 승인 요청 상태로 저장되었습니다.'
          : '수업 초안이 저장되었습니다.'
      );
    } catch (err: any) {
      setErrorMsg('저장 중 오류가 발생했습니다: ' + (err?.message || 'Firestore 규칙을 확인하세요.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Instructor Mode Top Nav */}
      <nav className="bar scrolled">
        <div className="flex items-center gap-3">
          <Link to="/" className="nav-logo">
            <CrystalCube size={26} pfx="clsnew" />
            <span className="nav-logo-text uppercase tracking-wider">DO-DAHAM</span>
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-widest bg-[#C6FF00] text-[#0A0A0A] rounded-[2px]">
            강사 모드
          </span>
        </div>

        <div className="nav-links">
          <Link to="/instructor/profile">내 프로필</Link>
          <Link to="/instructor/classes">내 수업 관리</Link>
          <Link to="/instructor/classes/new" className="nav-class-link">
            <span className="nav-class-dot" aria-hidden="true" />
            수업 등록
          </Link>
          <Link to="/class/instructors">공개 강사진</Link>
          <Link to="/class/schedule">일정표</Link>
        </div>

        <div className="nav-actions-right">
          {user && (
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="text-xs font-bold text-[#8C8C8C] hover:text-[#E02898] inline-flex items-center gap-1.5 min-h-[44px] px-2 cursor-pointer"
            >
              <LogOut size={14} /> 로그아웃
            </button>
          )}
          <button
            ref={menuBtnRef}
            type="button"
            className="nav-menu-btn"
            aria-label="강사 메뉴 열기"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-overlay"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <MobileMenuOverlay
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        triggerRef={menuBtnRef}
        mode="instructor"
      />

      <main className="pt-28 sm:pt-32 pb-20 px-[22px] sm:px-8 lg:px-14 max-w-6xl mx-auto">
        {authLoading ? (
          <div className="py-24 text-center text-sm text-[#8C8C8C]">계정 상태를 확인하는 중...</div>
        ) : !user ? (
          <div className="max-w-lg mx-auto my-12 bg-[#11120E] border border-white/[0.14] rounded-[2px] p-8 text-center">
            <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-3">
              INSTRUCTOR MODE
            </div>
            <h1 className="ff-disp text-3xl sm:text-4xl mb-3">새 수업 등록</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              Google 계정으로 로그인한 뒤 수업 일정과 회차별 강의 계획을 작성해 운영자 승인을 요청할 수 있습니다.
            </p>
            {errorMsg && (
              <p className="mb-4 p-3 border border-[#E02898] text-[#E02898] text-xs font-bold rounded-[2px]">
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full min-h-[52px] bg-[#F2F2F2] text-[#0A0A0A] font-extrabold text-sm rounded-[2px] hover:bg-[#C6FF00] transition-colors cursor-pointer"
            >
              Google 계정으로 로그인 →
            </button>
          </div>
        ) : !isAuthorizedInstructor ? (
          <div className="max-w-lg mx-auto my-12 bg-[#11120E] border border-[#E02898]/50 rounded-[2px] p-8 text-center">
            <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#E02898] mb-3">
              ACCESS RESTRICTED
            </div>
            <h1 className="ff-disp text-3xl mb-3">초대된 강사 전용 페이지입니다</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              현재 로그인된 계정({user.email})은 강사 초대를 통해 등록된 계정이 아닙니다.
              운영자에게 강사 초대 링크를 요청해 가입을 완료해 주세요.
            </p>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="hero-cta w-full justify-center"
            >
              로그아웃 후 다른 계정으로 로그인
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-white/[0.08]">
              <div>
                <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-2">
                  NEW CLASS · 3단계 작성
                </div>
                <h1 className="ff-disp text-3xl sm:text-5xl leading-tight">수업 일정 · 강의 계획 등록</h1>
              </div>

              <Link to="/instructor/profile" className="hero-cta-secondary">
                ← 내 프로필 편집
              </Link>
            </div>

            {/* 3-Step Indicator */}
            <div className="grid grid-cols-3 gap-2.5 mb-8">
              {[
                { n: 1 as const, label: '01 수업 소개' },
                { n: 2 as const, label: '02 일정 · 장소' },
                { n: 3 as const, label: '03 정원 · 강의 계획' }
              ].map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStep(s.n)}
                  className={`min-h-[48px] px-3 rounded-[2px] border text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                    step === s.n
                      ? 'bg-[#C6FF00] border-[#C6FF00] text-[#0A0A0A]'
                      : 'bg-[#0E0F0B] border-white/[0.14] text-[#8C8C8C] hover:text-[#F2F2F2]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Step Form */}
              <div className="lg:col-span-7 bg-[#0E0F0B] border border-white/[0.1] rounded-[2px] p-6 sm:p-8 space-y-6">
                {step === 1 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">수업 제목 *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: AI 숏폼 · 사운드 실전 클래스"
                        className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="class-summary-input" className="block text-xs font-bold text-[#8C8C8C] mb-1.5">
                        한 줄 소개 * (120자 이내)
                      </label>
                      <LetterLimitTextarea
                        id="class-summary-input"
                        rows={3}
                        limit={120}
                        nearThreshold={20}
                        value={summary}
                        onChange={setSummary}
                        placeholder="수강생이 완성하게 될 핵심 결과물을 간단히 적어주세요."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">분야</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        >
                          <option value="AI 영상 · 연출">AI 영상 · 연출</option>
                          <option value="홈페이지 · 웹 구축">홈페이지 · 웹 구축</option>
                          <option value="AI 업무 자동화">AI 업무 자동화</option>
                          <option value="AI 사운드 · 숏폼">AI 사운드 · 숏폼</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">추천 대상</label>
                        <input
                          type="text"
                          value={audience}
                          onChange={(e) => setAudience(e.target.value)}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setStep(2)} className="hero-cta">
                        다음: 일정 · 장소 →
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">첫 수업일</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">총 회차</label>
                        <div className="grid grid-cols-3 gap-2">
                          {([4, 6, 8] as const).map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => setSessionCount(cnt)}
                              className={`min-h-[48px] rounded-[2px] border text-sm font-extrabold cursor-pointer ${
                                sessionCount === cnt
                                  ? 'bg-[#C6FF00] border-[#C6FF00] text-[#0A0A0A]'
                                  : 'border-white/[0.18] text-[#8C8C8C]'
                              }`}
                            >
                              {cnt}회
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">시작 시간</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">종료 시간</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">수업 장소</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                      />
                    </div>

                    <div className="bg-black/50 border border-white/[0.08] rounded-[2px] p-4">
                      <div className="text-[11px] font-extrabold tracking-[0.14em] text-[#C6FF00] mb-2">
                        자동 생성된 회차별 날짜 ({generatedDates.length}회)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {generatedDates.map((d, i) => (
                          <span
                            key={d}
                            className="text-xs px-2.5 py-1 bg-white/[0.04] border border-white/[0.1] rounded-[2px]"
                          >
                            {i + 1}회 · {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between gap-3">
                      <button type="button" onClick={() => setStep(1)} className="hero-cta-secondary">
                        ← 이전
                      </button>
                      <button type="button" onClick={() => setStep(3)} className="hero-cta">
                        다음: 정원 · 강의 계획 →
                      </button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <div className="text-xs font-bold text-[#8C8C8C] mb-2">
                        DO-DAHAM 공식 정원 · 수강료 프리셋 선택
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { label: '개인 특화 · 공모전 (1~5명)', desc: '회당 80,000원', min: 1, cap: 5, price: 80000 },
                          { label: '스탠다드 (10~15명)', desc: '회당 25,000원', min: 10, cap: 15, price: 25000 },
                          { label: '대규모 (16~30명)', desc: '회당 15,000원', min: 16, cap: 30, price: 15000 }
                        ].map((preset) => {
                          const active = capacity === preset.cap && basePrice === preset.price;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setMinToOpen(preset.min);
                                setCapacity(preset.cap);
                                setBasePrice(preset.price);
                              }}
                              className={`p-3 rounded-[2px] border text-left cursor-pointer transition-colors ${
                                active
                                  ? 'border-[#C6FF00] bg-[#C6FF00]/12 text-[#F2F2F2]'
                                  : 'border-white/[0.14] text-[#8C8C8C] hover:border-white/35'
                              }`}
                            >
                              <div className="text-xs font-extrabold">{preset.label}</div>
                              <div className={`text-xs font-bold mt-0.5 ${active ? 'text-[#C6FF00]' : ''}`}>
                                {preset.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">최소 개설 인원</label>
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={minToOpen}
                          onChange={(e) => setMinToOpen(Number(e.target.value))}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">최대 정원</label>
                        <input
                          type="number"
                          min={4}
                          max={50}
                          value={capacity}
                          onChange={(e) => setCapacity(Number(e.target.value))}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">회당 기본가 (원)</label>
                        <input
                          type="number"
                          step={1000}
                          min={10000}
                          value={basePrice}
                          onChange={(e) => setBasePrice(Number(e.target.value))}
                          className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-bold text-[#8C8C8C]">회차별 강의 계획 및 OUTPUT</div>
                      {curriculum.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-black/40 border border-white/[0.08] rounded-[2px]">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              setCurriculum((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, title: e.target.value } : c))
                              )
                            }
                            placeholder={`${idx + 1}회차 주제`}
                            className="min-h-[44px] px-3 bg-black border border-white/[0.14] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                          />
                          <input
                            type="text"
                            value={item.output}
                            onChange={(e) =>
                              setCurriculum((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, output: e.target.value } : c))
                              )
                            }
                            placeholder="완성 결과물 (예: 숏폼 1편)"
                            className="min-h-[44px] px-3 bg-black border border-white/[0.14] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                          />
                        </div>
                      ))}
                    </div>

                    {errorMsg && (
                      <p className="p-3.5 border border-[#E02898] bg-[#E02898]/10 text-[#E02898] text-xs font-bold rounded-[2px]">
                        {errorMsg}
                      </p>
                    )}
                    {notice && (
                      <p className="p-3.5 border border-[#C6FF00] bg-[#C6FF00]/10 text-[#C6FF00] text-xs font-bold rounded-[2px] flex items-center gap-2">
                        <CheckCircle2 size={15} /> {notice}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button type="button" onClick={() => setStep(2)} className="hero-cta-secondary justify-center">
                        ← 이전
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveClass(true)}
                        className="hero-cta flex-1 justify-center"
                      >
                        <Save size={15} /> {saving ? '저장 중...' : '저장 후 승인 요청 →'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveClass(false)}
                        className="hero-cta-secondary justify-center"
                      >
                        임시 저장
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Live Schedule Card Preview */}
              <aside className="lg:col-span-5 lg:sticky lg:top-24">
                <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-3 flex items-center gap-1.5">
                  <Sparkles size={13} /> LIVE PREVIEW · 일정표 카드 미리보기
                </div>
                <div className="bg-gradient-to-br from-[#13130C] to-[#0B0B0B] border border-[#C6FF00]/45 rounded-[2px] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] border border-[#F5C400] text-[#F5C400]">
                      승인 요청 예정
                    </span>
                    <span className="text-xs font-bold text-[#8C8C8C]">
                      {category} · {sessionCount}회
                    </span>
                  </div>

                  <div>
                    <h2 className="ff-disp text-2xl sm:text-3xl leading-tight mb-1.5">
                      {title || '수업 제목을 입력해 주세요'}
                    </h2>
                    <p className="text-xs text-[#8C8C8C] leading-relaxed break-keep">
                      {summary || '한 줄 소개가 이곳에 표시됩니다.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#8C8C8C] pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center gap-2 text-[#F2F2F2] font-semibold">
                      <Calendar size={13} className="text-[#C6FF00]" />
                      <span>첫 수업: {generatedDates[0] || startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-[#C6FF00]" />
                      <span>{startTime} – {endTime} ({sessionCount}주)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} />
                      <span>{location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={13} />
                      <span>최소 {minToOpen}명 개설 · 정원 {capacity}명</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] flex items-baseline justify-between">
                    <span className="text-xs text-[#8C8C8C]">회당 기본가</span>
                    <span className="ff-disp text-2xl text-[#C6FF00]">
                      {basePrice.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
