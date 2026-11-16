import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AlertTriangle, ArrowLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { ADMIN_EMAILS } from '../data/defaultActivities';
import { CrystalCube } from './CrystalCube';

export default function InstructorLoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isRegisteredInstructor, setIsRegisteredInstructor] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsRegisteredInstructor(false);
        setChecking(false);
        return;
      }

      const emailLower = (currentUser.email || '').toLowerCase();
      if (ADMIN_EMAILS.includes(emailLower)) {
        setIsRegisteredInstructor(true);
        setChecking(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'instructors', currentUser.uid));
        setIsRegisteredInstructor(snap.exists());
      } catch {
        setIsRegisteredInstructor(false);
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.');
      } else {
        setErrorMsg(err?.message || 'Google 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] flex flex-col justify-between px-[22px] py-8">
      <header className="max-w-lg w-full mx-auto flex items-center justify-between">
        <Link to="/" className="nav-logo">
          <CrystalCube size={26} pfx="instlgn" />
          <span className="nav-logo-text uppercase tracking-wider">DO-DAHAM</span>
        </Link>
        <span className="text-[10px] font-extrabold tracking-[0.16em] bg-[#C6FF00] text-[#0A0A0A] px-2.5 py-1 rounded-[2px]">
          강사 전용
        </span>
      </header>

      <main className="max-w-lg w-full mx-auto my-10 bg-gradient-to-br from-[#13130C] to-[#0B0B0B] border border-white/[0.14] rounded-[2px] p-7 sm:p-10">
        {checking ? (
          <div className="py-10 text-center text-sm text-[#8C8C8C]">계정 권한을 확인하는 중...</div>
        ) : !user ? (
          <div className="text-center">
            <GraduationCap className="mx-auto w-11 h-11 text-[#C6FF00] mb-5" />
            <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-2">
              INSTRUCTOR PORTAL
            </div>
            <h1 className="ff-disp text-3xl sm:text-4xl mb-3">강사 로그인</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-7 break-keep">
              운영자로부터 초대 링크를 받아 가입한 파트너 강사 전용 공간입니다.
              <br />
              본인의 프로필·수업 등록·수료생 결과물만 관리할 수 있으며, 관리자 CMS 권한과는 분리되어 있습니다.
            </p>

            {errorMsg && (
              <p className="mb-4 p-3 border border-[#E02898] bg-[#E02898]/10 text-[#E02898] text-xs font-bold rounded-[2px] flex items-center gap-2 text-left">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}

            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleLogin}
              className="w-full min-h-[52px] bg-[#F2F2F2] text-[#0A0A0A] font-extrabold text-sm rounded-[2px] flex items-center justify-center gap-3 hover:bg-[#C6FF00] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.03v3.14C3.05 21.19 7.21 24 12 24Z" />
                <path fill="#FBBC05" d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.03C.37 7.5 0 8.99 0 10.56c0 1.57.37 3.06 1.03 4.38l4-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.81 1.03 6.82l4 3.14C6.01 6.94 8.76 4.75 12 4.75Z" />
              </svg>
              <span>{authLoading ? 'Google 계정 확인 중...' : 'Google 계정으로 강사 로그인'}</span>
            </button>
          </div>
        ) : isRegisteredInstructor ? (
          <div className="text-center">
            <CheckCircle2 size={36} className="text-[#C6FF00] mx-auto mb-4" />
            <h1 className="ff-disp text-3xl mb-2">강사 계정 확인 완료</h1>
            <p className="text-xs text-[#8C8C8C] mb-6">{user.email}</p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/instructor/profile')}
                className="hero-cta w-full justify-center"
              >
                내 강사 프로필 편집 →
              </button>
              <button
                type="button"
                onClick={() => navigate('/instructor/classes/new')}
                className="hero-cta-secondary w-full justify-center"
              >
                새 수업 일정 · 계획 등록 →
              </button>
              <button
                type="button"
                onClick={() => navigate('/class#showcase')}
                className="hero-cta-secondary w-full justify-center"
              >
                수료생 완성 결과물 올리기 →
              </button>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="w-full py-3 text-xs font-bold text-[#8C8C8C] hover:text-[#E02898] cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <AlertTriangle size={36} className="text-[#E02898] mx-auto mb-4" />
            <h1 className="ff-disp text-3xl mb-3">등록된 강사 계정이 아닙니다</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              현재 로그인한 계정(<strong className="text-[#F2F2F2]">{user.email}</strong>)은 운영자 초대를 통해 등록된 강사 계정이 아닙니다.
              운영자에게 강사 초대 링크를 요청해 가입을 먼저 진행해 주세요.
            </p>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="hero-cta w-full justify-center"
            >
              로그아웃 후 다른 계정으로 로그인
            </button>
          </div>
        )}
      </main>

      <footer className="max-w-lg w-full mx-auto flex items-center justify-between text-xs text-[#8C8C8C] border-t-0 p-0">
        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#C6FF00]">
          <ArrowLeft size={13} /> 홈으로
        </Link>
        <span>문의 · 카카오톡 @AI다함스튜디오</span>
      </footer>
    </div>
  );
}
