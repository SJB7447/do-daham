import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { CrystalCube } from './CrystalCube';

type InviteState = 'need_login' | 'loading' | 'valid' | 'used' | 'expired' | 'mismatch' | 'completed';

interface InviteRecord {
  id: string;
  emailLower: string;
  memo?: string;
  status: 'pending' | 'used' | 'revoked';
  expiresAtMs: number;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export default function JoinInvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const demoMode = searchParams.get('demo');

  const [state, setState] = useState<InviteState>(demoMode ? 'loading' : 'need_login');
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (demoMode === 'valid' || demoMode === 'used' || demoMode === 'expired' || demoMode === 'mismatch') {
      setInvite({
        id: 'demo-invite',
        emailLower: 'partner@do-daham.com',
        memo: 'AI 숏폼 · 사운드 파트너 강사',
        status: demoMode === 'used' ? 'used' : demoMode === 'expired' ? 'revoked' : 'pending',
        expiresAtMs: Date.now() + 48 * 3600 * 1000
      });
      setState(demoMode);
      return;
    }

    if (!token) {
      setState('expired');
      return;
    }

    // Security: require Google authentication BEFORE querying Firestore `invites`
    if (!currentUser) {
      setState('need_login');
      return;
    }

    let cancelled = false;

    async function verifyTokenAfterAuth(user: User) {
      setState('loading');
      try {
        const tokenHash = await sha256Hex(token);
        const q = query(collection(db, 'invites'), where('tokenHash', '==', tokenHash));
        const snap = await getDocs(q);

        if (cancelled) return;
        if (snap.empty) {
          setState('expired');
          return;
        }

        const docSnap = snap.docs[0];
        const data = docSnap.data();
        const expiresAtMs =
          typeof data.expiresAt?.toMillis === 'function'
            ? data.expiresAt.toMillis()
            : Number(data.expiresAtMs || 0);

        const rec: InviteRecord = {
          id: docSnap.id,
          emailLower: String(data.emailLower || '').toLowerCase(),
          memo: data.memo || '',
          status: data.status || 'pending',
          expiresAtMs
        };
        setInvite(rec);

        if (rec.status === 'used') {
          setState('used');
        } else if (rec.status === 'revoked' || (expiresAtMs > 0 && Date.now() > expiresAtMs)) {
          setState('expired');
        } else if ((user.email || '').toLowerCase() !== rec.emailLower) {
          setState('mismatch');
        } else {
          setState('valid');
        }
      } catch (err) {
        console.error('Invite verify error:', err);
        if (!cancelled) {
          setState('expired');
        }
      }
    }

