import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Calendar, CheckCircle2, ImagePlus, LogOut, Menu, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { ADMIN_EMAILS } from '../data/defaultActivities';
import { CrystalCube } from './CrystalCube';
import { MobileMenuOverlay } from './MobileMenuOverlay';

type Weekday = '일' | '월' | '화' | '수' | '목' | '금' | '토';
const WEEK_DAYS: Weekday[] = ['일', '월', '화', '수', '목', '금', '토'];
const FIELD_TAG_PRESETS = [
  'AI 영상 연출',
  '홈페이지 · 웹 구축',
  '업무 자동화',
  'AI 사운드 · 음악',
  '숏폼 편집',
  '노코드 · 기획 AI'
];

interface InstructorFormState {
  displayName: string;
  title: string;
  bio: string;
  photoUrl: string;
  tags: string[];
  credentials: string[];
  activeDays: Weekday[];
  scheduleTime: string;
  showStats: boolean;
  lectureHours: number;
  studentCount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
}

export default function InstructorProfileEditPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorizedInstructor, setIsAuthorizedInstructor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const [form, setForm] = useState<InstructorFormState>({
    displayName: '',
    title: '',
    bio: '',
    photoUrl: '',
    tags: ['AI 영상 연출'],
    credentials: [''],
    activeDays: ['화', '목'],
    scheduleTime: '19:30 – 21:30',
    showStats: false,
    lectureHours: 0,
    studentCount: 0,
    status: 'draft'
  });

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
        if (snap.exists()) {
          setIsAuthorizedInstructor(true);
          const d = snap.data();
          setForm({
            displayName: String(d.displayName || currentUser.displayName || ''),
            title: String(d.title || ''),
            bio: String(d.bio || ''),
            photoUrl: String(d.photoUrl || ''),
            tags: Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : ['AI 영상 연출'],
            credentials:
              Array.isArray(d.credentials) && d.credentials.length > 0 ? d.credentials.slice(0, 5) : [''],
            activeDays: Array.isArray(d.activeDays) ? d.activeDays : ['화', '목'],
            scheduleTime: String(d.scheduleTime || '19:30 – 21:30'),
            showStats: Boolean(d.showStats),
            lectureHours: Number(d.lectureHours || 0),
            studentCount: Number(d.studentCount || 0),
            status: d.status || 'draft'
          });
        } else {
          setIsAuthorizedInstructor(isAdminUser);
          setForm((prev) => ({
            ...prev,
            displayName: currentUser.displayName || prev.displayName
          }));
        }
      } catch (err) {
        console.warn('Instructor profile load skipped or restricted:', err);
        setIsAuthorizedInstructor(isAdminUser);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('프로필 사진은 5MB 이하 파일만 업로드할 수 있습니다.');
      return;
    }

    setErrorMsg('');
    setUploadingPhoto(true);
    try {
      const fileRef = ref(storage, `instructors/${user.uid}_${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, photoUrl: url }));
    } catch (err: any) {
      setErrorMsg('사진 업로드 중 오류가 발생했습니다: ' + (err?.message || '권한 확인 필요'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  const toggleAllTags = () => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.length === FIELD_TAG_PRESETS.length ? [] : [...FIELD_TAG_PRESETS]
    }));
  };

  const toggleDay = (day: Weekday) => {
    setForm((prev) => {
      const exists = prev.activeDays.includes(day);
      return {
        ...prev,
        activeDays: exists ? prev.activeDays.filter((d) => d !== day) : [...prev.activeDays, day]
      };
    });
  };

  const updateCredential = (idx: number, val: string) => {
    setForm((prev) => {
      const next = [...prev.credentials];
      next[idx] = val;
      return { ...prev, credentials: next };
    });
  };

  const handleSubmit = async (submitForApproval: boolean) => {
    if (!user) return;
    setErrorMsg('');
    setNotice('');

    if (!form.displayName.trim() || !form.title.trim()) {
      setErrorMsg('공개 이름과 직함은 필수 입력 항목입니다.');
      return;
    }

    setSaving(true);
    const nextStatus = submitForApproval ? 'pending' : 'draft';
    try {
      await setDoc(
        doc(db, 'instructors', user.uid),
        {
          uid: user.uid,
          emailLower: (user.email || '').toLowerCase(),
          displayName: form.displayName.trim(),
          title: form.title.trim(),
          bio: form.bio.trim().slice(0, 100),
          photoUrl: form.photoUrl.trim(),
          tags: form.tags,
          credentials: form.credentials.map((c) => c.trim()).filter(Boolean).slice(0, 5),
          activeDays: form.activeDays,
          scheduleTime: form.scheduleTime.trim(),
          showStats: form.showStats,
          lectureHours: Math.max(0, Math.floor(Number(form.lectureHours) || 0)),
          studentCount: Math.max(0, Math.floor(Number(form.studentCount) || 0)),
          status: nextStatus,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setForm((prev) => ({ ...prev, status: nextStatus }));
      setNotice(
        submitForApproval
          ? '프로필이 저장되어 운영자 승인 대기 상태로 전환되었습니다.'
          : '초안이 저장되었습니다.'
      );
    } catch (err: any) {
      setErrorMsg('저장 중 오류가 발생했습니다: ' + (err?.message || 'Firestore 규칙을 확인하세요.'));
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.displayName || user?.displayName || 'AI')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Instructor Mode Top Nav */}
      <nav className="bar scrolled">
        <div className="flex items-center gap-3">
          <Link to="/" className="nav-logo">
            <CrystalCube size={26} pfx="insted" />
            <span className="nav-logo-text uppercase tracking-wider">DO-DAHAM</span>
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-widest bg-[#C6FF00] text-[#0A0A0A] rounded-[2px]">
            강사 모드
          </span>
        </div>

        <div className="nav-links">
          <Link to="/instructor/profile" className="nav-class-link">
            <span className="nav-class-dot" aria-hidden="true" />
            내 프로필
          </Link>
          <Link to="/instructor/classes">내 수업 관리</Link>
          <Link to="/instructor/classes/new">수업 등록</Link>
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
            <h1 className="ff-disp text-3xl sm:text-4xl mb-3">강사 프로필 편집</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              초대 링크를 통해 가입한 Google 계정으로 로그인하면 공개 프로필 작성 및 승인 요청을 진행할 수 있습니다.
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-white/[0.08]">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <span
                    className={`text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] border ${
                      form.status === 'approved'
                        ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]'
                        : form.status === 'rejected'
                          ? 'border-[#E02898] text-[#E02898]'
                          : form.status === 'pending'
                            ? 'border-[#F5C400] text-[#F5C400]'
                            : 'border-white/35 text-[#8C8C8C]'
                    }`}
                  >
                    {form.status === 'approved'
                      ? '공개 승인됨'
                      : form.status === 'rejected'
                        ? '수정 후 재요청 필요'
                        : form.status === 'pending'
                          ? '● 운영자 승인 대기'
                          : '작성 중 (초안)'}
                  </span>
                  <span className="text-xs text-[#8C8C8C]">{user.email}</span>
                </div>
                <h1 className="ff-disp text-3xl sm:text-5xl leading-tight">강사 프로필 편집</h1>
              </div>

              <Link to="/instructor/classes/new" className="hero-cta-secondary">
                새 수업 등록하기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Editor Form */}
              <div className="lg:col-span-7 space-y-6 bg-[#0E0F0B] border border-white/[0.1] rounded-[2px] p-6 sm:p-8">
                {/* Photo Upload */}
                <div>
                  <label className="block text-xs font-bold text-[#8C8C8C] mb-2">
                    프로필 사진 (JPG · PNG · WEBP, 최대 5MB)
                  </label>
                  <label className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-[1.5px] border-dashed border-white/[0.22] rounded-[2px] hover:border-[#C6FF00] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 text-sm">
                      <ImagePlus size={18} className="text-[#C6FF00] shrink-0" />
                      <span className="text-[#F2F2F2]">
                        {uploadingPhoto ? '사진 업로드 중...' : '클릭해 실사 프로필 사진 올리기'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1.5 bg-white/[0.06] rounded-[2px]">
                      파일 선택
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>

                {/* Name & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8C8C8C] mb-1.5">
                      공개 이름 *
                    </label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                      placeholder="예: 심정보"
                      className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#8C8C8C]">
                        직함 · 한 줄 역할 *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            title: 'DO-DAHAM 대표 · AI 크리에이티브 디렉터'
                          }))
                        }
                        className="text-[11px] font-bold text-[#C6FF00] hover:underline cursor-pointer"
                      >
                        추천 예시 넣기
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="예: DO-DAHAM 대표 · AI 영상·웹 실무 디렉터"
                      className="w-full min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                    />
                  </div>
                </div>

                {/* Bio (100 char counter) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#8C8C8C]">강사 소개</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            bio: '도구를 외우는 수업이 아니라, 각자의 브랜드와 업무에 바로 쓰는 AI 결과물을 완성하는 실전 강의를 진행합니다.'
                          }))
                        }
                        className="text-[11px] font-bold text-[#C6FF00] hover:underline cursor-pointer"
                      >
                        추천 소개 넣기
                      </button>
                      <span className="text-xs font-bold text-[#8C8C8C]">
                        {form.bio.length} / 100자
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={100}
                    value={form.bio}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="예: 광고·숏폼·웹서비스를 직접 제작하는 현업 디렉터. 각자의 실제 결과물을 완성하는 실전 강의를 진행합니다."
                    className="w-full p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                  />
                </div>

                {/* Tags (Unlimited + Select All) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#8C8C8C]">
                      전문 분야 (가능한 분야 모두 선택)
                    </label>
                    <button
                      type="button"
                      onClick={toggleAllTags}
                      className="text-xs font-bold text-[#C6FF00] hover:underline cursor-pointer"
                    >
                      {form.tags.length === FIELD_TAG_PRESETS.length ? '선택 해제' : '전체 선택'} ({form.tags.length}개)
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FIELD_TAG_PRESETS.map((tag) => {
                      const active = form.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleTag(tag)}
                          className={`inst-filter-chip ${active ? 'is-active' : ''}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Credentials (Max 5) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#8C8C8C]">약력 · 수상 (최대 5줄)</label>
                    {form.credentials.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, credentials: [...p.credentials, ''] }))}
                        className="text-xs font-bold text-[#C6FF00] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> 약력 추가
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {form.credentials.map((cred, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={cred}
                          onChange={(e) => updateCredential(idx, e.target.value)}
                          placeholder="예: 경기관광공사 AI 영상 공모전 입상"
                          className="flex-1 min-h-[48px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                        />
                        {form.credentials.length > 1 && (
                          <button
                            type="button"
                            aria-label="약력 줄 삭제"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                credentials: p.credentials.filter((_, i) => i !== idx)
                              }))
                            }
                            className="w-12 min-h-[48px] flex items-center justify-center border border-white/[0.18] rounded-[2px] text-[#8C8C8C] hover:text-[#E02898] cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8C8C8C] mb-2">강의 가능 요일</label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEK_DAYS.map((day) => {
                        const active = form.activeDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleDay(day)}
                            className={`h-11 rounded-[2px] text-xs font-extrabold border cursor-pointer ${
                              active
                                ? 'bg-[#C6FF00] border-[#C6FF00] text-[#0A0A0A]'
                                : 'border-white/[0.16] text-[#8C8C8C]'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8C8C8C] mb-2">선호 시간대</label>
                    <input
                      type="text"
                      value={form.scheduleTime}
                      onChange={(e) => setForm((p) => ({ ...p, scheduleTime: e.target.value }))}
                      placeholder="예: 19:30 – 21:30"
                      className="w-full min-h-[44px] px-3.5 bg-black border border-white/[0.18] rounded-[2px] text-[15px] text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                    />
                  </div>
                </div>

                {/* Optional Instructor Stats (Self-reported + Studio Total Aggregation) */}
                <div className="p-4 bg-black/45 border border-white/[0.1] rounded-[2px] space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-[#F2F2F2]">
                        내 강의 실적 수치 입력 · 노출 (선택)
                      </div>
                      <div className="text-[11px] text-[#8C8C8C] mt-0.5">
                        승인 시 내 강사 카드에 표시되며, 메인 및 클래스 누적 실적(+)에도 합산됩니다.
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={form.showStats}
                        onChange={(e) => setForm((p) => ({ ...p, showStats: e.target.checked }))}
                        className="w-4 h-4 accent-[#C6FF00]"
                      />
                      <span className="text-xs font-bold text-[#C6FF00]">카드에 노출</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#8C8C8C] mb-1">
                        누적 강의 시간 (시간)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20000}
                        value={form.lectureHours}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, lectureHours: Math.max(0, Number(e.target.value) || 0) }))
                        }
                        className="w-full min-h-[44px] px-3 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#8C8C8C] mb-1">
                        누적 수강생 수 (명)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50000}
                        value={form.studentCount}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, studentCount: Math.max(0, Number(e.target.value) || 0) }))
                        }
                        className="w-full min-h-[44px] px-3 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] focus:border-[#C6FF00] outline-none"
                      />
                    </div>
                  </div>
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
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit(true)}
                    className="hero-cta flex-1 justify-center"
                  >
                    <Save size={15} /> {saving ? '저장 중...' : '저장 후 승인 요청 →'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit(false)}
                    className="hero-cta-secondary justify-center"
                  >
                    임시 저장
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <aside className="lg:col-span-5 lg:sticky lg:top-24">
                <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-3 flex items-center gap-1.5">
                  <Sparkles size={13} /> LIVE PREVIEW · 공개 강사 카드 미리보기
                </div>
                <article className="inst-card is-lead">
                  <div className="inst-card-media">
                    <span className="inst-badge is-lead">미리보기</span>
                    {form.photoUrl ? (
                      <img
                        src={form.photoUrl}
                        alt={form.displayName || '강사 프로필'}
                        className="w-28 h-28 rounded-full object-cover border-2 border-[#C6FF00]"
                      />
                    ) : (
                      <div className="inst-avatar-circle">
                        <span className="ff-disp text-2xl text-[#C6FF00]">{initials}</span>
                      </div>
                    )}
                  </div>

                  <div className="inst-card-body">
                    <h2 className="ff-disp text-[30px] leading-tight mb-1">
                      {form.displayName || '강사 이름'}
                    </h2>
                    <p className="text-xs font-bold text-[#8C8C8C] mb-3">
                      {form.title || '직함을 입력해 주세요'}
                    </p>
                    {form.showStats && (form.lectureHours > 0 || form.studentCount > 0) && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-extrabold text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/30 px-2.5 py-1 rounded-[2px] mb-3">
                        강의 {form.lectureHours.toLocaleString('ko-KR')}시간+ · 수강생{' '}
                        {form.studentCount.toLocaleString('ko-KR')}명+
                      </div>
                    )}
                    <p className="text-sm text-[#F2F2F2]/85 leading-relaxed break-keep mb-4">
                      {form.bio || '강사 소개가 이곳에 표시됩니다.'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-[2px] border border-white/[0.12] bg-white/[0.03]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="border-t border-white/[0.08] pt-4 mb-4 space-y-1.5">
                      {form.credentials.filter((c) => c.trim()).length === 0 ? (
                        <div className="text-xs text-[#8C8C8C]">약력을 입력하면 여기에 표시됩니다.</div>
                      ) : (
                        form.credentials
                          .filter((c) => c.trim())
                          .map((c, idx) => (
                            <div key={idx} className="text-xs text-[#8C8C8C]">
                              • {c}
                            </div>
                          ))
                      )}
                    </div>

                    <div className="border-t border-white/[0.08] pt-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[#8C8C8C] inline-flex items-center gap-1">
                          <Calendar size={12} /> 만나는 시간
                        </span>
                        <span className="font-bold">{form.scheduleTime || '시간 미입력'}</span>
                      </div>
                      <div className="inst-day-strip">
                        {WEEK_DAYS.map((day) => {
                          const active = form.activeDays.includes(day);
                          return (
                            <span
                              key={day}
                              className={`inst-day-cell ${active ? 'is-active' : ''}`}
                              style={
                                active
                                  ? { backgroundColor: '#C6FF00', color: '#0A0A0A', borderColor: '#C6FF00' }
                                  : undefined
                              }
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
