import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ExternalLink, ImagePlus, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { isAuthorizedAdmin } from '../data/defaultActivities';
import { LetterLimitInput, LetterLimitTextarea } from './LetterLimitTextarea';

export interface StudentWorkItem {
  id: string;
  authorUid: string;
  authorName: string;
  title: string;
  category: 'AI 영상' | '홈페이지 · 웹' | '업무 자동화';
  studentLabel: string;
  description: string;
  mediaUrl: string;
  linkUrl?: string;
  isExample?: boolean;
}

const SAMPLE_STUDENT_WORKS: StudentWorkItem[] = [
  {
    id: 'sample-work-1',
    authorUid: 'sample',
    authorName: 'DO-DAHAM',
    title: '브랜드 AI 숏폼 홍보 영상 (예시)',
    category: 'AI 영상',
    studentLabel: '수료생 결과물 예시 · 소상공인',
    description: '6회 과정 중 3–4회차 실습을 통해 기획·이미지 생성·영상화·사운드까지 직접 완성한 20초 홍보 릴스 구성 예시입니다.',
    mediaUrl: '',
    isExample: true
  },
  {
    id: 'sample-work-2',
    authorUid: 'sample',
    authorName: 'DO-DAHAM',
    title: '사업자 원페이지 랜딩 홈페이지 (예시)',
    category: '홈페이지 · 웹',
    studentLabel: '수료생 결과물 예시 · 1인 대표',
    description: 'AI 프롬프트 설계로 서비스 소개 카피와 구조를 잡고 실제 문의 폼까지 연결한 랜딩페이지 예시입니다.',
    mediaUrl: '',
    isExample: true
  },
  {
    id: 'sample-work-3',
    authorUid: 'sample',
    authorName: 'DO-DAHAM',
    title: '업종별 마케팅 콘텐츠 루틴표 (예시)',
    category: '업무 자동화',
    studentLabel: '수료생 결과물 예시 · 마케터',
    description: '매주 반복되는 SNS 카드뉴스·블로그 초안·응대 문구를 자동화한 실무 프롬프트 세트 예시입니다.',
    mediaUrl: '',
    isExample: true
  }
];

