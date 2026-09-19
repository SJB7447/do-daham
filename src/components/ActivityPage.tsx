import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, X, ExternalLink, ZoomIn, 
  Trash2, Image as ImageIcon, Newspaper, ShieldCheck, Lock, RefreshCw, Loader2, Quote, Sparkles
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { CrystalCube } from './CrystalCube';
import { ActivityItem, ActivityCategory } from '../types/activity';
import FaceBlurStudioModal from './FaceBlurStudioModal';
import { 
  DEFAULT_ACTIVITIES, 
  fetchActivitiesFromCloud, 
  saveActivitiesToCloud, 
  isAuthorizedAdmin,
  ADMIN_EMAILS
} from '../data/defaultActivities';

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | ActivityCategory>('all');
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth state for Admin Check
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAdmin = isAuthorizedAdmin(currentUser?.email);

  // Editorial Detail Modal state
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [activeModalImage, setActiveModalImage] = useState<string>('');

  // CMS Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'photo' as ActivityCategory,
    title: '',
    organization: '',
    date: new Date().toISOString().slice(0, 7).replace('-', '.'),
    imageUrl: '',
    additionalImages: [] as string[],
    link: '',
    description: '',
    tags: ''
  });
  // Multi-image state: holds list of photos with raw and processed data URLs
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; raw: string; processed: string; isBlurred: boolean }[]>([]);
  const [isBlurStudioOpen, setIsBlurStudioOpen] = useState(false);
  const [isBlurredApplied, setIsBlurredApplied] = useState(false);
  const [formError, setFormError] = useState<string>('');

  // 1. Auth Listener & Initial Cloud Fetch
  useEffect(() => {
    document.title = 'ACTIVITY & MEDIA · DO-DAHAM';
    window.scrollTo({ top: 0, behavior: 'auto' });

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // Fetch activities from Cloud Firestore
    fetchActivitiesFromCloud()
      .then((data) => {
        setActivities(data);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  // Handle scroll for nav styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Image file reader for CMS modal with privacy blur integration (Supports multiple images)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (files.length === 0) return;

    const validFiles = files.filter((f: File) => {
      if (f.size > 8 * 1024 * 1024) {
        setFormError(`파일 용량이 너무 큽니다: ${f.name} (8MB 이하 권장)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    try {
      const readPromises = validFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const loadedUrls = await Promise.all(readPromises);
      const newItems = loadedUrls.map((url, idx) => ({
        id: `img-${Date.now()}-${idx}`,
        raw: url,
        processed: url,
        isBlurred: false
      }));

      setUploadedPhotos(prev => {
        const combined = [...prev, ...newItems];
        // Set first as primary imageUrl, rest as additionalImages
        setFormData(f => ({
          ...f,
          imageUrl: combined[0]?.processed || '',
          additionalImages: combined.slice(1).map(p => p.processed)
        }));
        return combined;
      });

      setIsBlurredApplied(false);
      setFormError('');
      // Automatically prompt face blur studio for portrait rights
      setIsBlurStudioOpen(true);
    } catch (err) {
      console.error('Failed to read files', err);
      setFormError('이미지 파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  // Remove single uploaded photo
  const handleRemovePhoto = (id: string) => {
    setUploadedPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      setFormData(f => ({
        ...f,
        imageUrl: updated[0]?.processed || '',
        additionalImages: updated.slice(1).map(p => p.processed)
      }));
      return updated;
    });
  };

  // Submit new activity (Strictly requires authorized admin)
  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert(`권한이 없습니다. 등록된 관리자 이메일(${ADMIN_EMAILS[0]})로 로그인해야만 등록할 수 있습니다.`);
      return;
    }

    if (!formData.title.trim()) {
      setFormError('제목을 입력해주세요.');
      return;
    }
    if (!formData.organization.trim()) {
      setFormError('기관명 또는 언론사명을 입력해주세요.');
      return;
    }
    if (!formData.imageUrl.trim() && uploadedPhotos.length === 0) {
      setFormError('사진 파일 또는 이미지 URL을 등록해주세요.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const primaryImg = formData.imageUrl || (uploadedPhotos[0] ? uploadedPhotos[0].processed : '');
    const extraImgs = uploadedPhotos.length > 1
      ? uploadedPhotos.slice(1).map(p => p.processed)
      : (formData.additionalImages && formData.additionalImages.length > 0 ? formData.additionalImages : undefined);

    const newActivity: ActivityItem = {
      id: `act-custom-${Date.now()}`,
      category: formData.category,
      title: formData.title.trim(),
      organization: formData.organization.trim(),
      date: formData.date.trim() || new Date().toISOString().slice(0, 7).replace('-', '.'),
      imageUrl: primaryImg,
      additionalImages: extraImgs,
      link: formData.link.trim() || undefined,
      description: formData.description.trim(),
      tags: formData.tags
        ? formData.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
        : [],
      createdAt: Date.now()
    };

    const updated = [newActivity, ...activities];

    try {
      await saveActivitiesToCloud(updated, currentUser?.email);
      setActivities(updated);
      setIsAddModalOpen(false);
      setFormData({
        category: 'photo',
        title: '',
        organization: '',
        date: new Date().toISOString().slice(0, 7).replace('-', '.'),
        imageUrl: '',
        additionalImages: [],
        link: '',
        description: '',
        tags: ''
      });
      setUploadedPhotos([]);
      setIsBlurredApplied(false);
      alert('새 활동이 클라우드에 안전하게 발행되었습니다.');
    } catch (err: any) {
      setFormError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete activity item (Strictly requires authorized admin)
  const handleDeleteActivity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      alert('관리자만 활동 내역을 삭제할 수 있습니다.');
      return;
    }

    if (window.confirm('해당 활동 기록을 영구 삭제하시겠습니까?')) {
      const updated = activities.filter(item => item.id !== id);
      try {
        await saveActivitiesToCloud(updated, currentUser?.email);
        setActivities(updated);
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      } catch (err: any) {
        alert(err.message || '삭제 도중 오류가 발생했습니다.');
      }
    }
  };

  // Reset to default activities (Admin only)
  const handleResetToDefault = async () => {
    if (!isAdmin) {
      alert('관리자만 초기화할 수 있습니다.');
      return;
    }
    if (window.confirm('기본 예시 데이터로 초기화하시겠습니까? 직접 등록한 활동 데이터가 지워집니다.')) {
      try {
        await saveActivitiesToCloud(DEFAULT_ACTIVITIES, currentUser?.email);
        setActivities(DEFAULT_ACTIVITIES);
        alert('기본 데이터로 초기화되었습니다.');
      } catch (err: any) {
        alert(err.message || '초기화 실패');
      }
    }
  };

  // Filter items
  const filteredActivities = activities.filter(item => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* ── Top Navigation ── */}
      <nav className={`bar ${scrolled ? 'scrolled' : ''}`} id="main-nav">
        <Link to="/" className="nav-logo">
          <CrystalCube size={26} pfx="actnav" />
          <span className="nav-logo-text uppercase tracking-wider">DO-DAHAM</span>
        </Link>
        <div className="nav-links">
          <Link to="/#manifesto">MANIFESTO</Link>
          <Link to="/#masterpiece">MASTERPIECE</Link>
          <Link to="/#actions">ACTIONS</Link>
          <Link to="/activity" className="text-[#C6FF00] font-bold border-b border-[#C6FF00] pb-0.5">
            ACTIVITY & MEDIA
          </Link>
          <Link to="/admin">CMS</Link>
        </div>
        <Link to="/" className="nav-watch flex items-center gap-1.5">
          <ArrowLeft size={13} />
          <span>PORTFOLIO HOME</span>
        </Link>
      </nav>

      {/* ── Page Header / Sub Hero ── */}
      <header className="pt-32 pb-14 px-6 md:px-14 max-w-7xl mx-auto border-b border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#C6FF00] text-xs font-mono tracking-widest uppercase mb-3">
              <span className="inline-block w-2 h-2 rounded-full bg-[#C6FF00] animate-pulse"></span>
              CURATED FIELD CREDENTIALS & MEDIA ARCHIVE
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight ff-disp uppercase">
              ACTIVITY & <span className="text-[#C6FF00]">MEDIA</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-neutral-300 max-w-2xl leading-relaxed font-light break-keep">
              강의실과 컨퍼런스 현장의 생생한 열기, 그리고 공신력 있는 언론 보도로 입증된
              <br className="hidden md:inline" /> 강사 DO-DAHAM의 실전 커리어 아카이브입니다.
            </p>
          </div>

          {/* Action Tools (Admin Only vs Visitor) */}
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#C6FF00]/10 border border-[#C6FF00]/30 text-[#C6FF00] text-xs font-mono">
                  <ShieldCheck size={14} />
                  <span className="font-bold">ADMIN ACTIVE</span>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#C6FF00] text-[#0A0A0A] font-extrabold text-xs uppercase tracking-wider rounded-md hover:bg-white transition-all shadow-[0_0_20px_rgba(198,255,0,0.25)] hover:scale-105"
                >
                  <Plus size={15} />
                  <span>새 활동 등록 (CMS)</span>
                </button>
                <button
                  onClick={handleResetToDefault}
                  title="기본 샘플 데이터로 복원"
                  className="p-2.5 border border-white/15 hover:border-white/40 text-neutral-400 hover:text-white rounded-md transition-colors text-xs"
                >
                  <RefreshCw size={14} />
                </button>
              </>
            ) : (
              <Link
                to="/admin"
                title="관리자 로그인"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-white/10 hover:border-[#C6FF00]/40 text-neutral-400 hover:text-[#C6FF00] text-xs font-mono transition-colors"
              >
                <Lock size={12} />
                <span>ADMIN LOGIN</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Category Filters & Stat ── */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#C6FF00] text-[#0A0A0A] shadow-[0_2px_10px_rgba(198,255,0,0.2)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ALL ARCHIVE ({activities.length})
            </button>
            <button
              onClick={() => setActiveFilter('photo')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                activeFilter === 'photo'
                  ? 'bg-[#C6FF00] text-[#0A0A0A] shadow-[0_2px_10px_rgba(198,255,0,0.2)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} />
              현장 스케치 ({activities.filter(a => a.category === 'photo').length})
            </button>
            <button
              onClick={() => setActiveFilter('press')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                activeFilter === 'press'
                  ? 'bg-[#28C8F0] text-[#0A0A0A] shadow-[0_2px_10px_rgba(40,200,240,0.2)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Newspaper size={13} />
              언론 보도 & 인터뷰 ({activities.filter(a => a.category === 'press').length})
            </button>
          </div>

          <div className="text-xs font-mono text-neutral-400 tracking-wider">
            {filteredActivities.length} OF {activities.length} RECORDS
          </div>
        </div>
      </header>

      {/* ── Cards Grid Section ── */}
      <main className="max-w-7xl mx-auto px-6 md:px-14 py-12">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[#C6FF00]" size={30} />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Loading Archive from Cloud...
            </span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-lg">
            <p className="text-neutral-400 text-sm">해당 분류에 등록된 활동 기록이 없습니다.</p>
            {isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#C6FF00] text-[#0A0A0A] font-bold text-xs uppercase rounded-md inline-flex items-center gap-2"
              >
                <Plus size={14} /> 첫 활동 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredActivities.map((item) => {
              const isPhoto = item.category === 'photo';

              return (
                <div
                  key={item.id}
                  className="group relative bg-[#121215]/90 backdrop-blur-md border border-white/[0.08] hover:border-[#C6FF00]/50 rounded-lg overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
                >
                  {/* Card Thumbnail Area */}
                  <div 
                    className="relative aspect-[16/10] overflow-hidden bg-black cursor-pointer"
                    onClick={() => {
                      setSelectedItem(item);
                      setActiveModalImage(item.imageUrl);
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-transparent to-black/20" />

                    {/* Category Badge - Glass Pill */}
                    <div className="absolute top-3.5 left-3.5">
                      {isPhoto ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-black/75 backdrop-blur-md border border-[#C6FF00]/40 text-[#C6FF00] rounded-full flex items-center gap-1.5 shadow-md">
                          <ImageIcon size={11} /> FIELD PHOTO
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-black/75 backdrop-blur-md border border-[#28C8F0]/40 text-[#28C8F0] rounded-full flex items-center gap-1.5 shadow-md">
                          <Newspaper size={11} /> PRESS & MEDIA
                        </span>
                      )}
                    </div>

                    {/* Hover Action Overlay */}
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <span className="flex items-center gap-1.5 px-3.5 py-2 bg-[#C6FF00] text-[#0A0A0A] text-xs font-extrabold rounded-md shadow-lg">
                        <ZoomIn size={14} /> 상세 스토리 & 인터뷰 보기
                      </span>
                    </div>
                  </div>

                  {/* Card Content Area */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Meta: Organization & Date */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-neutral-200 font-semibold text-[11px] truncate max-w-[65%]">
                          {item.organization}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono tracking-wider">
                          {item.date}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 
                        className="text-base md:text-lg font-bold leading-snug tracking-tight text-white group-hover:text-[#C6FF00] transition-colors line-clamp-2 cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setActiveModalImage(item.imageUrl);
                        }}
                      >
                        {item.title}
                      </h2>

                      {/* Description */}
                      <p className="mt-2.5 text-xs md:text-sm text-neutral-400 leading-relaxed line-clamp-2 font-light">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer: Tags & (Admin Only) Delete */}
                    <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5 overflow-hidden">
                        {item.tags && item.tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] text-neutral-400 font-mono bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteActivity(item.id, e)}
                          title="활동 기록 삭제 (관리자 전용)"
                          className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded hover:bg-white/5"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Editorial Detail Modal (Full Story & Student Quotes) ── */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#141417] border border-white/20 rounded-xl overflow-hidden flex flex-col shadow-2xl my-8 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 md:px-6 border-b border-white/10 flex items-center justify-between bg-black/40 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                  selectedItem.category === 'photo' 
                    ? 'bg-[#C6FF00]/15 text-[#C6FF00] border border-[#C6FF00]/30' 
                    : 'bg-[#28C8F0]/15 text-[#28C8F0] border border-[#28C8F0]/30'
                }`}>
                  {selectedItem.category === 'photo' ? '강의 현장 스케치' : '언론 보도 & 인터뷰'}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {selectedItem.date} · {selectedItem.organization}
                </span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-6 md:p-8 space-y-6">
              {/* Main Image */}
              <div className="relative aspect-[16/10] bg-black rounded-lg overflow-hidden border border-white/10">
                <img
                  src={activeModalImage || selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Sub Images Gallery if present */}
              {selectedItem.additionalImages && selectedItem.additionalImages.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono text-neutral-400 mb-2 uppercase tracking-wider">
                    현장 갤러리 (사진을 클릭하면 위 화면에 크게 표시됩니다)
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {[selectedItem.imageUrl, ...selectedItem.additionalImages].map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveModalImage(imgUrl)}
                        className={`w-16 h-12 md:w-20 md:h-14 rounded-md overflow-hidden border transition-all cursor-pointer ${
                          (activeModalImage || selectedItem.imageUrl) === imgUrl
                            ? 'border-[#C6FF00] scale-105 shadow-[0_0_10px_rgba(198,255,0,0.3)]'
                            : 'border-white/20 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="gallery" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Headline */}
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                  {selectedItem.title}
                </h2>
                <div className="text-xs font-mono text-[#C6FF00] mt-2">
                  진행 기관 / 매체 : {selectedItem.organization} ({selectedItem.date})
                </div>
              </div>

              {/* Student / Press Quote Box */}
              {selectedItem.quote && (
                <div className="p-5 rounded-lg bg-white/[0.04] border-l-4 border-[#C6FF00] border border-white/[0.08] shadow-lg">
                  <div className="flex items-center gap-2 mb-2 text-[#C6FF00] text-xs font-mono font-bold uppercase tracking-wider">
                    <Quote size={15} />
                    <span>생생한 수강생 후기 & 인터뷰 · {selectedItem.quote.speaker} {selectedItem.quote.role ? `(${selectedItem.quote.role})` : ''}</span>
                  </div>
                  <p className="text-sm md:text-base text-neutral-200 font-light leading-relaxed italic">
                    {selectedItem.quote.text}
                  </p>
                </div>
              )}

              {/* Full Reportage Story */}
              <div className="space-y-3.5 text-sm md:text-base text-neutral-300 leading-relaxed font-light border-t border-white/10 pt-6">
                {(selectedItem.fullContent || selectedItem.description).split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="leading-relaxed whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Tags & Action Link */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags && selectedItem.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs font-mono text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/20 px-2.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>

                {selectedItem.link && (
                  <a
                    href={selectedItem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#28C8F0] text-black font-extrabold text-xs rounded-md hover:bg-white transition-all shadow-[0_0_15px_rgba(40,200,240,0.3)] self-start sm:self-auto"
                  >
                    <span>공식 기사 원문 보러가기</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CMS Add Modal (ADMIN ONLY) ── */}
      {isAddModalOpen && isAdmin && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="relative max-w-xl w-full bg-[#161619] border border-[#C6FF00]/30 rounded-xl p-6 md:p-8 my-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="text-[11px] font-mono text-[#C6FF00] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <ShieldCheck size={13} />
                <span>INSTRUCTOR CMS · VERIFIED ADMIN ({currentUser?.email})</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-tight ff-disp">
                새 현장 활동 / 언론 보도 등록
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                등록하신 내용은 클라우드(Firestore)에 안전하게 저장되어 모든 방문자에게 실시간 반영됩니다.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitActivity} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1.5 font-bold uppercase tracking-wider">
                  분류 선택 *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'photo' })}
                    className={`py-2.5 px-3 rounded-md border font-bold flex items-center justify-center gap-2 transition-colors ${
                      formData.category === 'photo'
                        ? 'border-[#C6FF00] bg-[#C6FF00]/10 text-[#C6FF00]'
                        : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/30'
                    }`}
                  >
                    <ImageIcon size={14} /> 강의 현장 사진
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'press' })}
                    className={`py-2.5 px-3 rounded-md border font-bold flex items-center justify-center gap-2 transition-colors ${
                      formData.category === 'press'
                        ? 'border-[#28C8F0] bg-[#28C8F0]/10 text-[#28C8F0]'
                        : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/30'
                    }`}
                  >
                    <Newspaper size={14} /> 언론 기사 / 인터뷰
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">제목 / 강의명 / 헤드라인 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 공공기관 AI 프롬프트 엔지니어링 집중 특강"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 font-bold">진행 기관 / 매체명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 서울산업진흥원, 한국경제"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-bold">일시 (연도.월) *</label>
                  <input
                    type="text"
                    placeholder="2026.03"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400 font-bold">
                    현장 사진 첨부 (여러 장 선택 가능) *
                  </label>
                  {uploadedPhotos.length > 0 && (
                    <span className="text-[11px] font-mono text-[#C6FF00]">
                      총 {uploadedPhotos.length}장 업로드됨
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#C6FF00] file:text-[#0A0A0A] hover:file:bg-white file:cursor-pointer cursor-pointer border border-white/15 bg-black/60 p-1.5 rounded-md"
                  />
                  <div className="text-[10px] text-neutral-500">또는 단일 이미지 웹 링크 직접 입력:</div>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                    onChange={e => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                    }}
                    className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors"
                  />
                </div>

                {/* Uploaded Photos Grid Preview */}
                {uploadedPhotos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-2 bg-black/50 rounded-lg border border-white/10">
                      {uploadedPhotos.map((photo, idx) => (
                        <div 
                          key={photo.id}
                          className="relative aspect-[16/10] bg-black rounded-md overflow-hidden border border-white/15 group"
                        >
                          <img 
                            src={photo.processed} 
                            alt={`preview-${idx}`} 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-1 left-1 flex items-center gap-1">
                            {idx === 0 ? (
                              <span className="text-[9px] bg-[#C6FF00] text-black font-extrabold px-1.5 py-0.5 rounded shadow">
                                대표 사진
                              </span>
                            ) : (
                              <span className="text-[9px] bg-black/70 text-neutral-200 font-mono px-1 py-0.5 rounded border border-white/20">
                                #{idx + 1}
                              </span>
                            )}
                            {photo.isBlurred && (
                              <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 py-0.5 rounded shadow flex items-center gap-0.5">
                                <ShieldCheck size={9} /> 블러
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white/80 hover:text-red-400 hover:bg-black transition-colors opacity-0 group-hover:opacity-100"
                            title="사진 삭제"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Privacy Studio Action Box */}
                    <div className="p-3 rounded-lg bg-[#C6FF00]/5 border border-[#C6FF00]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <ShieldCheck size={14} className="text-[#C6FF00]" />
                          <span>초상권 보호: 내 얼굴 제외 자동 블러</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          나를 제외한 참석자 얼굴만 자동 감지하여 가려줍니다. (뒷모습은 제외)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBlurredApplied && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedPhotos(prev => prev.map(p => ({
                                ...p,
                                processed: p.raw,
                                isBlurred: false
                              })));
                              if (uploadedPhotos.length > 0) {
                                setFormData(prev => ({
                                  ...prev,
                                  imageUrl: uploadedPhotos[0].raw,
                                  additionalImages: uploadedPhotos.slice(1).map(p => p.raw)
                                }));
                              }
                              setIsBlurredApplied(false);
                            }}
                            className="px-2.5 py-1.5 rounded text-[11px] text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            원본 복구
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsBlurStudioOpen(true)}
                          className="px-3 py-1.5 rounded text-xs font-extrabold bg-[#C6FF00] text-black hover:bg-white transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(198,255,0,0.3)] cursor-pointer"
                        >
                          <Sparkles size={13} />
                          <span>{isBlurredApplied ? '블러 재편집' : '얼굴 블러 스튜디오'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">
                  기사 원문 링크 (URL, 선택사항)
                </label>
                <input
                  type="url"
                  placeholder="https://n.news.naver.com/..."
                  value={formData.link}
                  onChange={e => setFormData({ ...formData, link: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">핵심 요약 / 강의 소개</label>
                <textarea
                  rows={3}
                  placeholder="강의의 핵심 주제, 수강생 반응, 또는 기사의 주요 인용구를 작성해주세요."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  placeholder="AI특강, 출강, 프롬프트엔지니어링"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 focus:border-[#C6FF00] rounded-md px-3 py-2.5 text-white outline-none transition-colors"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-white/20 text-neutral-300 font-bold rounded-md hover:border-white/50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#C6FF00] text-[#0A0A0A] font-extrabold rounded-md hover:bg-white transition-all shadow-[0_0_15px_rgba(198,255,0,0.25)] disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>{isSubmitting ? '저장 중...' : '클라우드에 등록 완료'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="mt-20 border-t border-white/10 py-12 px-6 md:px-14">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CrystalCube size={32} pfx="actftr" />
            <span className="font-extrabold uppercase tracking-widest text-sm">DO-DAHAM</span>
          </div>
          <div className="text-xs text-neutral-500 font-mono">
            DO WHATEVER YOU WANT · ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="text-xs text-neutral-500 hover:text-[#C6FF00] transition-colors flex items-center gap-1"
            >
              <Lock size={11} />
              <span>CMS LOGIN</span>
            </Link>
            <Link
              to="/"
              className="text-xs text-[#C6FF00] hover:underline font-bold uppercase tracking-wider flex items-center gap-1"
            >
              ← BACK TO MAIN
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Face Blur Studio Modal (Privacy Protection) ── */}
      <FaceBlurStudioModal
        isOpen={isBlurStudioOpen}
        onClose={() => setIsBlurStudioOpen(false)}
        imageSrcs={uploadedPhotos.length > 0 ? uploadedPhotos.map(p => p.raw) : (formData.imageUrl ? [formData.imageUrl] : [])}
        onApply={(processedDataUrls) => {
          if (processedDataUrls.length > 0) {
            setUploadedPhotos(prev => prev.map((p, idx) => ({
              ...p,
              processed: processedDataUrls[idx] || p.raw,
              isBlurred: true
            })));
            setFormData(prev => ({
              ...prev,
              imageUrl: processedDataUrls[0],
              additionalImages: processedDataUrls.slice(1)
            }));
            setIsBlurredApplied(true);
          }
        }}
      />
    </div>
  );
}
