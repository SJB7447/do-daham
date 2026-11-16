import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { 
  ArrowLeft, LogOut, Save, Plus, Trash2, ArrowUp, ArrowDown, 
  Image as ImageIcon, Youtube, Link as LinkIcon, Cpu, Loader, AlertTriangle,
  UserPlus, UserCheck, Copy, Check, XCircle, ShieldCheck, PlayCircle
} from 'lucide-react';
import { isYoutubeUrl, isEmbeddableYoutubeVideo, getYoutubeEmbedUrl } from '../lib/youtube';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings, SiteSettings } from '../lib/siteSettings';
import mCubeLogo from '../assets/m_cube_logo.png';

const DEFAULT_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@CodeM_Studio_AI11';

function normalizeYoutubeHref(url?: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/@do-daham')) {
    return DEFAULT_YOUTUBE_CHANNEL_URL;
  }
  return url;
}

interface Project {
  id: number;
  title: string;
  href: string;
  img: string;
  mediaType?: 'image' | 'youtube';
  videoSrc?: string;
  external?: boolean;
}

const DEFAULT_ACTIONS: Project[] = [
  { id: 1, title: 'CodeM Studio', href: DEFAULT_YOUTUBE_CHANNEL_URL, img: mCubeLogo, mediaType: 'image', videoSrc: '', external: true },
  { id: 2, title: 'Mood Brew', href: 'https://coffee.do-daham.com/', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', mediaType: 'image', videoSrc: '', external: true },
  { id: 3, title: 'MechFlow', href: 'https://machine.do-daham.com', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', mediaType: 'image', videoSrc: '', external: true },
  { id: 4, title: 'Coming Soon...', href: '#', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', mediaType: 'image', videoSrc: '', external: false }
];

function normalizeActions(rawActions: any): Project[] {
  if (!Array.isArray(rawActions)) {
    return DEFAULT_ACTIONS.map(item => ({ ...item }));
  }
  const usedIds = new Set<number>();
  return rawActions.map((item: any, idx: number) => {
    let candidateId = typeof item?.id === 'number' && !Number.isNaN(item.id)
      ? item.id
      : Number(item?.id) || (Date.now() + idx);
    while (usedIds.has(candidateId)) {
      candidateId += 1;
    }
    usedIds.add(candidateId);

    const normalizedHref = normalizeYoutubeHref(item?.href || '');
    const normalizedVideoSrc = normalizeYoutubeHref(item?.videoSrc || '');

    return {
      id: candidateId,
      title: item?.title ?? '',
      href: normalizedHref,
      img: item?.img ?? '',
      mediaType: item?.mediaType === 'youtube' ? 'youtube' : 'image',
      videoSrc: normalizedVideoSrc,
      external: typeof item?.external === 'boolean' ? item.external : normalizedHref.startsWith('http')
    };
  });
}

interface PortfolioData {
  userName: string;
  userRole: string;
  manifesto: {
    lines: string[];
    highlight: string;
  };
  masterpiece: {
    title: string;
    descriptionTitle: string;
    descriptionSub: string;
    embedSrc: string;
  };
  actions: Project[];
  activities?: any[];
  siteSettings?: SiteSettings;
}

type CmsTab = 'content' | 'invites' | 'approvals' | 'classes';

interface ClassOperationItem {
  id: string;
  title: string;
  instructorEmail: string;
  sessionCount: number;
  hoursPerSession: number;
  enrolledCount: number;
  capacity: number;
  status: string;
  started: boolean;
  isSample?: boolean;
}

const SAMPLE_CLASS_OPS: ClassOperationItem[] = [];

interface InviteItem {
  id: string;
  emailLower: string;
  memo: string;
  status: 'pending' | 'used' | 'revoked';
  expiresAtMs: number;
  createdAtLabel: string;
}

interface InstructorApprovalItem {
  id: string;
  displayName: string;
  title: string;
  bio: string;
  tags: string[];
  activeDays: string[];
  scheduleTime: string;
  status: 'pending' | 'approved' | 'rejected';
  isSample?: boolean;
}

const SAMPLE_PENDING_INSTRUCTORS: InstructorApprovalItem[] = [];

async function hashTokenSha256(rawToken: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateCryptoToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const ADMIN_ALLOWED_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

function isAuthorizedAdmin(currentUser: User | null): boolean {
  if (!currentUser || !currentUser.email) return false;
  if (ADMIN_ALLOWED_EMAILS.length === 0) return true;
  return Boolean(currentUser.emailVerified) && ADMIN_ALLOWED_EMAILS.includes(currentUser.email.toLowerCase());
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Portfolio state
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    userName: '',
    userRole: '',
    manifesto: {
      lines: [''],
      highlight: ''
    },
    masterpiece: {
      title: '',
      descriptionTitle: '',
      descriptionSub: '',
      embedSrc: ''
    },
    actions: [],
    siteSettings: { ...DEFAULT_SITE_SETTINGS }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<CmsTab>('content');
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<{ [key: string]: boolean }>({});

  // Invite & Approval state
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMemo, setInviteMemo] = useState('');
  const [inviteTtlHours, setInviteTtlHours] = useState<24 | 48 | 72>(48);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [inviteNotice, setInviteNotice] = useState('');
  const [approvalItems, setApprovalItems] = useState<InstructorApprovalItem[]>(SAMPLE_PENDING_INSTRUCTORS);
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [classOps, setClassOps] = useState<ClassOperationItem[]>(SAMPLE_CLASS_OPS);
  const [classNotice, setClassNotice] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !isAuthorizedAdmin(currentUser)) {
        await signOut(auth);
        setUser(null);
        setAuthError('승인된 운영자 Google 계정이 아닙니다. 운영자 계정으로 로그인해 주세요.');
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        fetchPortfolioData();
        fetchInvites();
        fetchInstructorApprovals();
        fetchClassOps();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInvites = async () => {
    try {
      const q = query(collection(db, 'invites'), orderBy('expiresAtMs', 'desc'));
      const snap = await getDocs(q);
      const list: InviteItem[] = snap.docs.map((d) => {
        const data = d.data();
        const expiresAtMs = Number(data.expiresAtMs || 0);
        return {
          id: d.id,
          emailLower: String(data.emailLower || ''),
          memo: String(data.memo || ''),
          status: data.status || 'pending',
          expiresAtMs,
          createdAtLabel: data.createdAtLabel || '방금 전'
        };
      });
      setInvites(list);
    } catch (err) {
      console.warn('Invites collection load skipped or restricted:', err);
    }
  };

  const fetchInstructorApprovals = async () => {
    try {
      const snap = await getDocs(collection(db, 'instructors'));
      if (snap.empty) {
        setApprovalItems(SAMPLE_PENDING_INSTRUCTORS);
        return;
      }
      const list: InstructorApprovalItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          displayName: String(data.displayName || '이름 미입력'),
          title: String(data.title || '직함 미입력'),
          bio: String(data.bio || ''),
          tags: Array.isArray(data.tags) ? data.tags : [],
          activeDays: Array.isArray(data.activeDays) ? data.activeDays : [],
          scheduleTime: String(data.scheduleTime || ''),
          status: data.status || 'pending'
        };
      });
      setApprovalItems(list);
    } catch (err) {
      console.warn('Instructors collection load skipped or restricted:', err);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLower = inviteEmail.trim().toLowerCase();
    if (!emailLower || !emailLower.includes('@')) return;

    setCreatingInvite(true);
    setInviteNotice('');
    setGeneratedInviteUrl('');
    setCopiedInviteUrl(false);

    try {
      const rawToken = generateCryptoToken();
      const tokenHash = await hashTokenSha256(rawToken);
      const expiresAtMs = Date.now() + inviteTtlHours * 3600 * 1000;
      const createdAtLabel = new Date().toLocaleString('ko-KR');

      let savedId = `local-${Date.now()}`;
      try {
        const docRef = await addDoc(collection(db, 'invites'), {
          emailLower,
          memo: inviteMemo.trim(),
          tokenHash,
          status: 'pending',
          expiresAtMs,
          createdAtLabel,
          createdAt: serverTimestamp()
        });
        savedId = docRef.id;
      } catch (err) {
        console.warn('Firestore invites write failed, using local preview:', err);
        setInviteNotice('참고: Firestore invites 쓰기 권한이 아직 없어 현재 세션 미리보기로만 생성되었습니다.');
      }

      const newInvite: InviteItem = {
        id: savedId,
        emailLower,
        memo: inviteMemo.trim(),
        status: 'pending',
        expiresAtMs,
        createdAtLabel
      };
      setInvites((prev) => [newInvite, ...prev]);
      setGeneratedInviteUrl(`${window.location.origin}/join/${rawToken}`);
      setInviteEmail('');
      setInviteMemo('');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    setInvites((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'revoked' } : item)));
    if (!id.startsWith('local-')) {
      try {
        await updateDoc(doc(db, 'invites', id), { status: 'revoked' });
      } catch (err) {
        console.warn('Invite revoke failed in Firestore:', err);
      }
    }
  };

  const handleCopyInviteUrl = async () => {
    if (!generatedInviteUrl) return;
    try {
      await navigator.clipboard.writeText(generatedInviteUrl);
      setCopiedInviteUrl(true);
      setTimeout(() => setCopiedInviteUrl(false), 2000);
    } catch {
      setCopiedInviteUrl(false);
    }
  };

  const handleApprovalDecision = async (id: string, nextStatus: 'approved' | 'rejected') => {
    setApprovalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
    const target = approvalItems.find((item) => item.id === id);
    if (target && !target.isSample) {
      try {
        await updateDoc(doc(db, 'instructors', id), { status: nextStatus });
      } catch (err) {
        console.warn('Instructor approval update failed in Firestore:', err);
      }
    }
  };

  const fetchClassOps = async () => {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (snap.empty) {
        setClassOps(SAMPLE_CLASS_OPS);
        return;
      }
      const list: ClassOperationItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: String(data.title || '제목 없음'),
          instructorEmail: String(data.instructorEmail || ''),
          sessionCount: Number(data.sessionCount || 6),
          hoursPerSession: Number(data.hoursPerSession || 2),
          enrolledCount: Number(data.enrolledCount || 0),
          capacity: Number(data.capacity || 20),
          status: String(data.status || 'pending'),
          started: Boolean(data.started)
        };
      });
      setClassOps(list);
    } catch (err) {
      console.warn('Classes collection load skipped or restricted:', err);
    }
  };

  const handleUpdateClassNumbers = (id: string, field: 'enrolledCount' | 'hoursPerSession', val: number) => {
    setClassOps((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: Math.max(0, val) } : c))
    );
  };

  const handleClassStatusChange = async (
    item: ClassOperationItem,
    nextStatus: 'published' | 'confirmed' | 'closed' | 'rejected'
  ) => {
    setClassNotice('');
    setClassOps((prev) => prev.map((c) => (c.id === item.id ? { ...c, status: nextStatus } : c)));
    if (!item.isSample) {
      try {
        await updateDoc(doc(db, 'classes', item.id), {
          status: nextStatus,
          enrolledCount: item.enrolledCount,
          hoursPerSession: item.hoursPerSession
        });
        setClassNotice(`[${item.title}] 상태가 '${nextStatus}'로 변경되었습니다.`);
      } catch (err) {
        console.warn('Class status update failed:', err);
        setClassNotice('상태 변경 중 오류가 발생했습니다. Firestore 권한을 확인해 주세요.');
      }
    }
  };

  const handleDeleteClass = async (item: ClassOperationItem) => {
    if (!window.confirm(`"${item.title}" 수업을 삭제하시겠습니까?`)) return;
    setClassOps((prev) => prev.filter((c) => c.id !== item.id));
    if (!item.isSample) {
      try {
        await deleteDoc(doc(db, 'classes', item.id));
        setClassNotice(`[${item.title}] 수업이 삭제되었습니다.`);
      } catch (err) {
        console.warn('Class delete failed:', err);
      }
    }
  };

  const handleStartClass = async (item: ClassOperationItem) => {
    if (item.started) return;
    setClassNotice('');
    setClassOps((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, started: true, status: 'started' } : c))
    );

    if (!item.isSample) {
      try {
        await updateDoc(doc(db, 'classes', item.id), {
          enrolledCount: item.enrolledCount,
          hoursPerSession: item.hoursPerSession,
          started: true,
          status: 'started',
          startedAt: serverTimestamp()
        });
        setClassNotice(
          `[${item.title}] 수업이 시작 처리되어 +${item.enrolledCount}명 · +${item.sessionCount * item.hoursPerSession}시간이 메인/클래스 누적 실적에 반영되었습니다.`
        );
      } catch (err) {
        console.warn('Class start update failed in Firestore:', err);
        setClassNotice('Firestore classes 쓰기 권한을 확인해 주세요. (현재 화면 상태만 반영됨)');
      }
    } else {
      setClassNotice('예시 수업은 미리보기로만 전환됩니다. 강사가 등록한 실제 수업에서 시작을 누르면 DB 실적에 합산됩니다.');
    }
  };

  // 2. Fetch Portfolio Data from Firestore
  const fetchPortfolioData = async () => {
    setLoadingData(true);
    try {
      const docRef = doc(db, 'portfolios', 'admin_default');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const raw = docSnap.data().data;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        // Match default schema structure and guarantee unique project IDs
        setPortfolioData({
          userName: parsed.userName || '성진배',
          userRole: parsed.userRole || 'AI Creator & Vibe Coder',
          manifesto: {
            lines: Array.isArray(parsed.manifesto?.lines) && parsed.manifesto.lines.length > 0
              ? parsed.manifesto.lines
              : ['질문을 던지고,', '코드를 엮어,', '새로운 가치를 만듭니다.', '상상을 현실로 구현하는 바이브 코더.'],
            highlight: parsed.manifesto?.highlight || '상상을 현실로 구현하는 바이브 코더.'
          },
          masterpiece: {
            title: parsed.masterpiece?.title || 'AI Media Art - The Wave',
            descriptionTitle: parsed.masterpiece?.descriptionTitle || '생성형 AI와 사운드의 결합으로 탄생한 감각적 비주얼 필름',
            descriptionSub: parsed.masterpiece?.descriptionSub || '',
            embedSrc: parsed.masterpiece?.embedSrc || 'https://www.youtube.com/embed/P-b7WV-obKs'
          },
          actions: normalizeActions(parsed.actions),
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          siteSettings: normalizeSiteSettings(parsed.siteSettings)
        });
      } else {
        setPortfolioData({
          userName: '성진배',
          userRole: 'AI Creator & Vibe Coder',
          manifesto: {
            lines: ['질문을 던지고,', '코드를 엮어,', '새로운 가치를 만듭니다.', '상상을 현실로 구현하는 바이브 코더.'],
            highlight: '상상을 현실로 구현하는 바이브 코더.'
          },
          masterpiece: {
            title: 'AI Media Art - The Wave',
            descriptionTitle: '생성형 AI와 사운드의 결합으로 탄생한 감각적 비주얼 필름',
            descriptionSub: '',
            embedSrc: 'https://www.youtube.com/embed/P-b7WV-obKs'
          },
          actions: normalizeActions(DEFAULT_ACTIONS),
          activities: [],
          siteSettings: { ...DEFAULT_SITE_SETTINGS }
        });
      }
    } catch (e) {
      console.error("Error loading portfolio from Firestore:", e);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Handle Google Authentication
  const handleGoogleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      if (!isAuthorizedAdmin(cred.user)) {
        await signOut(auth);
        setAuthError('승인된 운영자 Google 계정이 아닙니다. 운영자 계정으로 로그인해 주세요.');
        return;
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Firebase Console에서 Google 로그인 제공업체를 먼저 활성화해 주세요.');
      } else {
        setAuthError(err.message || 'Google 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPortfolioData({
        userName: '',
        userRole: '',
        manifesto: { lines: [''], highlight: '' },
        masterpiece: { title: '', descriptionTitle: '', descriptionSub: '', embedSrc: '' },
        actions: []
      });
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  // 4. Update Portfolio Data State Handlers
  const handleProfileChange = (field: keyof PortfolioData, value: string) => {
    setPortfolioData(prev => ({ ...prev, [field]: value }));
  };

  const handleManifestoHighlightChange = (val: string) => {
    setPortfolioData(prev => ({
      ...prev,
      manifesto: { ...prev.manifesto, highlight: val }
    }));
  };

  const handleManifestoLineChange = (index: number, val: string) => {
    setPortfolioData(prev => {
      const newLines = [...prev.manifesto.lines];
      newLines[index] = val;
      return {
        ...prev,
        manifesto: { ...prev.manifesto, lines: newLines }
      };
    });
  };

  const addManifestoLine = () => {
    setPortfolioData(prev => ({
      ...prev,
      manifesto: { ...prev.manifesto, lines: [...prev.manifesto.lines, ''] }
    }));
  };

  const removeManifestoLine = (index: number) => {
    setPortfolioData(prev => {
      const newLines = prev.manifesto.lines.filter((_, i) => i !== index);
      return {
        ...prev,
        manifesto: {
          ...prev.manifesto,
          lines: newLines.length ? newLines : ['']
        }
      };
    });
  };

  const handleMasterpieceChange = (field: keyof PortfolioData['masterpiece'], value: string) => {
    setPortfolioData(prev => ({
      ...prev,
      masterpiece: { ...prev.masterpiece, [field]: value }
    }));
  };

  // 5. Image & File Upload Helpers
  const uploadImage = async (file: File, path: string): Promise<string> => {
    const fileRef = ref(storage, `uploads/${path}_${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleMasterpieceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(prev => ({ ...prev, masterpiece: true }));
    try {
      const url = await uploadImage(file, 'masterpiece');
      handleMasterpieceChange('embedSrc', url);
    } catch (err: any) {
      alert('이미지 업로드 실패: ' + err.message);
    } finally {
      setUploadingMedia(prev => ({ ...prev, masterpiece: false }));
    }
  };

  const handleActionImageUpload = async (projectId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadKey = `action-${projectId}`;
    setUploadingMedia(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const url = await uploadImage(file, `action_${projectId}`);
      setPortfolioData(prev => ({
        ...prev,
        actions: prev.actions.map(item =>
          item.id === projectId ? { ...item, img: url } : item
        )
      }));
    } catch (err: any) {
      alert('이미지 업로드 실패: ' + err.message);
    } finally {
      setUploadingMedia(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  // 6. Project Card Handlers
  const addActionCard = () => {
    setPortfolioData(prev => {
      const existingIds = new Set(prev.actions.map(a => a.id));
      let nextId = Date.now();
      while (existingIds.has(nextId)) {
        nextId += 1;
      }
      const newProject: Project = {
        id: nextId,
        title: '',
        href: '',
        img: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        mediaType: 'image',
        videoSrc: '',
        external: false
      };
      return {
        ...prev,
        actions: [...prev.actions, newProject]
      };
    });
  };

  const removeActionCard = (index: number) => {
    setPortfolioData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index: number, field: keyof Project, val: string) => {
    setPortfolioData(prev => {
      if (index < 0 || index >= prev.actions.length) return prev;
      const newActions = [...prev.actions];
      newActions[index] = { ...newActions[index], [field]: val } as Project;
      return { ...prev, actions: newActions };
    });
  };

  const moveActionUp = (index: number) => {
    setPortfolioData(prev => {
      if (index <= 0 || index >= prev.actions.length) return prev;
      const newActions = [...prev.actions];
      const temp = { ...newActions[index] };
      newActions[index] = { ...newActions[index - 1] };
      newActions[index - 1] = temp;
      return { ...prev, actions: newActions };
    });
  };

  const moveActionDown = (index: number) => {
    setPortfolioData(prev => {
      if (index < 0 || index >= prev.actions.length - 1) return prev;
      const newActions = [...prev.actions];
      const temp = { ...newActions[index] };
      newActions[index] = { ...newActions[index + 1] };
      newActions[index + 1] = temp;
      return { ...prev, actions: newActions };
    });
  };

  // 7. Save to Firestore
  const handleSave = async () => {
    if (user?.email !== 'sjb76337447@gmail.com') {
      alert('권한이 없습니다. 등록된 관리자 이메일만 설정을 저장할 수 있습니다.');
      return;
    }

    setSavingData(true);
    setSaveSuccess(false);

    try {
      const docRef = doc(db, 'portfolios', 'admin_default');
      const existingSnap = await getDoc(docRef);
      let latestActivities = portfolioData.activities || [];
      if (existingSnap.exists()) {
        try {
          const rawExisting = existingSnap.data().data;
          const parsedExisting = typeof rawExisting === 'string' ? JSON.parse(rawExisting) : rawExisting;
          if (Array.isArray(parsedExisting?.activities)) {
            latestActivities = parsedExisting.activities;
          }
        } catch {
          // fallback to state activities
        }
      }

      const normalizedActions = normalizeActions(portfolioData.actions).map(a => {
        const cleanedHref = normalizeYoutubeHref((a.href || '').trim());
        const cleanedVideoSrc = normalizeYoutubeHref((a.videoSrc || '').trim());
        return {
          id: a.id,
          title: a.title || '',
          href: cleanedHref,
          img: a.img || '',
          mediaType: a.mediaType === 'youtube' ? 'youtube' as const : 'image' as const,
          videoSrc: a.mediaType === 'youtube' && cleanedVideoSrc
            ? (isEmbeddableYoutubeVideo(cleanedVideoSrc) ? getYoutubeEmbedUrl(cleanedVideoSrc) : cleanedVideoSrc)
            : (cleanedVideoSrc || ''),
          external: cleanedHref ? cleanedHref.startsWith('http') : false
        };
      });

      const cleanData: PortfolioData = {
        userName: portfolioData.userName,
        userRole: portfolioData.userRole,
        manifesto: {
          lines: portfolioData.manifesto.lines.filter(l => l.trim()),
          highlight: portfolioData.manifesto.highlight
        },
        masterpiece: {
          title: portfolioData.masterpiece.title,
          descriptionTitle: portfolioData.masterpiece.descriptionTitle,
          descriptionSub: portfolioData.masterpiece.descriptionSub,
          embedSrc: isEmbeddableYoutubeVideo(portfolioData.masterpiece.embedSrc)
            ? getYoutubeEmbedUrl(portfolioData.masterpiece.embedSrc)
            : portfolioData.masterpiece.embedSrc
        },
        actions: normalizedActions,
        activities: latestActivities,
        siteSettings: normalizeSiteSettings(portfolioData.siteSettings)
      };

      setPortfolioData(prev => ({
        ...prev,
        actions: normalizedActions,
        activities: latestActivities
      }));

      await setDoc(docRef, {
        user_id: user?.uid,
        data: JSON.stringify(cleanData),
        updated_at: new Date().toISOString()
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      alert('저장 도중 에러가 발생했습니다: ' + e.message);
    } finally {
      setSavingData(false);
    }
  };

  // ═══ Render Auth Form if not Logged In ═══
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f4f4f0] font-sans flex flex-col justify-center items-center px-6 relative overflow-x-hidden noise-overlay">
        {/* Navigation */}
        <nav className="fixed top-0 w-full border-b border-[#f4f4f0]/20 bg-[#050505]/80 backdrop-blur-md z-50">
          <div className="flex justify-between items-center p-4 md:p-6 max-w-7xl mx-auto w-full">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 hover:text-[#ccff00] transition-all uppercase tracking-widest"
            >
              <ArrowLeft size={16} /> Portfolio Home
            </button>
          </div>
        </nav>

        {/* Auth Box */}
        <div className="max-w-md w-full border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-8 md:p-12 relative z-10 text-center mt-20 shadow-[8px_8px_0px_rgba(204,255,0,0.2)]">
          <Cpu className="mx-auto w-12 h-12 mb-6 text-[#ccff00] animate-pulse" />
          <h1 className="font-display text-4xl mb-4 text-[#ccff00] uppercase tracking-wider">
            Owner Login
          </h1>
          <p className="opacity-70 font-bold mb-8 text-sm break-keep leading-relaxed">
            보안을 위해 비밀번호 방식 대신 Google 계정(2단계 인증 지원)으로만 운영자 CMS에 로그인합니다.
          </p>

          <div className="space-y-4 text-left">
            {authError && (
              <p className="text-[#E02898] font-bold text-xs tracking-wide flex items-start gap-2 bg-[#E02898]/10 border border-[#E02898]/40 p-3.5 rounded-[2px]">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="w-full min-h-[52px] bg-[#F2F2F2] text-[#0A0A0A] font-extrabold text-sm tracking-wide rounded-[2px] flex items-center justify-center gap-3 hover:bg-[#C6FF00] transition-colors disabled:opacity-50 cursor-pointer shadow-[4px_4px_0_rgba(204,255,0,0.35)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.03v3.14C3.05 21.19 7.21 24 12 24Z" />
                <path fill="#FBBC05" d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.03C.37 7.5 0 8.99 0 10.56c0 1.57.37 3.06 1.03 4.38l4-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.81 1.03 6.82l4 3.14C6.01 6.94 8.76 4.75 12 4.75Z" />
              </svg>
              <span>{authLoading ? 'Google 계정 확인 중...' : 'Google 계정으로 로그인'}</span>
            </button>

            <p className="text-[11px] text-[#8C8C8C] text-center pt-2 leading-relaxed">
              운영자 허용 목록은 환경변수 <code className="text-[#C6FF00]">VITE_ADMIN_EMAILS</code> 및 Firestore 보안 규칙으로 제한할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══ Render CMS Dashboard (Logged In) ═══
  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f0] font-sans pb-32 noise-overlay">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-[#f4f4f0]/20 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="flex justify-between items-center p-4 md:p-6 max-w-4xl mx-auto w-full">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 hover:text-[#ccff00] transition-all uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Home (Preview)
          </button>
          
          <div className="flex items-center gap-6">
            <span className="text-xs font-mono font-bold text-[#ccff00] hidden sm:inline">{user.email}</span>
            <button 
              onClick={handleLogout} 
              className="text-xs uppercase font-bold opacity-50 hover:text-red-400 hover:opacity-100 transition-all flex items-center gap-1"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main CMS Form container */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 mt-28 space-y-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-[#f4f4f0]/10 pb-6">
          <div>
            <div className="inline-block text-[10px] font-extrabold tracking-[0.16em] px-2.5 py-1 bg-[#f4f4f0] text-black mb-2">
              CMS · 운영자 전용
            </div>
            <h1 className="text-4xl font-black uppercase text-[#ccff00] tracking-wider mb-2">DO-DAHAM CMS</h1>
            <p className="text-sm font-bold opacity-40">사이트 콘텐츠, 강사 초대 링크 발급, 강사 프로필 승인을 관리합니다.</p>
          </div>
          
          {activeTab === 'content' && (
            <button
              onClick={handleSave}
              disabled={savingData || loadingData}
              className={`flex items-center justify-center gap-2 px-8 py-3.5 font-bold uppercase text-sm tracking-widest transition-all ${
                saveSuccess 
                  ? 'bg-green-500 text-black shadow-[4px_4px_0_#fff]' 
                  : 'bg-[#ccff00] text-black hover:bg-white shadow-[4px_4px_0_#fff]'
              } disabled:opacity-50 cursor-pointer`}
            >
              {savingData ? <Loader className="animate-spin" size={16} /> : <Save size={16}/>}
              {savingData ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save & Publish'}
            </button>
          )}
        </div>

        {/* Owner / Lead Instructor Quick Actions */}
        <div className="p-4 bg-[#0d0d0d] border border-[#ccff00]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-[#f4f4f0]/80">
            <span className="text-[#ccff00] font-extrabold mr-2">DIRECTOR SHORTCUT</span>
            대표님 본인 강의 · 프로필도 같은 계정으로 바로 관리할 수 있습니다.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/instructor/profile')}
              className="px-3 py-2 text-xs font-extrabold border border-white/20 hover:border-[#ccff00] hover:text-[#ccff00] cursor-pointer"
            >
              내 강사 프로필 편집
            </button>
            <button
              type="button"
              onClick={() => navigate('/instructor/classes')}
              className="px-3 py-2 text-xs font-extrabold border border-white/20 hover:border-[#ccff00] hover:text-[#ccff00] cursor-pointer"
            >
              내 수업 일정 관리
            </button>
            <button
              type="button"
              onClick={() => navigate('/instructor/classes/new')}
              className="px-3 py-2 text-xs font-extrabold bg-[#ccff00] text-black hover:bg-white cursor-pointer"
            >
              + 새 수업 개설
            </button>
            <button
              type="button"
              onClick={() => navigate('/class#showcase')}
              className="px-3 py-2 text-xs font-extrabold border border-white/20 hover:border-[#ccff00] hover:text-[#ccff00] cursor-pointer"
            >
              수료생 결과물 올리기
            </button>
          </div>
        </div>

        {/* CMS Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#f4f4f0]/15 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border transition-colors cursor-pointer ${
              activeTab === 'content'
                ? 'bg-[#ccff00] text-black border-[#ccff00]'
                : 'bg-black text-[#f4f4f0]/70 border-[#f4f4f0]/20 hover:border-[#ccff00]'
            }`}
          >
            사이트 콘텐츠
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'invites'
                ? 'bg-[#ccff00] text-black border-[#ccff00]'
                : 'bg-black text-[#f4f4f0]/70 border-[#f4f4f0]/20 hover:border-[#ccff00]'
            }`}
          >
            <UserPlus size={14} /> 강사 초대
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-[#ccff00] text-black border-[#ccff00]'
                : 'bg-black text-[#f4f4f0]/70 border-[#f4f4f0]/20 hover:border-[#ccff00]'
            }`}
          >
            <UserCheck size={14} /> 프로필 승인
            <span className="px-1.5 py-0.5 text-[10px] bg-[#F5C400] text-black font-black rounded-sm">
              {approvalItems.filter((i) => i.status === 'pending').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'classes'
                ? 'bg-[#ccff00] text-black border-[#ccff00]'
                : 'bg-black text-[#f4f4f0]/70 border-[#f4f4f0]/20 hover:border-[#ccff00]'
            }`}
          >
            <PlayCircle size={14} /> 수업 시작 · 실적
          </button>
        </div>

        {activeTab === 'classes' ? (
          <div className="space-y-6">
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] flex items-center gap-2">
                  <PlayCircle size={18} /> 수업 승인 · 운영 · 시작 실적 반영
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/instructor/classes/new')}
                  className="px-4 py-2.5 bg-[#ccff00] text-black text-xs font-extrabold uppercase tracking-wider hover:bg-white cursor-pointer self-start sm:self-auto"
                >
                  + 새 수업 직접 등록
                </button>
              </div>
              <p className="text-xs text-[#f4f4f0]/65 mb-6 leading-relaxed">
                강사가 등록한 수업의 <strong>게시 승인(공개)</strong>, <strong>개설 확정</strong>, <strong>수업 시작 확정</strong>을 관리합니다.
                실제 수업이 시작되면 <strong>수업 시작 확정</strong> 시 수강생 수와 총 강의 시간(회차 × 회당 시간)이 메인 홈페이지 및 클래스 누적 실적에 자동 합산됩니다.
              </p>

              {classNotice && (
                <div className="mb-5 p-3.5 border border-[#ccff00] bg-[#ccff00]/10 text-[#ccff00] text-xs font-bold">
                  {classNotice}
                </div>
              )}

              {classOps.length === 0 ? (
                <div className="p-8 bg-black border border-white/10 text-center space-y-3">
                  <p className="text-sm text-[#f4f4f0]/60">아직 등록된 수업이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/instructor/classes/new')}
                    className="px-5 py-2.5 border border-[#ccff00] text-[#ccff00] text-xs font-extrabold cursor-pointer hover:bg-[#ccff00] hover:text-black transition-colors"
                  >
                    첫 수업 등록하기 →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {classOps.map((cls) => (
                    <div key={cls.id} className="p-5 bg-black border border-white/15 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 border ${
                                cls.started
                                  ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                  : cls.status === 'published' || cls.status === 'confirmed'
                                    ? 'border-[#28B8E8] text-[#28B8E8]'
                                    : 'border-[#F5C400] text-[#F5C400]'
                              }`}
                            >
                              {cls.started ? '수업 시작됨 · 실적 반영 완료' : `상태: ${cls.status}`}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold">{cls.title}</h3>
                          <p className="text-xs text-[#f4f4f0]/55">
                            담당: {cls.instructorEmail || '미지정'} · {cls.sessionCount}회 과정
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!cls.started && cls.status !== 'published' && cls.status !== 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleClassStatusChange(cls, 'published')}
                              className="px-3.5 py-2.5 border border-[#28B8E8] text-[#28B8E8] text-xs font-extrabold hover:bg-[#28B8E8] hover:text-black cursor-pointer"
                            >
                              게시 승인 (공개)
                            </button>
                          )}
                          {!cls.started && cls.status !== 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleClassStatusChange(cls, 'confirmed')}
                              className="px-3.5 py-2.5 border border-[#ccff00] text-[#ccff00] text-xs font-extrabold hover:bg-[#ccff00] hover:text-black cursor-pointer"
                            >
                              개설 확정
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={cls.started}
                            onClick={() => handleStartClass(cls)}
                            className="px-4 py-2.5 bg-[#ccff00] text-black text-xs font-extrabold uppercase tracking-wider disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            <PlayCircle size={15} />
                            {cls.started ? '실적 반영 완료 ✓' : '수업 시작 확정'}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/instructor/classes')}
                            className="px-3 py-2.5 border border-white/25 text-white text-xs font-bold hover:border-[#ccff00] hover:text-[#ccff00] cursor-pointer"
                          >
                            일정 · 장소 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cls)}
                            className="px-3 py-2.5 border border-[#E02898]/60 text-[#E02898] text-xs font-bold hover:bg-[#E02898] hover:text-black cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
                      <div>
                        <label className="block text-[11px] font-bold text-[#f4f4f0]/55 mb-1">
                          실제 수강생 수 (명)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={cls.capacity}
                          disabled={cls.started}
                          value={cls.enrolledCount}
                          onChange={(e) =>
                            handleUpdateClassNumbers(cls.id, 'enrolledCount', Number(e.target.value) || 0)
                          }
                          className="w-full bg-[#111] border border-white/20 p-2.5 text-sm text-white disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#f4f4f0]/55 mb-1">
                          회당 강의 시간 (시간)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          disabled={cls.started}
                          value={cls.hoursPerSession}
                          onChange={(e) =>
                            handleUpdateClassNumbers(cls.id, 'hoursPerSession', Number(e.target.value) || 1)
                          }
                          className="w-full bg-[#111] border border-white/20 p-2.5 text-sm text-white disabled:opacity-50"
                        />
                      </div>
                      <div className="flex flex-col justify-end p-2.5 bg-[#111] border border-white/10">
                        <span className="text-[10px] text-[#f4f4f0]/55">반영될 총 시간</span>
                        <span className="text-sm font-extrabold text-[#ccff00]">
                          +{cls.sessionCount * cls.hoursPerSession}시간 · +{cls.enrolledCount}명
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'invites' ? (
          <div className="space-y-8">
            {/* Invite Form */}
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8">
              <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] mb-2 flex items-center gap-2">
                <UserPlus size={18} /> 1회용 강사 초대 링크 발급
              </h2>
              <p className="text-xs text-[#f4f4f0]/60 mb-6">
                초대받은 이메일의 구글 계정으로만 가입 가능하며, 원문 링크는 발급 직후 1회만 표시됩니다. (DB에는 SHA-256 해시만 저장)
              </p>

              <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5 flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">초대 이메일 *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="instructor@gmail.com"
                    className="bg-black border border-[#f4f4f0]/20 p-3 text-sm text-[#f4f4f0] outline-none focus:border-[#ccff00]"
                  />
                </div>
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">메모 (분야·이름)</label>
                  <input
                    type="text"
                    value={inviteMemo}
                    onChange={(e) => setInviteMemo(e.target.value)}
                    placeholder="예: AI 숏폼 파트너 강사"
                    className="bg-black border border-[#f4f4f0]/20 p-3 text-sm text-[#f4f4f0] outline-none focus:border-[#ccff00]"
                  />
                </div>
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">유효 시간</label>
                  <select
                    value={inviteTtlHours}
                    onChange={(e) => setInviteTtlHours(Number(e.target.value) as 24 | 48 | 72)}
                    className="bg-black border border-[#f4f4f0]/20 p-3 text-sm text-[#f4f4f0] outline-none focus:border-[#ccff00]"
                  >
                    <option value={24}>24시간</option>
                    <option value={48}>48시간 (권장)</option>
                    <option value={72}>72시간</option>
                  </select>
                </div>
                <div className="md:col-span-12">
                  <button
                    type="submit"
                    disabled={creatingInvite}
                    className="px-6 py-3 bg-[#ccff00] text-black font-extrabold text-xs uppercase tracking-widest hover:bg-white transition-colors cursor-pointer"
                  >
                    {creatingInvite ? '생성 중...' : '초대 링크 발급 →'}
                  </button>
                </div>
              </form>

              {inviteNotice && (
                <div className="mt-4 p-3 border border-[#F5C400]/50 text-[#F5C400] text-xs font-bold">
                  {inviteNotice}
                </div>
              )}

              {generatedInviteUrl && (
                <div className="mt-6 p-4 border-2 border-[#ccff00] bg-black space-y-2">
                  <div className="text-xs font-extrabold text-[#ccff00] uppercase tracking-wider">
                    발급 완료 · 이 링크는 한 번만 표시됩니다
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <code className="flex-1 text-xs bg-[#141414] p-2.5 border border-white/10 break-all text-[#f4f4f0]">
                      {generatedInviteUrl}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyInviteUrl}
                      className="px-4 py-2.5 bg-[#ccff00] text-black text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedInviteUrl ? <Check size={14} /> : <Copy size={14} />}
                      {copiedInviteUrl ? '복사됨 ✓' : '링크 복사'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Invite History */}
            <div className="border border-[#f4f4f0]/20 bg-[#0d0d0d] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold uppercase tracking-wider">초대 내역 ({invites.length})</h3>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a href="/join/preview?demo=valid" target="_blank" rel="noreferrer" className="text-[#ccff00] underline">가입화면(유효)</a>
                  <a href="/join/preview?demo=used" target="_blank" rel="noreferrer" className="text-[#28B8E8] underline">사용됨</a>
                  <a href="/join/preview?demo=expired" target="_blank" rel="noreferrer" className="text-[#8C8C8C] underline">만료</a>
                  <a href="/join/preview?demo=mismatch" target="_blank" rel="noreferrer" className="text-[#E02898] underline">다른계정</a>
                </div>
              </div>

              {invites.length === 0 ? (
                <p className="text-sm text-[#f4f4f0]/50 py-6">아직 발급된 초대 내역이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {invites.map((inv) => {
                    const isExpired = inv.status === 'pending' && inv.expiresAtMs > 0 && Date.now() > inv.expiresAtMs;
                    const badgeLabel =
                      inv.status === 'used'
                        ? '사용됨'
                        : inv.status === 'revoked'
                          ? '취소됨'
                          : isExpired
                            ? '만료'
                            : '대기 중';
                    return (
                      <div
                        key={inv.id}
                        className="p-4 bg-black border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 border ${
                                badgeLabel === '사용됨'
                                  ? 'bg-[#28B8E8] text-black border-[#28B8E8]'
                                  : badgeLabel === '대기 중'
                                    ? 'border-[#ccff00] text-[#ccff00]'
                                    : badgeLabel === '취소됨'
                                      ? 'border-[#E02898] text-[#E02898]'
                                      : 'border-white/35 text-white/60'
                              }`}
                            >
                              {badgeLabel}
                            </span>
                            <span className="font-bold text-sm">{inv.emailLower}</span>
                          </div>
                          <div className="text-xs text-[#f4f4f0]/55">
                            {inv.memo || '메모 없음'} · 만료: {new Date(inv.expiresAtMs).toLocaleString('ko-KR')}
                          </div>
                        </div>

                        {badgeLabel === '대기 중' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="px-3 py-2 border border-[#E02898] text-[#E02898] text-xs font-bold hover:bg-[#E02898] hover:text-black transition-colors cursor-pointer self-start sm:self-center"
                          >
                            초대 취소
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'approvals' ? (
          <div className="space-y-6">
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] flex items-center gap-2">
                    <ShieldCheck size={18} /> 강사 프로필 공개 승인
                  </h2>
                  <p className="text-xs text-[#f4f4f0]/60 mt-1">
                    강사가 작성한 프로필을 검토하고 공개(`approved`) 또는 반려(`rejected`) 처리합니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(['ALL', 'pending', 'approved', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setApprovalFilter(st)}
                      className={`px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                        approvalFilter === st
                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                          : 'border-white/20 text-white/70'
                      }`}
                    >
                      {st === 'ALL' ? '전체' : st === 'pending' ? '승인 대기' : st === 'approved' ? '승인됨' : '반려됨'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {approvalItems
                  .filter((item) => approvalFilter === 'ALL' || item.status === approvalFilter)
                  .map((item) => (
                    <div key={item.id} className="p-5 bg-black border border-white/15 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 border ${
                                item.status === 'approved'
                                  ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                  : item.status === 'rejected'
                                    ? 'border-[#E02898] text-[#E02898]'
                                    : 'border-[#F5C400] text-[#F5C400]'
                              }`}
                            >
                              {item.status === 'approved' ? '공개 승인됨' : item.status === 'rejected' ? '반려됨' : '● 운영자 승인 대기'}
                            </span>
                            {item.isSample && (
                              <span className="text-[10px] text-white/50 border border-white/15 px-1.5 py-0.5">
                                예시 데이터
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold">{item.displayName}</h3>
                          <p className="text-xs text-[#f4f4f0]/60">{item.title}</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovalDecision(item.id, 'approved')}
                            disabled={item.status === 'approved'}
                            className="px-4 py-2 bg-[#ccff00] text-black text-xs font-extrabold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                          >
                            <Check size={14} /> 승인
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprovalDecision(item.id, 'rejected')}
                            disabled={item.status === 'rejected'}
                            className="px-4 py-2 border border-[#E02898] text-[#E02898] text-xs font-extrabold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                          >
                            <XCircle size={14} /> 반려
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-[#f4f4f0]/80 leading-relaxed">{item.bio}</p>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#f4f4f0]/55 pt-2 border-t border-white/10">
                        <div>전문 분야: {item.tags.join(' · ') || '미입력'}</div>
                        <div>가능 시간: {item.activeDays.join(', ')} {item.scheduleTime}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : loadingData ? (
          <div className="py-20 flex flex-col justify-center items-center gap-4 text-[#ccff00]">
            <Loader className="animate-spin w-8 h-8" />
            <p className="font-mono text-sm uppercase tracking-widest opacity-60">Loading Saved Portfolio...</p>
          </div>
        ) : (
          <>
            {/* ═══ Section 1: Profile ═══ */}
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8 shadow-[8px_8px_0px_rgba(204,255,0,0.1)]">
              <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] mb-6 flex items-center gap-3">
                <span className="text-[#f4f4f0]/20 text-3xl font-black">01</span> Profile Setup
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Creator Name</label>
                  <input
                    value={portfolioData.userName}
                    onChange={e => handleProfileChange('userName', e.target.value)}
                    placeholder="e.g. CodeM Studio"
                    className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Job Role</label>
                  <input
                    value={portfolioData.userRole}
                    onChange={e => handleProfileChange('userRole', e.target.value)}
                    placeholder="e.g. Video Creator / Editor"
                    className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            {/* ═══ Section 2: Manifesto (Identity) ═══ */}
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8 shadow-[8px_8px_0px_rgba(204,255,0,0.1)]">
              <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] mb-6 flex items-center gap-3">
                <span className="text-[#f4f4f0]/20 text-3xl font-black">02</span> Identity & Manifesto
              </h2>
              
              <div className="space-y-4 mb-6">
                <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Manifesto Lines</label>
                {portfolioData.manifesto.lines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold opacity-30">#{idx + 1}</span>
                    <input
                      value={line}
                      onChange={e => handleManifestoLineChange(idx, e.target.value)}
                      placeholder={`Identity Line ${idx + 1}`}
                      className="flex-1 bg-black border border-[#f4f4f0]/15 p-3 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                    />
                    {portfolioData.manifesto.lines.length > 1 && (
                      <button 
                        onClick={() => removeManifestoLine(idx)}
                        className="text-red-500 hover:text-red-400 p-1.5 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  onClick={addManifestoLine}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#ccff00] opacity-80 hover:opacity-100 transition-all uppercase tracking-widest pt-2"
                >
                  <Plus size={14} /> Add Line
                </button>
              </div>

              <div className="flex flex-col gap-1.5 pt-4 border-t border-[#f4f4f0]/10">
                <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Highlight (Bold Text at bottom)</label>
                <input
                  value={portfolioData.manifesto.highlight}
                  onChange={e => handleManifestoHighlightChange(e.target.value)}
                  placeholder="e.g. 하고싶은거 다해."
                  className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                />
              </div>
            </div>

            {/* ═══ Section 3: Masterpiece (Representative Work) ═══ */}
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8 shadow-[8px_8px_0px_rgba(204,255,0,0.1)]">
              <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] mb-6 flex items-center gap-3">
                <span className="text-[#f4f4f0]/20 text-3xl font-black">03</span> Representative Work (Masterpiece)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Section Display Title</label>
                  <input
                    value={portfolioData.masterpiece.title}
                    onChange={e => handleMasterpieceChange('title', e.target.value)}
                    placeholder="e.g. REPRESENTATIVE\nWORK"
                    className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Work Title / Award</label>
                  <input
                    value={portfolioData.masterpiece.descriptionTitle}
                    onChange={e => handleMasterpieceChange('descriptionTitle', e.target.value)}
                    placeholder="e.g. 경기관광공사 영상 공모전 입상작"
                    className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-6">
                <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em]">Work Description</label>
                <textarea
                  value={portfolioData.masterpiece.descriptionSub}
                  onChange={e => handleMasterpieceChange('descriptionSub', e.target.value)}
                  placeholder='e.g. "Code:M Studio"가 제작한 경기도의 새로운 매력.'
                  rows={2}
                  className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm resize-none"
                />
              </div>

              <div className="border-t border-[#f4f4f0]/10 pt-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* YouTube link */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em] flex items-center gap-1.5">
                      <Youtube size={14} className="text-red-500" /> YouTube Embed URL
                    </label>
                    <input
                      value={portfolioData.masterpiece.embedSrc}
                      onChange={e => handleMasterpieceChange('embedSrc', e.target.value)}
                      placeholder="e.g. https://www.youtube.com/embed/P-b7WV-obKs"
                      className="bg-black border border-[#f4f4f0]/15 p-3.5 text-[#f4f4f0] font-bold outline-none focus:border-[#ccff00] transition-colors text-sm"
                    />
                    <p className="text-[10px] text-gray-500">유튜브 영상인 경우 embed 형식의 링크를 기재해 주세요.</p>
                  </div>

                  {/* Image upload as fallback */}
                  <div className="w-full sm:w-1/3 flex flex-col justify-end">
                    <label className="text-xs font-bold opacity-45 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                      <ImageIcon size={14} /> Image File Upload
                    </label>
                    
                    <label className={`w-full bg-black border border-dashed border-[#f4f4f0]/20 p-4 font-bold text-center text-xs tracking-widest cursor-pointer hover:border-[#ccff00] hover:text-[#ccff00] transition-colors flex flex-col items-center justify-center gap-2 ${uploadingMedia.masterpiece ? 'opacity-50' : ''}`}>
                      {uploadingMedia.masterpiece ? (
                        <Loader className="animate-spin" size={16} />
                      ) : (
                        <ImageIcon size={16} />
                      )}
                      {uploadingMedia.masterpiece ? 'Uploading...' : 'Upload Image File'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingMedia.masterpiece}
                        onChange={handleMasterpieceImageUpload}
                      />
                    </label>
                  </div>
                </div>

                {portfolioData.masterpiece.embedSrc && (
                  <div className="mt-6 p-4 bg-black/40 border border-[#f4f4f0]/15 inline-block">
                    <p className="text-[10px] font-bold text-[#ccff00] uppercase tracking-wider mb-2">Media Preview</p>
                    {isEmbeddableYoutubeVideo(portfolioData.masterpiece.embedSrc) ? (
                      <div className="w-[180px] aspect-video">
                        <iframe 
                          src={getYoutubeEmbedUrl(portfolioData.masterpiece.embedSrc)} 
                          title="Preview" 
                          className="w-full h-full object-cover" 
                          frameBorder="0" 
                        />
                      </div>
                    ) : (
                      <img 
                        src={portfolioData.masterpiece.embedSrc} 
                        alt="Preview" 
                        className="max-w-[180px] aspect-video object-cover" 
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ Section 4: Actions (Projects) ═══ */}
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8 shadow-[8px_8px_0px_rgba(204,255,0,0.1)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] flex items-center gap-3">
                  <span className="text-[#f4f4f0]/20 text-3xl font-black">04</span> Actions (Projects)
                </h2>
                
                <button
                  type="button"
                  onClick={addActionCard}
                  className="bg-[#ccff00] text-black font-display font-bold text-xs uppercase px-4 py-2 hover:bg-white transition-colors flex items-center gap-1.5 shadow-[2px_2px_0_#fff] cursor-pointer"
                >
                  <Plus size={14} /> Add Project
                </button>
              </div>

              <div className="space-y-6">
                {portfolioData.actions.map((project, idx) => (
                  <div key={project.id} className="border border-[#f4f4f0]/15 bg-black/30 p-5 relative group">
                    {/* Control Buttons */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                      <button 
                        type="button"
                        title="위로 이동"
                        onClick={() => moveActionUp(idx)} 
                        disabled={idx === 0}
                        className="border border-[#f4f4f0]/20 bg-black/80 text-white/70 hover:text-[#ccff00] hover:border-[#ccff00] disabled:opacity-20 disabled:pointer-events-none transition-all p-1.5 cursor-pointer"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button 
                        type="button"
                        title="아래로 이동"
                        onClick={() => moveActionDown(idx)} 
                        disabled={idx === portfolioData.actions.length - 1}
                        className="border border-[#f4f4f0]/20 bg-black/80 text-white/70 hover:text-[#ccff00] hover:border-[#ccff00] disabled:opacity-20 disabled:pointer-events-none transition-all p-1.5 cursor-pointer"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button 
                        type="button"
                        title="프로젝트 삭제"
                        onClick={() => removeActionCard(idx)}
                        className="border border-red-500/30 bg-black/80 text-red-500 hover:text-red-400 hover:border-red-400 transition-colors p-1.5 ml-1 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="text-xs font-mono font-bold text-[#ccff00] opacity-60 uppercase tracking-widest mb-4">
                      Project Card #{idx + 1} {project.title ? `— ${project.title}` : ''}
                    </div>

                    {/* Media Type Toggle */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#f4f4f0]/10">
                      <span className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Card Type</span>
                      <div className="flex border border-[#f4f4f0]/25 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateAction(idx, 'mediaType', 'image')}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${(!project.mediaType || project.mediaType === 'image') ? 'bg-[#ccff00] text-black' : 'text-[#f4f4f0]/50 hover:text-[#f4f4f0]'}`}
                        >
                          Image Link
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAction(idx, 'mediaType', 'youtube')}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${project.mediaType === 'youtube' ? 'bg-[#ccff00] text-black' : 'text-[#f4f4f0]/50 hover:text-[#f4f4f0]'}`}
                        >
                          YouTube Video
                        </button>
                      </div>
                    </div>

                    {project.mediaType === 'youtube' ? (
                      /* YouTube Card Inputs */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Project Title</label>
                          <input
                            value={project.title || ''}
                            onChange={e => updateAction(idx, 'title', e.target.value)}
                            placeholder="e.g. MechFlow YouTube Video"
                            className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <Youtube size={12} className="text-red-500" /> YouTube Video / Channel URL
                          </label>
                          <input
                            value={project.videoSrc || ''}
                            onChange={e => updateAction(idx, 'videoSrc', e.target.value)}
                            placeholder="e.g. https://www.youtube.com/watch?v=P-b7WV-obKs"
                            className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Image Card Inputs (Default) */
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Project Title</label>
                            <input
                              value={project.title || ''}
                              onChange={e => updateAction(idx, 'title', e.target.value)}
                              placeholder="e.g. MechFlow"
                              className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Redirect URL / Link</label>
                            <input
                              value={project.href || ''}
                              onChange={e => updateAction(idx, 'href', e.target.value)}
                              placeholder="e.g. https://machine.do-daham.com"
                              className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                          <div className="flex-1 flex flex-col gap-1 w-full">
                            <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Image URL</label>
                            <input
                              value={project.img || ''}
                              onChange={e => updateAction(idx, 'img', e.target.value)}
                              placeholder="e.g. https://images.unsplash.com/..."
                              className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                            />
                          </div>
                          
                          <div className="w-full sm:w-auto">
                            <label className={`inline-block w-full text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors border border-[#f4f4f0]/20 hover:border-[#ccff00] hover:text-[#ccff00] whitespace-nowrap bg-black ${uploadingMedia[`action-${project.id}`] ? 'opacity-50' : ''}`}>
                              {uploadingMedia[`action-${project.id}`] ? <Loader className="animate-spin inline mr-1" size={10} /> : <ImageIcon size={10} className="inline mr-1" />}
                              {uploadingMedia[`action-${project.id}`] ? 'Uploading...' : 'Upload Image'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingMedia[`action-${project.id}`]}
                                onChange={e => handleActionImageUpload(project.id, e)}
                              />
                            </label>
                          </div>

                          {project.img && (
                            <div className="border border-[#f4f4f0]/10 p-1 bg-black shrink-0">
                              <img src={project.img} alt="preview" className="h-[44px] aspect-[4/3] object-cover" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {portfolioData.actions.length === 0 && (
                <div className="text-center py-10 border border-dashed border-[#f4f4f0]/10 opacity-30 font-bold uppercase text-xs tracking-wider">
                  등록된 프로젝트 카드가 없습니다. 추가해 보세요.
                </div>
              )}
            </div>

            {/* ═══ Section 5: Activity & Media (Credentials) ═══ */}
            <div className="border-[3px] border-[#ccff00] bg-[#0d0d0d] p-6 md:p-8 shadow-[8px_8px_0px_rgba(204,255,0,0.15)]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] flex items-center gap-3">
                    <span className="text-[#f4f4f0]/20 text-3xl font-black">05</span> Activity & Media
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    강사 현장 경험 사진, 언론 보도 인터뷰 및 칼럼 기록 관리
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/activity')}
                  className="px-5 py-3 bg-[#ccff00] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-white transition-all shadow-[3px_3px_0_#fff] flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  <span>활동 관리 페이지 바로가기 →</span>
                </button>
              </div>
              <div className="p-4 bg-black/50 border border-white/10 rounded text-xs text-neutral-300 leading-relaxed space-y-1">
                <p>• 현재 로그인된 관리자 계정(<strong className="text-[#ccff00]">{user.email}</strong>)으로 활동 관리 페이지에서 직접 사진 등록, 기사 링크 첨부, 수정 및 삭제가 가능합니다.</p>
                <p>• 일반 방문자에게는 등록 및 삭제 버튼이 노출되지 않으며 오직 읽기 전용으로 안전하게 제공됩니다.</p>
              </div>
            </div>

            {/* ═══ Section 6: Forms, KakaoTalk & Class Application Control ═══ */}
            <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 md:p-8 shadow-[8px_8px_0px_rgba(204,255,0,0.1)] space-y-6">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-[#ccff00] mb-1 flex items-center gap-3">
                  <span className="text-[#f4f4f0]/20 text-3xl font-black">06</span> 폼 · 카카오톡 &amp; 강의 신청 제어
                </h2>
                <p className="text-xs text-neutral-400">
                  강의 신청 폼 오픈 여부, 강의/제작 문의 폼 URL, 실제 카카오톡 채널/오픈채팅 연결 주소를 여기서 관리합니다. (변경 후 우측 상단/하단 Save 버튼 클릭)
                </p>
              </div>

              {/* Class Application Open/Close Toggle */}
              <div className="p-4 bg-black border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-white">
                    1기 강의 신청 폼 상태:{' '}
                    <span className={portfolioData.siteSettings?.classApplicationOpen ? 'text-[#ccff00]' : 'text-[#F5C400]'}>
                      {portfolioData.siteSettings?.classApplicationOpen ? '열림 (신청 가능)' : '닫힘 (신청 폼 정비 중)'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    닫힘 상태에서는 /class 및 /class/schedule의 신청 버튼이 준비 중 안내로 전환됩니다.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0 px-4 py-2.5 border border-white/20 bg-[#141414]">
                  <input
                    type="checkbox"
                    checked={Boolean(portfolioData.siteSettings?.classApplicationOpen)}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          classApplicationOpen: e.target.checked
                        }
                      }))
                    }
                    className="w-4 h-4 accent-[#ccff00]"
                  />
                  <span className="text-xs font-extrabold text-[#ccff00]">신청 폼 열기</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">
                    강의 신청 폼 URL (오픈 시 연결)
                  </label>
                  <input
                    type="url"
                    value={portfolioData.siteSettings?.classApplicationFormUrl || ''}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          classApplicationFormUrl: e.target.value
                        }
                      }))
                    }
                    placeholder="https://forms.gle/... (새로 제작한 강의 신청 폼)"
                    className="bg-black border border-[#f4f4f0]/20 p-3.5 text-sm text-white outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">
                    신청 닫힘 시 버튼 안내 문구
                  </label>
                  <input
                    type="text"
                    value={portfolioData.siteSettings?.classApplicationClosedMessage || ''}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          classApplicationClosedMessage: e.target.value
                        }
                      }))
                    }
                    placeholder="1기 신청 폼 정비 중 · 곧 오픈됩니다"
                    className="bg-black border border-[#f4f4f0]/20 p-3.5 text-sm text-white outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">
                    강의 · 출강 문의 폼 URL (신청 폼과 별도)
                  </label>
                  <input
                    type="url"
                    value={portfolioData.siteSettings?.classInquiryFormUrl || ''}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          classInquiryFormUrl: e.target.value
                        }
                      }))
                    }
                    placeholder="https://forms.gle/..."
                    className="bg-black border border-[#f4f4f0]/20 p-3.5 text-sm text-white outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">
                    제작 의뢰 문의 폼 URL
                  </label>
                  <input
                    type="url"
                    value={portfolioData.siteSettings?.projectInquiryFormUrl || ''}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          projectInquiryFormUrl: e.target.value
                        }
                      }))
                    }
                    placeholder="https://forms.gle/..."
                    className="bg-black border border-[#f4f4f0]/20 p-3.5 text-sm text-white outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">
                    카카오톡 실제 연결 URL (오픈채팅 / 채널)
                  </label>
                  <input
                    type="url"
                    value={portfolioData.siteSettings?.kakaoUrl || ''}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          kakaoUrl: e.target.value
                        }
                      }))
                    }
                    placeholder="https://pf.kakao.com/... 또는 https://open.kakao.com/..."
                    className="bg-black border border-[#f4f4f0]/20 p-3.5 text-sm text-white outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">
                    카카오톡 채널명 / 핸들
                  </label>
                  <input
                    type="text"
                    value={portfolioData.siteSettings?.kakaoHandle || ''}
                    onChange={(e) =>
                      setPortfolioData((prev) => ({
                        ...prev,
                        siteSettings: {
                          ...normalizeSiteSettings(prev.siteSettings),
                          kakaoHandle: e.target.value
                        }
                      }))
                    }
                    placeholder="@AI다함스튜디오"
                    className="bg-black border border-[#f4f4f0]/20 p-3.5 text-sm text-white outline-none focus:border-[#ccff00]"
                  />
                </div>
              </div>
            </div>
            
            {/* ═══ Float Save Bar ═══ */}
            <div className="fixed bottom-6 right-6 z-40">
              <button
                onClick={handleSave}
                disabled={savingData}
                className={`flex items-center justify-center gap-2 px-8 py-4 font-display font-bold uppercase text-base tracking-widest transition-all ${
                  saveSuccess 
                    ? 'bg-green-500 text-black shadow-[4px_4px_0_#fff]' 
                    : 'bg-[#ccff00] text-black hover:bg-white shadow-[4px_4px_0_#fff] hover:scale-105'
                } disabled:opacity-50 cursor-pointer rounded-none`}
              >
                {savingData ? <Loader className="animate-spin" size={18} /> : <Save size={18}/>}
                {savingData ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save All Settings'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