export default function StudentShowcaseSection() {
  const [user, setUser] = useState<User | null>(null);
  const [canUploadWork, setCanUploadWork] = useState(false);
  const [instructorDisplayName, setInstructorDisplayName] = useState('');
  const [works, setWorks] = useState<StudentWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Upload form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'AI 영상' | '홈페이지 · 웹' | '업무 자동화'>('AI 영상');
  const [studentLabel, setStudentLabel] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setCanUploadWork(false);
        setInstructorDisplayName('');
        return;
      }

      const adminFlag = isAuthorizedAdmin(currentUser.email);
      try {
        const snap = await getDoc(doc(db, 'instructors', currentUser.uid));
        setCanUploadWork(adminFlag || snap.exists());
        setInstructorDisplayName(
          String(
            snap.data()?.displayName ||
              currentUser.displayName ||
              (adminFlag ? '심정보' : '강사')
          )
        );
      } catch {
        setCanUploadWork(adminFlag);
        setInstructorDisplayName(
          String(currentUser.displayName || (adminFlag ? '심정보' : '강사'))
        );
      }
    });
    return () => unsub();
  }, []);

  const loadWorks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'student_works'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: StudentWorkItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorUid: String(data.authorUid || ''),
          authorName: String(data.authorName || '강사'),
          title: String(data.title || ''),
          category: data.category || 'AI 영상',
          studentLabel: String(data.studentLabel || '수료생'),
          description: String(data.description || ''),
          mediaUrl: String(data.mediaUrl || ''),
          linkUrl: data.linkUrl ? String(data.linkUrl) : ''
        };
      });
      setWorks(list);
    } catch {
      setWorks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorks();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('이미지는 5MB 이하만 업로드할 수 있습니다.');
      return;
    }
    setErrorMsg('');
    setUploadingImage(true);
    try {
      const fileRef = ref(storage, `student_works/${user.uid}_${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setMediaUrl(url);
    } catch (err: any) {
      setErrorMsg('이미지 업로드 중 오류가 발생했습니다: ' + (err?.message || '권한 확인 필요'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canUploadWork) return;
    if (!title.trim() || !description.trim()) {
      setErrorMsg('결과물 제목과 설명을 입력해 주세요.');
      return;
    }

    const resolvedAuthorName = instructorDisplayName || user.displayName || '강사';
    setErrorMsg('');
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'student_works'), {
        authorUid: user.uid,
        authorName: resolvedAuthorName,
        title: title.trim(),
        category,
        studentLabel: studentLabel.trim() || '수료생 완성작',
        description: description.trim(),
        mediaUrl: mediaUrl.trim(),
        linkUrl: linkUrl.trim(),
        createdAt: serverTimestamp()
      });

      const created: StudentWorkItem = {
        id: docRef.id,
        authorUid: user.uid,
        authorName: resolvedAuthorName,
        title: title.trim(),
        category,
        studentLabel: studentLabel.trim() || '수료생 완성작',
        description: description.trim(),
        mediaUrl: mediaUrl.trim(),
        linkUrl: linkUrl.trim()
      };
      setWorks((prev) => [created, ...prev]);
      setTitle('');
      setStudentLabel('');
      setDescription('');
      setMediaUrl('');
      setLinkUrl('');
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg('등록 중 오류가 발생했습니다: ' + (err?.message || 'Firestore 규칙을 확인하세요.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWork = async (item: StudentWorkItem) => {
    if (!user || item.isExample) return;
    if (!window.confirm(`"${item.title}" 게시물을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'student_works', item.id));
      setWorks((prev) => prev.filter((w) => w.id !== item.id));
    } catch (err: any) {
      alert('삭제 권한이 없거나 오류가 발생했습니다: ' + (err?.message || ''));
    }
  };

  return (
    <section className="section" id="showcase">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="sec-head mb-3">
            <span className="sec-num">04</span>
            <h2 className="sec-title">수료생 완성 결과물</h2>
          </div>
          <p className="text-[15px] font-medium text-[#A3A79F] break-keep">
            수업이 끝나면 수강생의 손에 실제 결과물이 남습니다. 강사진이 직접 수료생 완성작을 수시로 업데이트합니다.
          </p>
        </div>

        {/* Upload Button: Visible ONLY to registered instructors / admin */}
        {user && canUploadWork && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="hero-cta shrink-0"
          >
            <Plus size={15} /> 수료생 결과물 올리기
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-sm text-[#8C8C8C]">결과물을 불러오는 중...</div>
      ) : works.length === 0 ? (
        <div className="border border-dashed border-white/[0.14] bg-[#0E0F0B] rounded-[2px] p-10 text-center">
          <Sparkles size={22} className="text-[#C6FF00] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#F2F2F2] mb-1.5">
            등록된 수료생 완성 결과물을 준비 중입니다.
          </p>
          <p className="text-xs text-[#8C8C8C] mb-5">
            실제 수업 수료 후 수강생이 제작한 AI 영상·웹사이트·업무 자동화 결과물이 순차적으로 등록됩니다.
          </p>
          {user && canUploadWork && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hero-cta"
            >
              <Plus size={15} /> 첫 수료생 결과물 올리기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {works.map((item) => (
            <article
              key={item.id}
              className="bg-gradient-to-br from-[#13130C] to-[#0B0B0B] border border-white/[0.1] rounded-[2px] overflow-hidden flex flex-col"
            >
              {item.mediaUrl ? (
                <div className="aspect-video bg-black border-b border-white/[0.08] overflow-hidden">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-[#0F100C] border-b border-white/[0.08] flex flex-col items-center justify-center p-5 text-center">
                  <Sparkles size={20} className="text-[#C6FF00] mb-2" />
                  <span className="text-[11px] font-extrabold tracking-[0.14em] text-[#8C8C8C]">
                    {item.category}
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#C6FF00]">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-[#8C8C8C]">{item.studentLabel}</span>
                  </div>
                  <h3 className="font-bold text-xl tracking-tight leading-snug mb-2">{item.title}</h3>
                  <p className="text-[13.5px] font-medium text-[#A3A79F] leading-relaxed break-keep">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#8C8C8C]">
                    등록: {item.authorName}
                  </span>

                  <div className="flex items-center gap-2">
                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#C6FF00] hover:underline min-h-[36px]"
                      >
                        결과물 보기 <ExternalLink size={12} />
                      </a>
                    )}
                    {user && !item.isExample && (user.uid === item.authorUid || isAuthorizedAdmin(user.email)) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWork(item)}
                        aria-label="결과물 삭제"
                        className="p-2 text-[#8C8C8C] hover:text-[#E02898] cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Upload Modal (Registered instructors / admin only) */}
      {modalOpen && user && canUploadWork && (
        <div
          className="fixed inset-0 z-[320] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="showcase-modal-title"
            className="w-full max-w-lg bg-[#0D0E0A] border border-white/[0.16] rounded-[2px] p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
              <div>
                <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#C6FF00]">
                  INSTRUCTOR UPLOAD
                </div>
                <h3 id="showcase-modal-title" className="font-bold text-2xl tracking-tight mt-1">
                  수료생 완성 결과물 등록
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="닫기"
                className="w-10 h-10 flex items-center justify-center border border-white/20 rounded-[2px] text-[#F2F2F2] hover:border-[#C6FF00]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWork} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8C8C8C] mb-1">결과물 제목 *</label>
                <LetterLimitInput
                  type="text"
                  required
                  limit={80}
                  nearThreshold={15}
                  value={title}
                  onChange={setTitle}
                  placeholder="예: 1기 수료생 카페 홍보 AI 숏폼"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C8C8C] mb-1">분야</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'AI 영상' | '홈페이지 · 웹' | '업무 자동화')}
                    className="w-full min-h-[44px] px-3 bg-black border border-white/[0.18] rounded-[2px] text-sm text-white focus:border-[#C6FF00] outline-none"
                  >
                    <option value="AI 영상">AI 영상</option>
                    <option value="홈페이지 · 웹">홈페이지 · 웹</option>
                    <option value="업무 자동화">업무 자동화</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C8C8C] mb-1">수강생 표기</label>
                  <LetterLimitInput
                    type="text"
                    limit={50}
                    nearThreshold={10}
                    value={studentLabel}
                    onChange={setStudentLabel}
                    placeholder="예: 1기 · 소상공인 대표"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="showcase-desc-input" className="block text-xs font-bold text-[#8C8C8C] mb-1">
                  설명 * (200자 이내)
                </label>
                <LetterLimitTextarea
                  id="showcase-desc-input"
                  rows={3}
                  limit={200}
                  nearThreshold={25}
                  required
                  value={description}
                  onChange={setDescription}
                  placeholder="어떤 도구와 과정을 거쳐 완성했는지 간단히 작성해 주세요."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C8C8C] mb-1">
                  대표 썸네일 이미지 (파일 업로드 또는 URL)
                </label>
                <div className="flex gap-2 mb-2">
                  <label className="flex-1 min-h-[44px] px-3 border border-dashed border-white/25 rounded-[2px] flex items-center justify-center gap-2 text-xs font-bold cursor-pointer hover:border-[#C6FF00]">
                    <ImagePlus size={15} className="text-[#C6FF00]" />
                    <span>{uploadingImage ? '업로드 중...' : '이미지 파일 선택'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="또는 https:// 이미지 URL 입력"
                  className="w-full min-h-[44px] px-3 bg-black border border-white/[0.18] rounded-[2px] text-sm text-white focus:border-[#C6FF00] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C8C8C] mb-1">결과물 링크 (선택)</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="유튜브 / 배포 웹페이지 URL"
                  className="w-full min-h-[44px] px-3 bg-black border border-white/[0.18] rounded-[2px] text-sm text-white focus:border-[#C6FF00] outline-none"
                />
              </div>

              {errorMsg && (
                <p className="p-3 border border-[#E02898] text-[#E02898] text-xs font-bold rounded-[2px]">
                  {errorMsg}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="hero-cta flex-1 justify-center"
                >
                  {submitting ? '등록 중...' : '결과물 게시하기 →'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="hero-cta-secondary"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