    verifyTokenAfterAuth(currentUser);
    return () => {
      cancelled = true;
    };
  }, [token, demoMode, currentUser]);

  const handleGoogleLoginFirst = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setErrorMsg(err?.message || '구글 로그인 중 문제가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!consentChecked || !invite) return;
    setErrorMsg('');
    setSubmitting(true);
    try {
      if (invite.id !== 'demo-invite' && currentUser) {
        await updateDoc(doc(db, 'invites', invite.id), {
          status: 'used',
          usedByUid: currentUser.uid,
          usedAt: serverTimestamp()
        });
      }
      setState('completed');
    } catch (err: any) {
      setErrorMsg(err?.message || '초대 수락 처리 중 문제가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await signOut(auth);
    setState('need_login');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] flex flex-col justify-between px-[22px] py-8">
      <header className="max-w-lg w-full mx-auto flex items-center justify-between">
        <Link to="/" className="nav-logo">
          <CrystalCube size={26} pfx="join" />
          <span className="nav-logo-text uppercase tracking-wider">DO-DAHAM</span>
        </Link>
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#C6FF00] border border-[#C6FF00]/40 px-2.5 py-1 rounded-[2px]">
          INSTRUCTOR INVITE
        </span>
      </header>

      <main className="max-w-lg w-full mx-auto my-10 bg-gradient-to-br from-[#13130C] to-[#0B0B0B] border border-white/[0.14] rounded-[2px] p-7 sm:p-9">
        {state === 'need_login' && (
          <div>
            <div className="inline-block text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] border border-[#C6FF00] text-[#C6FF00] mb-4">
              STEP 1 · 계정 확인
            </div>
            <h1 className="ff-disp text-3xl sm:text-4xl leading-tight mb-3">
              DO-DAHAM CLASS
              <br />
              강사 초대 확인
            </h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              보안을 위해 초대받은 이메일의 Google 계정으로 먼저 로그인해 주세요. 로그인 후 초대장 유효 여부를 확인합니다.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 border border-[#E02898] text-[#E02898] text-xs font-bold rounded-[2px]">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleLoginFirst}
              className="w-full min-h-[52px] bg-[#F2F2F2] text-[#0A0A0A] font-extrabold text-sm rounded-[2px] flex items-center justify-center gap-2.5 disabled:opacity-40 cursor-pointer hover:bg-[#C6FF00] transition-colors"
            >
              {submitting ? '구글 계정 확인 중...' : 'Google 계정으로 초대 확인하기 →'}
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="py-10 text-center">
            <div className="text-xs font-extrabold tracking-[0.16em] text-[#C6FF00] mb-2">
              VERIFYING INVITE
            </div>
            <p className="text-sm text-[#8C8C8C]">초대 링크의 유효성을 확인하고 있습니다...</p>
          </div>
        )}

        {state === 'valid' && invite && (
          <div>
            <div className="inline-block text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] border border-[#C6FF00] text-[#C6FF00] mb-4">
              유효한 초대 · 1회용
            </div>
            <h1 className="ff-disp text-3xl sm:text-4xl leading-tight mb-3">
              DO-DAHAM CLASS
              <br />
              강사 합류 초대
            </h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              초대 대상 이메일(<strong className="text-[#F2F2F2]">{maskEmail(invite.emailLower)}</strong>) 확인이 완료되었습니다.
              아래 동의 후 강사 프로필 작성을 시작하세요.
            </p>

            <label className="flex items-start gap-3 p-4 bg-black/40 border border-white/[0.1] rounded-[2px] mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#C6FF00]"
              />
              <span className="text-xs text-[#8C8C8C] leading-relaxed">
                강사 등록 및 프로필 공개 심사를 위해 이름·이메일(Google 계정 기본 정보)을 수집·이용하는 것에 동의합니다. (탈퇴 시 지체 없이 파기)
              </span>
            </label>

            {errorMsg && (
              <div className="mb-4 p-3 border border-[#E02898] text-[#E02898] text-xs font-bold rounded-[2px]">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={!consentChecked || submitting}
              onClick={handleAcceptInvite}
              className="w-full min-h-[52px] bg-[#C6FF00] text-[#0A0A0A] font-extrabold text-sm rounded-[2px] flex items-center justify-center gap-2.5 disabled:opacity-40 cursor-pointer hover:bg-white transition-colors"
            >
              {submitting ? '가입 처리 중...' : '동의하고 강사 가입 완료 →'}
            </button>
          </div>
        )}

        {state === 'completed' && (
          <div className="text-center py-4">
            <CheckCircle2 size={36} className="text-[#C6FF00] mx-auto mb-4" />
            <h1 className="ff-disp text-3xl mb-3">강사 가입이 완료되었습니다</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              이제 강사 프로필을 작성하고 운영자 승인을 요청할 수 있습니다.
            </p>
            <Link to="/instructor/profile" className="hero-cta w-full justify-center">
              내 강사 프로필 작성하기 →
            </Link>
          </div>
        )}

        {state === 'used' && (
          <div className="text-center py-4">
            <CheckCircle2 size={36} className="text-[#28B8E8] mx-auto mb-4" />
            <span className="inline-block text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] bg-[#28B8E8] text-[#0A0A0A] mb-3">
              사용됨
            </span>
            <h1 className="ff-disp text-3xl mb-3">이미 사용된 초대 링크입니다</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              1회용 초대 링크는 가입 완료 후 자동으로 만료됩니다. 이미 가입하셨다면 강사 프로필 화면으로 이동해 주세요.
            </p>
            <Link to="/instructor/profile" className="hero-cta-secondary w-full justify-center">
              강사 프로필 편집으로 이동 →
            </Link>
          </div>
        )}

        {state === 'expired' && (
          <div className="text-center py-4">
            <Clock size={36} className="text-[#8C8C8C] mx-auto mb-4" />
            <span className="inline-block text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] border border-white/35 text-[#8C8C8C] mb-3">
              만료 · 취소됨
            </span>
            <h1 className="ff-disp text-3xl mb-3">유효하지 않거나 만료된 링크입니다</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              초대 유효 시간이 지났거나 운영자가 초대를 취소했습니다. 카카오톡(@AI다함스튜디오)으로 새 초대 링크를 요청해 주세요.
            </p>
            <Link to="/" className="hero-cta-secondary w-full justify-center">
              홈으로 돌아가기 →
            </Link>
          </div>
        )}

        {state === 'mismatch' && (
          <div className="text-center py-4">
            <ShieldAlert size={36} className="text-[#E02898] mx-auto mb-4" />
            <span className="inline-block text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] border border-[#E02898] text-[#E02898] mb-3">
              계정 불일치
            </span>
            <h1 className="ff-disp text-3xl mb-3">초대된 이메일과 다른 계정입니다</h1>
            <p className="text-sm text-[#8C8C8C] leading-relaxed mb-6 break-keep">
              현재 로그인된 계정({currentUser?.email ? maskEmail(currentUser.email) : '다른 계정'})은 초대 대상 이메일(
              {invite ? maskEmail(invite.emailLower) : ''})과 다릅니다. 로그아웃 후 초대받은 구글 계정으로 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="hero-cta w-full justify-center"
            >
              <AlertTriangle size={15} /> 다른 Google 계정으로 다시 시도
            </button>
          </div>
        )}
      </main>

      <footer className="max-w-lg w-full mx-auto text-center text-xs text-[#8C8C8C] border-t-0 p-0">
        © {new Date().getFullYear()} DO-DAHAM · 문의 @AI다함스튜디오
      </footer>
    </div>
  );
}
