import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { 
  ArrowLeft, LogOut, Save, Plus, Trash2, ArrowUp, ArrowDown, 
  Image as ImageIcon, Youtube, Link as LinkIcon, Cpu, Loader, AlertTriangle
} from 'lucide-react';
import { isYoutubeUrl, getYoutubeEmbedUrl } from '../lib/youtube';

interface Project {
  id: number;
  title: string;
  href: string;
  img: string;
  mediaType?: 'image' | 'youtube';
  videoSrc?: string;
  external?: boolean;
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
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    actions: []
  });

  // UI state
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<{ [key: string]: boolean }>({});

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPortfolioData();
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Portfolio Data from Firestore
  const fetchPortfolioData = async () => {
    setLoadingData(true);
    try {
      const docRef = doc(db, 'portfolios', 'admin_default');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const raw = docSnap.data().data;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        // Match default schema structure
        setPortfolioData({
          userName: parsed.userName || '',
          userRole: parsed.userRole || '',
          manifesto: {
            lines: parsed.manifesto?.lines || [''],
            highlight: parsed.manifesto?.highlight || ''
          },
          masterpiece: {
            title: parsed.masterpiece?.title || '',
            descriptionTitle: parsed.masterpiece?.descriptionTitle || '',
            descriptionSub: parsed.masterpiece?.descriptionSub || '',
            embedSrc: parsed.masterpiece?.embedSrc || ''
          },
          actions: parsed.actions || []
        });
      }
    } catch (e) {
      console.error("Error loading portfolio from Firestore:", e);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Handle Authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('이메일 혹은 비밀번호가 일치하지 않습니다.');
      } else {
        setAuthError(err.message || '로그인 중 오류가 발생했습니다.');
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

  const handleActionImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(prev => ({ ...prev, [`action-${index}`]: true }));
    try {
      const url = await uploadImage(file, `action_${index}`);
      updateAction(index, 'img', url);
    } catch (err: any) {
      alert('이미지 업로드 실패: ' + err.message);
    } finally {
      setUploadingMedia(prev => ({ ...prev, [`action-${index}`]: false }));
    }
  };

  // 6. Project Card Handlers
  const addActionCard = () => {
    const newProject: Project = {
      id: Date.now(),
      title: '',
      href: '',
      img: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      mediaType: 'image',
      videoSrc: ''
    };
    setPortfolioData(prev => ({
      ...prev,
      actions: [...prev.actions, newProject]
    }));
  };

  const removeActionCard = (index: number) => {
    setPortfolioData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index: number, field: keyof Project, val: string) => {
    setPortfolioData(prev => {
      const newActions = [...prev.actions];
      newActions[index] = { ...newActions[index], [field]: val } as Project;
      return { ...prev, actions: newActions };
    });
  };

  const moveActionUp = (index: number) => {
    if (index === 0) return;
    setPortfolioData(prev => {
      const newActions = [...prev.actions];
      const temp = newActions[index];
      newActions[index] = newActions[index - 1];
      newActions[index - 1] = temp;
      return { ...prev, actions: newActions };
    });
  };

  const moveActionDown = (index: number) => {
    if (index === portfolioData.actions.length - 1) return;
    setPortfolioData(prev => {
      const newActions = [...prev.actions];
      const temp = newActions[index];
      newActions[index] = newActions[index + 1];
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
          embedSrc: isYoutubeUrl(portfolioData.masterpiece.embedSrc)
            ? getYoutubeEmbedUrl(portfolioData.masterpiece.embedSrc)
            : portfolioData.masterpiece.embedSrc
        },
        actions: portfolioData.actions.map(a => ({
          ...a,
          videoSrc: a.mediaType === 'youtube' && a.videoSrc
            ? getYoutubeEmbedUrl(a.videoSrc)
            : (a.videoSrc || ''),
          external: a.href ? a.href.startsWith('http') : false
        }))
      };

      await setDoc(doc(db, 'portfolios', 'admin_default'), {
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
          <p className="opacity-70 font-bold mb-8 text-sm break-keep tracking-widest">
            포트폴리오의 업로드 및 수정을 위해 이메일로 로그인해 주세요.
          </p>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold opacity-40 uppercase tracking-[0.15em] mb-1.5 block">Email Address</label>
              <input 
                type="email"
                placeholder="admin@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-[#f4f4f0]/20 p-4 font-bold outline-none focus:border-[#ccff00] text-sm transition-colors text-white"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold opacity-40 uppercase tracking-[0.15em] mb-1.5 block">Password</label>
              <input 
                type="password"
                placeholder="******" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-black border border-[#f4f4f0]/20 p-4 font-bold outline-none focus:border-[#ccff00] text-sm transition-colors text-white"
              />
            </div>

            {authError && (
              <p className="text-red-500 font-bold text-sm tracking-wider flex items-center gap-1.5 bg-red-950/20 border border-red-500/30 p-3">
                <AlertTriangle size={14} />
                {authError}
              </p>
            )}

            <button 
              type="submit" 
              disabled={authLoading} 
              className="w-full bg-[#ccff00] text-black font-display text-xl uppercase py-4 hover:bg-white transition-colors mt-4 disabled:opacity-50 font-bold tracking-widest cursor-pointer shadow-[4px_4px_0_#fff]"
            >
              {authLoading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
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
            <h1 className="text-4xl font-black uppercase text-[#ccff00] tracking-wider mb-2">DO-DAHAM CMS</h1>
            <p className="text-sm font-bold opacity-40">이곳에서 포트폴리오의 실시간 데이터를 편리하게 업로드하고 관리합니다.</p>
          </div>
          
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
        </div>

        {loadingData ? (
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
                    {isYoutubeUrl(portfolioData.masterpiece.embedSrc) ? (
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
                  onClick={addActionCard}
                  className="bg-[#ccff00] text-black font-display font-bold text-xs uppercase px-4 py-2 hover:bg-white transition-colors flex items-center gap-1.5 shadow-[2px_2px_0_#fff]"
                >
                  <Plus size={14} /> Add Project
                </button>
              </div>

              <div className="space-y-6">
                {portfolioData.actions.map((project, idx) => (
                  <div key={project.id} className="border border-[#f4f4f0]/15 bg-black/30 p-5 relative group">
                    {/* Control Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => moveActionUp(idx)} 
                        disabled={idx === 0}
                        className="text-white/40 hover:text-[#ccff00] disabled:opacity-20 transition-all p-1"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => moveActionDown(idx)} 
                        disabled={idx === portfolioData.actions.length - 1}
                        className="text-white/40 hover:text-[#ccff00] disabled:opacity-20 transition-all p-1"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeActionCard(idx)}
                        className="text-red-500 hover:text-red-400 transition-colors p-1 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="text-xs font-mono font-bold text-[#ccff00] opacity-40 uppercase tracking-widest mb-4">Project Card #{idx + 1}</div>

                    {/* Media Type Toggle */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#f4f4f0]/10">
                      <span className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Card Type</span>
                      <div className="flex border border-[#f4f4f0]/25 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateAction(idx, 'mediaType', 'image')}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${(!project.mediaType || project.mediaType === 'image') ? 'bg-[#ccff00] text-black' : 'text-[#f4f4f0]/50 hover:text-[#f4f4f0]'}`}
                        >
                          Image Link
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAction(idx, 'mediaType', 'youtube')}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${project.mediaType === 'youtube' ? 'bg-[#ccff00] text-black' : 'text-[#f4f4f0]/50 hover:text-[#f4f4f0]'}`}
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
                            value={project.title}
                            onChange={e => updateAction(idx, 'title', e.target.value)}
                            placeholder="e.g. MechFlow YouTube Video"
                            className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <Youtube size={12} className="text-red-500" /> YouTube Embed URL
                          </label>
                          <input
                            value={project.videoSrc || ''}
                            onChange={e => updateAction(idx, 'videoSrc', e.target.value)}
                            placeholder="e.g. https://www.youtube.com/embed/P-b7WV-obKs"
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
                              value={project.title}
                              onChange={e => updateAction(idx, 'title', e.target.value)}
                              placeholder="e.g. MechFlow"
                              className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold opacity-45 uppercase tracking-[0.15em]">Redirect URL / Link</label>
                            <input
                              value={project.href}
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
                              value={project.img}
                              onChange={e => updateAction(idx, 'img', e.target.value)}
                              placeholder="e.g. https://images.unsplash.com/..."
                              className="bg-black border border-[#f4f4f0]/15 p-2.5 text-white font-bold outline-none focus:border-[#ccff00] text-xs transition-colors"
                            />
                          </div>
                          
                          <div className="w-full sm:w-auto">
                            <label className={`inline-block w-full text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors border border-[#f4f4f0]/20 hover:border-[#ccff00] hover:text-[#ccff00] whitespace-nowrap bg-black ${uploadingMedia[`action-${idx}`] ? 'opacity-50' : ''}`}>
                              {uploadingMedia[`action-${idx}`] ? <Loader className="animate-spin inline mr-1" size={10} /> : <ImageIcon size={10} className="inline mr-1" />}
                              {uploadingMedia[`action-${idx}`] ? 'Uploading...' : 'Upload Image'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingMedia[`action-${idx}`]}
                                onChange={e => handleActionImageUpload(idx, e)}
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
