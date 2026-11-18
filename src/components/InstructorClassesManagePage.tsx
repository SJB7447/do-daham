import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Calendar, CheckCircle2, Clock, MapPin, Plus, Save, Users, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { ADMIN_EMAILS } from '../data/defaultActivities';
import { clearApprovedInstructorsCache } from '../lib/instructorsData';
import { SiteHeader } from './SiteHeader';
import { InstructorQuickTabs } from './InstructorQuickTabs';

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function buildSessionDates(startDateStr: string, count: number): string[] {
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
    dates.push(`${yyyy}.${mm}.${dd} (${WEEKDAYS_KO[d.getDay()]})`);
  }
  return dates;
}

interface InstructorClassDoc {
  id: string;
  title: string;
  summary: string;
  category: string;
  startDate: string;
  startTime: string;
  endTime: string;
  sessionCount: number;
  sessions: string[];
  location: string;
  capacity: number;
  minToOpen: number;
  basePrice: number;
  enrolledCount: number;
  status: string;
  started: boolean;
}

export default function InstructorClassesManagePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorizedInstructor, setIsAuthorizedInstructor] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [classes, setClasses] = useState<InstructorClassDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [editing, setEditing] = useState<InstructorClassDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadMyClasses = async (uid: string, adminFlag = false) => {
    setLoadingList(true);
    try {
      const targetRef = adminFlag
        ? collection(db, 'classes')
        : query(collection(db, 'classes'), where('instructorUid', '==', uid));
      const snap = await getDocs(targetRef);
      const list: InstructorClassDoc[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: String(d.title || '제목 없음'),
          summary: String(d.summary || ''),
          category: String(d.category || 'AI 영상 · 연출'),
          startDate: String(d.startDate || ''),
          startTime: String(d.startTime || '19:30'),
          endTime: String(d.endTime || '21:30'),
          sessionCount: Number(d.sessionCount || 6),
          sessions: Array.isArray(d.sessions) ? d.sessions : [],
          location: String(d.location || ''),
          capacity: Number(d.capacity || 15),
          minToOpen: Number(d.minToOpen || 1),
          basePrice: Number(d.basePrice || 25000),
          enrolledCount: Number(d.enrolledCount || 0),
          status: String(d.status || 'draft'),
          started: Boolean(d.started)
        };
      });
      setClasses(list);
    } catch (err) {
      console.warn('Failed to load instructor classes:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorizedInstructor(false);
        setIsAdminUser(false);
        setAuthLoading(false);
        return;
      }

      const adminFlag = ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());
      setIsAdminUser(adminFlag);
      try {
        const snap = await getDoc(doc(db, 'instructors', currentUser.uid));
        const ok = adminFlag || snap.exists();
        setIsAuthorizedInstructor(ok);
        if (ok) {
          await loadMyClasses(currentUser.uid, adminFlag);
        }
      } catch {
        setIsAuthorizedInstructor(adminFlag);
        if (adminFlag) {
          await loadMyClasses(currentUser.uid, true);
        }
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

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

  const handleSaveEdit = async (submitForApproval: boolean) => {
    if (!editing || !user) return;
    setErrorMsg('');
    setNotice('');
    setSaving(true);

    const nextStatus = submitForApproval
      ? isAdminUser
        ? editing.status === 'confirmed' || editing.status === 'started'
          ? editing.status
          : 'published'
        : 'pending'
      : 'draft';
    try {
      await updateDoc(doc(db, 'classes', editing.id), {
        title: editing.title.trim(),
        summary: editing.summary.trim(),
        startDate: editing.startDate,
        startTime: editing.startTime,
        endTime: editing.endTime,
        sessions: editing.sessions.filter((s) => s.trim()),
        location: editing.location.trim(),
        status: nextStatus
      });
      clearApprovedInstructorsCache();

      setClasses((prev) =>
        prev.map((c) =>
          c.id === editing.id ? { ...editing, status: nextStatus } : c
        )
      );
      setNotice(
        submitForApproval
          ? isAdminUser
            ? `[${editing.title}] 일정 수정이 저장되어 일정표에 즉시 공개 반영되었습니다.`
            : `[${editing.title}] 일정 수정이 저장되어 운영자 승인 요청 상태로 전환되었습니다.`
          : `[${editing.title}] 초안으로 저장되었습니다.`
      );
      setEditing(null);
    } catch (err: any) {
      setErrorMsg('일정 수정 저장 중 오류가 발생했습니다: ' + (err?.message || '권한을 확인하세요.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      <SiteHeader
        badge="강사 모드"
        ctaLabel="수업 일정표 →"
        ctaTo="/class/schedule"
      />

      <main className="pt-28 sm:pt-32 pb-20 px-[22px] sm:px-8 lg:px-14 max-w-5xl mx-auto">
        {user && isAuthorizedInstructor && <InstructorQuickTabs />}
        {authLoading ? (
          <div className="py-24 text-center text-sm text-[#8C8C8C]">계정 상태를 확인하는 중...</div>
        ) : !user ? (
          <div className="max-w-lg mx-auto my-12 bg-[#11120E] border border-white/[0.14] rounded-[2px] p-8 text-center">
            <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-3">
              INSTRUCTOR MODE
            </div>
            <h1 className="ff-disp text-3xl sm:text-4xl mb-3">내 수업 일정 관리</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              본인이 등록한 수업 일정·회차 날짜·장소를 직접 정리하고 수정할 수 있습니다.
            </p>
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
                  MY CLASSES · 본인 수업 전용
                </div>
                <h1 className="ff-disp text-3xl sm:text-5xl leading-tight">내 수업 일정 관리</h1>
                <p className="text-xs sm:text-sm text-[#8C8C8C] mt-2 break-keep">
                  본인이 등록한 수업의 날짜·시간·장소·회차 일정을 직접 수정하고 운영자에게 승인 요청할 수 있습니다. (다른 강사 수업 및 관리자 권한에는 접근할 수 없습니다.)
                </p>
              </div>

              <Link to="/instructor/classes/new" className="hero-cta shrink-0">
                <Plus size={15} /> 새 수업 등록하기
              </Link>
            </div>

            {notice && (
              <div className="mb-6 p-4 border border-[#C6FF00] bg-[#C6FF00]/10 text-[#C6FF00] text-xs font-bold rounded-[2px] flex items-center gap-2">
                <CheckCircle2 size={15} /> {notice}
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 border border-[#E02898] bg-[#E02898]/10 text-[#E02898] text-xs font-bold rounded-[2px]">
                {errorMsg}
              </div>
            )}

            {loadingList ? (
              <div className="py-16 text-center text-sm text-[#8C8C8C]">수업 목록을 불러오는 중...</div>
            ) : classes.length === 0 ? (
              <div className="border border-dashed border-white/[0.16] bg-[#0E0F0B] rounded-[2px] p-10 text-center">
                <p className="text-base font-bold mb-2">아직 등록한 수업이 없습니다.</p>
                <p className="text-xs text-[#8C8C8C] mb-6">
                  첫 수업을 등록하면 이곳에서 회차별 날짜와 장소를 자유롭게 정리할 수 있습니다.
                </p>
                <Link to="/instructor/classes/new" className="hero-cta">
                  첫 수업 등록하기 →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="bg-[#0E0F0B] border border-white/[0.12] rounded-[2px] p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-[10px] font-extrabold tracking-[0.12em] px-2.5 py-1 rounded-[2px] border ${
                              cls.started || cls.status === 'confirmed' || cls.status === 'published'
                                ? 'border-[#C6FF00] text-[#C6FF00]'
                                : cls.status === 'rejected'
                                  ? 'border-[#E02898] text-[#E02898]'
                                  : 'border-[#F5C400] text-[#F5C400]'
                            }`}
                          >
                            {cls.started ? '수업 시작됨' : `상태: ${cls.status}`}
                          </span>
                          <span className="text-xs text-[#8C8C8C]">
                            {cls.category} · {cls.sessionCount}회
                          </span>
                        </div>
                        <h2 className="ff-disp text-2xl sm:text-3xl mb-1">{cls.title}</h2>
                        <p className="text-xs text-[#8C8C8C]">{cls.summary}</p>
                      </div>

                      {!cls.started && (
                        <button
                          type="button"
                          onClick={() => setEditing({ ...cls })}
                          className="hero-cta-secondary shrink-0"
                        >
                          일정 · 장소 정리하기
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.08] text-xs text-[#8C8C8C]">
                      <div className="flex items-center gap-2 text-[#F2F2F2]">
                        <Calendar size={13} className="text-[#C6FF00]" />
                        <span>시작일: {cls.startDate || '미정'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-[#C6FF00]" />
                        <span>{cls.startTime} – {cls.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={13} />
                        <span>{cls.location || '확정 시 안내'}</span>
                      </div>
                    </div>

                    {cls.sessions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {cls.sessions.map((s, idx) => (
                          <span
                            key={`${cls.id}-s-${idx}`}
                            className="text-[11px] px-2.5 py-1 bg-black/50 border border-white/[0.08] rounded-[2px] text-[#F2F2F2]/85"
                          >
                            {idx + 1}회 · {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-[#8C8C8C] flex items-center gap-1.5">
                      <Users size={12} /> 신청 {cls.enrolledCount}명 / 정원 {cls.capacity}명 · 회당 {cls.basePrice.toLocaleString('ko-KR')}원
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Schedule Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-[320] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl bg-[#0D0E0A] border border-white/[0.16] rounded-[2px] p-6 sm:p-7 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#C6FF00]">
                  EDIT SCHEDULE
                </div>
                <h3 className="ff-disp text-2xl mt-1">수업 일정 정리</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="닫기"
                className="w-10 h-10 flex items-center justify-center border border-white/20 rounded-[2px] text-[#F2F2F2]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8C8C8C] mb-1">수업 제목</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full min-h-[44px] px-3 bg-black border border-white/20 rounded-[2px] text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C8C8C] mb-1">첫 수업일</label>
                  <input
                    type="date"
                    value={editing.startDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setEditing({
                        ...editing,
                        startDate: nextDate,
                        sessions: buildSessionDates(nextDate, editing.sessionCount)
                      });
                    }}
                    className="w-full min-h-[44px] px-3 bg-black border border-white/20 rounded-[2px] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C8C8C] mb-1">시작 시간</label>
                  <input
                    type="time"
                    value={editing.startTime}
                    onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
                    className="w-full min-h-[44px] px-3 bg-black border border-white/20 rounded-[2px] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C8C8C] mb-1">종료 시간</label>
                  <input
                    type="time"
                    value={editing.endTime}
                    onChange={(e) => setEditing({ ...editing, endTime: e.target.value })}
                    className="w-full min-h-[44px] px-3 bg-black border border-white/20 rounded-[2px] text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C8C8C] mb-1">수업 장소</label>
                <input
                  type="text"
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  className="w-full min-h-[44px] px-3 bg-black border border-white/20 rounded-[2px] text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">
                  회차별 날짜 (휴강·보강 일정 직접 수정 가능)
                </label>
                <div className="space-y-2">
                  {editing.sessions.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#C6FF00] w-10">{idx + 1}회</span>
                      <input
                        type="text"
                        value={s}
                        onChange={(e) => {
                          const next = [...editing.sessions];
                          next[idx] = e.target.value;
                          setEditing({ ...editing, sessions: next });
                        }}
                        className="flex-1 min-h-[40px] px-3 bg-black border border-white/15 rounded-[2px] text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveEdit(true)}
                className="hero-cta flex-1 justify-center"
              >
                <Save size={15} />{' '}
                {saving
                  ? '저장 중...'
                  : isAdminUser
                    ? '일정 저장 · 즉시 공개 반영 →'
                    : '일정 저장 · 승인 요청 →'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveEdit(false)}
                className="hero-cta-secondary justify-center"
              >
                초안 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
