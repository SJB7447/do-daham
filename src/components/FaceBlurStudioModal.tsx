import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, X, Sparkles, Check, RefreshCw, Sliders, Eye, EyeOff, 
  UserCheck, Plus, Trash2, HelpCircle, Layers, Move, Upload, User, 
  ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { 
  FaceBox, 
  BlurStyle, 
  detectFaces, 
  renderBlurredImage, 
  saveAdminFaceTemplate,
  getStoredAdminFaceTemplate,
  clearStoredAdminFaceTemplate,
  registerAdminFaceFromImage,
  classifyFacesWithTemplate,
  AdminFaceTemplate
} from '../utils/faceBlurEngine';

interface FaceBlurStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Support both single imageSrc and multiple imageSrcs
  imageSrc?: string;
  imageSrcs?: string[];
  onApply: (processedDataUrls: string[]) => void;
}

interface ImageEditState {
  rawSrc: string;
  loadedImg: HTMLImageElement | null;
  boxes: FaceBox[];
  isAnalyzed: boolean;
  processedUrl: string;
}

export default function FaceBlurStudioModal({
  isOpen,
  onClose,
  imageSrc,
  imageSrcs,
  onApply
}: FaceBlurStudioModalProps) {
  // Normalize incoming images to an array
  const rawList = imageSrcs && imageSrcs.length > 0 ? imageSrcs : (imageSrc ? [imageSrc] : []);

  const [activeIdx, setActiveIdx] = useState(0);
  const [imagesState, setImagesState] = useState<ImageEditState[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Global settings
  const [blurStyle, setBlurStyle] = useState<BlurStyle>('soft');
  const [blurIntensity, setBlurIntensity] = useState<number>(18);
  const [filterBackView, setFilterBackView] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<'select' | 'draw'>('select');
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);

  // Admin face template state
  const [adminTemplate, setAdminTemplate] = useState<AdminFaceTemplate | null>(null);
  const [rememberMeNotice, setRememberMeNotice] = useState<string | null>(null);

  // Manual draw box state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const myFaceUploadInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial setup when modal opens or images change
  useEffect(() => {
    if (!isOpen || rawList.length === 0) return;

    // Load admin face template from storage
    const stored = getStoredAdminFaceTemplate();
    setAdminTemplate(stored);

    setActiveIdx(0);
    setActiveBoxId(null);
    setRememberMeNotice(null);

    // Initialize state objects for each raw image
    const initialStates: ImageEditState[] = rawList.map(src => ({
      rawSrc: src,
      loadedImg: null,
      boxes: [],
      isAnalyzed: false,
      processedUrl: src
    }));
    setImagesState(initialStates);

    // Auto-analyze the first image
    loadImageAndAnalyze(0, initialStates, stored, filterBackView);
  }, [isOpen, JSON.stringify(rawList)]);

  // Helper to load and analyze a single image by index
  const loadImageAndAnalyze = async (
    idx: number, 
    currentStates: ImageEditState[],
    template: AdminFaceTemplate | null,
    backViewFilter: boolean
  ) => {
    const item = currentStates[idx];
    if (!item) return;

    setIsAnalyzing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const detected = await detectFaces(img, { filterBackView: backViewFilter });
        const rendered = renderBlurredImage(img, detected, blurStyle, blurIntensity);

        setImagesState(prev => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              loadedImg: img,
              boxes: detected,
              isAnalyzed: true,
              processedUrl: rendered
            };
          }
          return next;
        });

        if (detected.length > 0) {
          const meBox = detected.find(b => b.isMe);
          setActiveBoxId(meBox ? meBox.id : detected[0].id);
        }
      } catch (err) {
        console.error('Face detection failed for image', idx, err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    img.src = item.rawSrc;
  };

  // Switch active image
  const handleSelectImage = (idx: number) => {
    if (idx === activeIdx || idx < 0 || idx >= imagesState.length) return;
    setActiveIdx(idx);
    setActiveBoxId(null);

    const target = imagesState[idx];
    if (target && !target.isAnalyzed) {
      loadImageAndAnalyze(idx, imagesState, adminTemplate, filterBackView);
    }
  };

  // Re-render current image preview whenever active boxes, blurStyle, or blurIntensity changes
  useEffect(() => {
    const current = imagesState[activeIdx];
    if (!current || !current.loadedImg || !previewCanvasRef.current) return;

    const rendered = renderBlurredImage(current.loadedImg, current.boxes, blurStyle, blurIntensity);
    const renderImg = new Image();
    renderImg.onload = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      canvas.width = current.loadedImg!.naturalWidth;
      canvas.height = current.loadedImg!.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(renderImg, 0, 0);
      }
    };
    renderImg.src = rendered;

    // Update stored processedUrl for this index
    setImagesState(prev => {
      if (!prev[activeIdx] || prev[activeIdx].processedUrl === rendered) return prev;
      const next = [...prev];
      next[activeIdx] = { ...next[activeIdx], processedUrl: rendered };
      return next;
    });
  }, [activeIdx, imagesState[activeIdx]?.boxes, blurStyle, blurIntensity]);

  if (!isOpen || rawList.length === 0) return null;

  const currentItem = imagesState[activeIdx];
  const currentBoxes = currentItem ? currentItem.boxes : [];
  const currentLoadedImg = currentItem ? currentItem.loadedImg : null;

  // Toggle single box blur
  const handleToggleBlur = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        const nextBoxes = next[activeIdx].boxes.map(b => 
          b.id === id ? { ...b, isBlurred: !b.isBlurred } : b
        );
        next[activeIdx] = { ...next[activeIdx], boxes: nextBoxes };
      }
      return next;
    });
  };

  // Set single box as "Me (Admin)" and save to admin template
  const handleSetAsMe = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentLoadedImg) return;

    const targetBox = currentBoxes.find(b => b.id === id);
    if (!targetBox) return;

    // Save as admin template asset
    const newTemplate = saveAdminFaceTemplate(currentLoadedImg, targetBox);
    if (newTemplate) {
      setAdminTemplate(newTemplate);
      setRememberMeNotice('내 얼굴 에셋으로 등록되었습니다! 다음 사진들에도 자동으로 보존됩니다.');
      setTimeout(() => setRememberMeNotice(null), 4000);
    }

    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        const nextBoxes = next[activeIdx].boxes.map(b => {
          if (b.id === id) {
            return { ...b, isMe: true, isBlurred: false };
          }
          return { ...b, isMe: false, isBlurred: true };
        });
        next[activeIdx] = { ...next[activeIdx], boxes: nextBoxes };
      }
      return next;
    });
    setActiveBoxId(id);
  };

  // Register admin face template from direct image/selfie file upload
  const handleUploadAdminFaceAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setIsAnalyzing(true);
      const template = await registerAdminFaceFromImage(result);
      setIsAnalyzing(false);

      if (template) {
        setAdminTemplate(template);
        setRememberMeNotice('내 얼굴 기준 에셋이 성공적으로 등록되었습니다!');
        setTimeout(() => setRememberMeNotice(null), 4000);

        // Re-classify current image with newly registered face
        if (currentLoadedImg && currentBoxes.length > 0) {
          reClassifyCurrentBoxes(currentLoadedImg, currentBoxes);
        }
      } else {
        alert('얼굴을 인식하지 못했습니다. 얼굴이 선명한 정면 사진을 올려주세요.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleDeleteAdminFaceAsset = () => {
    if (window.confirm('등록된 내 얼굴 기준 에셋을 삭제하시겠습니까?')) {
      clearStoredAdminFaceTemplate();
      setAdminTemplate(null);
      setRememberMeNotice('내 얼굴 기준 에셋이 삭제되었습니다.');
      setTimeout(() => setRememberMeNotice(null), 3000);
    }
  };

  const reClassifyCurrentBoxes = (img: HTMLImageElement, boxes: FaceBox[]) => {
    const updated = classifyFacesWithTemplate(img, boxes);
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = { ...next[activeIdx], boxes: updated };
      }
      return next;
    });
  };

  // Batch process all images using the saved face template
  const handleBatchProcessAll = async () => {
    if (imagesState.length <= 1) {
      handleBlurAllExceptMe();
      return;
    }

    setIsBatchProcessing(true);
    const updatedStates = [...imagesState];

    for (let i = 0; i < updatedStates.length; i++) {
      setBatchProgress({ current: i + 1, total: updatedStates.length });
      const item = updatedStates[i];

      let img = item.loadedImg;
      if (!img) {
        img = await new Promise<HTMLImageElement>((resolve) => {
          const newImg = new Image();
          newImg.crossOrigin = 'anonymous';
          newImg.onload = () => resolve(newImg);
          newImg.src = item.rawSrc;
        });
      }

      const detected = await detectFaces(img, { filterBackView });
      const rendered = renderBlurredImage(img, detected, blurStyle, blurIntensity);

      updatedStates[i] = {
        ...item,
        loadedImg: img,
        boxes: detected,
        isAnalyzed: true,
        processedUrl: rendered
      };
    }

    setImagesState(updatedStates);
    setIsBatchProcessing(false);
    setBatchProgress(null);
    setRememberMeNotice(`총 ${updatedStates.length}장의 사진에 대해 내 얼굴 보존 및 타인 블러 처리가 완료되었습니다!`);
    setTimeout(() => setRememberMeNotice(null), 4000);
  };

  // Quick batch: Blur all except me in current image
  const handleBlurAllExceptMe = () => {
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = {
          ...next[activeIdx],
          boxes: next[activeIdx].boxes.map(b => ({ ...b, isBlurred: !b.isMe }))
        };
      }
      return next;
    });
  };

  // Quick batch: Blur all
  const handleBlurAll = () => {
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = {
          ...next[activeIdx],
          boxes: next[activeIdx].boxes.map(b => ({ ...b, isBlurred: true }))
        };
      }
      return next;
    });
  };

  // Quick batch: Clear all blur
  const handleClearAllBlur = () => {
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = {
          ...next[activeIdx],
          boxes: next[activeIdx].boxes.map(b => ({ ...b, isBlurred: false }))
        };
      }
      return next;
    });
  };

  // Delete box
  const handleDeleteBox = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = {
          ...next[activeIdx],
          boxes: next[activeIdx].boxes.filter(b => b.id !== id)
        };
      }
      return next;
    });
    if (activeBoxId === id) setActiveBoxId(null);
  };

  // Mouse events for drawing manual blur boxes
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactionMode !== 'draw' || !currentLoadedImg || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = currentLoadedImg.naturalWidth / rect.width;
    const scaleY = currentLoadedImg.naturalHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentDraw({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !currentLoadedImg || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = currentLoadedImg.naturalWidth / rect.width;
    const scaleY = currentLoadedImg.naturalHeight / rect.height;

    const curX = Math.max(0, Math.min(currentLoadedImg.naturalWidth, (e.clientX - rect.left) * scaleX));
    const curY = Math.max(0, Math.min(currentLoadedImg.naturalHeight, (e.clientY - rect.top) * scaleY));

    const x = Math.min(drawStart.x, curX);
    const y = Math.min(drawStart.y, curY);
    const w = Math.abs(curX - drawStart.x);
    const h = Math.abs(curY - drawStart.y);

    setCurrentDraw({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentDraw || !currentLoadedImg) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }

    if (currentDraw.w > 15 && currentDraw.h > 15) {
      const newBox: FaceBox = {
        id: `manual-box-${Date.now()}`,
        x: Math.round(currentDraw.x),
        y: Math.round(currentDraw.y),
        width: Math.round(currentDraw.w),
        height: Math.round(currentDraw.h),
        isBlurred: true,
        isMe: false,
        manual: true
      };

      setImagesState(prev => {
        const next = [...prev];
        if (next[activeIdx]) {
          next[activeIdx] = {
            ...next[activeIdx],
            boxes: [...next[activeIdx].boxes, newBox]
          };
        }
        return next;
      });
      setActiveBoxId(newBox.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw(null);
  };

  // Re-detect faces with new back-view filter setting
  const handleToggleBackViewFilter = async () => {
    const nextFilter = !filterBackView;
    setFilterBackView(nextFilter);
    if (currentLoadedImg) {
      setIsAnalyzing(true);
      try {
        const detected = await detectFaces(currentLoadedImg, { filterBackView: nextFilter });
        setImagesState(prev => {
          const next = [...prev];
          if (next[activeIdx]) {
            next[activeIdx] = {
              ...next[activeIdx],
              boxes: detected
            };
          }
          return next;
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  // Final apply for all images
  const handleApplyFinal = () => {
    // Generate final data URLs for all images
    const finalResults = imagesState.map(item => {
      if (item.loadedImg) {
        return renderBlurredImage(item.loadedImg, item.boxes, blurStyle, blurIntensity);
      }
      return item.processedUrl || item.rawSrc;
    });

    onApply(finalResults);
    onClose();
  };

  const blurredCount = currentBoxes.filter(b => b.isBlurred).length;
  const meBox = currentBoxes.find(b => b.isMe);

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden animate-fadeIn">
      {/* ── Top Header Bar ── */}
      <div className="h-16 px-6 border-b border-white/10 bg-[#0E0E11]/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#C6FF00]/10 border border-[#C6FF00]/30 flex items-center justify-center text-[#C6FF00]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-white">
                초상권 보호 스튜디오
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C6FF00]/20 text-[#C6FF00] font-mono font-bold border border-[#C6FF00]/40">
                100% 브라우저 온디바이스
              </span>
              {imagesState.length > 1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold border border-blue-500/40">
                  총 {imagesState.length}장 다중 사진 모드
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              내 얼굴은 보존하고 타인 얼굴만 자동으로 블러 처리합니다. (뒷모습 오인식 자동 필터링)
            </p>
          </div>
        </div>

        {/* Top Right: My Face Asset Widget & Close */}
        <div className="flex items-center gap-4">
          {/* Admin Face Asset Widget */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/15">
            <div className="flex items-center gap-2">
              {adminTemplate?.thumbnail ? (
                <img 
                  src={adminTemplate.thumbnail} 
                  alt="내 얼굴 에셋" 
                  className="w-7 h-7 rounded-full object-cover border border-[#C6FF00]" 
                  title="등록된 내 얼굴 기준 템플릿"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-neutral-400">
                  <User size={15} />
                </div>
              )}
              <div className="text-left">
                <div className="text-[10px] font-bold text-neutral-300 flex items-center gap-1">
                  <span>내 얼굴 기준 에셋</span>
                  {adminTemplate ? (
                    <span className="text-[#C6FF00] text-[9px] font-mono">● 등록됨</span>
                  ) : (
                    <span className="text-neutral-500 text-[9px] font-mono">○ 미등록</span>
                  )}
                </div>
                <div className="text-[9px] text-neutral-400">
                  {adminTemplate ? '자동 매칭 보존 중' : '셀카 등록 또는 사진에서 지정'}
                </div>
              </div>
            </div>

            {/* Hidden Input for Face Asset Upload */}
            <input
              type="file"
              ref={myFaceUploadInputRef}
              accept="image/*"
              onChange={handleUploadAdminFaceAsset}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => myFaceUploadInputRef.current?.click()}
              className="px-2 py-1 text-[10px] font-bold bg-[#C6FF00]/15 hover:bg-[#C6FF00] text-[#C6FF00] hover:text-black border border-[#C6FF00]/30 rounded transition-all flex items-center gap-1"
              title="내 얼굴 기준 사진(셀카/프로필) 파일 등록"
            >
              <Upload size={10} />
              <span>{adminTemplate ? '변경' : '기준 사진 등록'}</span>
            </button>

            {adminTemplate && (
              <button
                type="button"
                onClick={handleDeleteAdminFaceAsset}
                className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                title="등록된 내 얼굴 템플릿 삭제"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Control Toolbar ── */}
      <div className="px-6 py-2.5 border-b border-white/10 bg-[#141418] flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Blur Style, Strength & Back-view Filter */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {/* Style Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">효과:</span>
            <div className="inline-flex p-0.5 rounded-md bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setBlurStyle('soft')}
                className={`px-2.5 py-1 rounded transition-all font-medium ${
                  blurStyle === 'soft'
                    ? 'bg-[#C6FF00] text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                소프트 블러
              </button>
              <button
                type="button"
                onClick={() => setBlurStyle('mosaic')}
                className={`px-2.5 py-1 rounded transition-all font-medium ${
                  blurStyle === 'mosaic'
                    ? 'bg-[#C6FF00] text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                모자이크
              </button>
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">강도:</span>
            <input
              type="range"
              min="8"
              max="35"
              step="1"
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(Number(e.target.value))}
              className="w-20 accent-[#C6FF00] cursor-pointer"
            />
            <span className="text-xs font-mono text-[#C6FF00] w-5">{blurIntensity}</span>
          </div>

          {/* Back-view filter toggle */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <button
              type="button"
              onClick={handleToggleBackViewFilter}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all font-medium ${
                filterBackView
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-neutral-400 border border-white/10'
              }`}
              title="뒷모습, 목덜미, 뒤통수 영역을 얼굴 감지에서 제외합니다."
            >
              <ShieldCheck size={13} />
              <span>뒷모습 오인식 방지: {filterBackView ? '켜짐' : '꺼짐'}</span>
            </button>
          </div>

          {/* Tool Mode: Select vs Draw */}
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
            <button
              type="button"
              onClick={() => setInteractionMode('select')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                interactionMode === 'select'
                  ? 'bg-white/15 text-white font-bold border border-white/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck size={13} />
              <span>얼굴 선택/토글</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('draw')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                interactionMode === 'draw'
                  ? 'bg-[#C6FF00]/20 text-[#C6FF00] font-bold border border-[#C6FF00]/50'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={13} />
              <span>수동 영역 추가</span>
            </button>
          </div>
        </div>

        {/* Right: Batch Actions */}
        <div className="flex items-center gap-2 text-xs">
          {imagesState.length > 1 && (
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={handleBatchProcessAll}
              className="px-3 py-1.5 rounded bg-[#C6FF00]/20 text-[#C6FF00] hover:bg-[#C6FF00] hover:text-black font-extrabold border border-[#C6FF00]/40 transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(198,255,0,0.2)] disabled:opacity-50"
              title="등록된 내 얼굴 에셋을 바탕으로 모든 사진에 일괄 적용합니다"
            >
              <Sparkles size={13} />
              <span>전체 사진 일괄 블러</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleBlurAllExceptMe}
            className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
          >
            나 제외 블러
          </button>
          <button
            type="button"
            onClick={handleClearAllBlur}
            className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* ── Notice Banner if present ── */}
      {rememberMeNotice && (
        <div className="bg-[#C6FF00]/15 border-b border-[#C6FF00]/30 px-6 py-1.5 text-xs text-[#C6FF00] font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            <span>{rememberMeNotice}</span>
          </div>
          <button onClick={() => setRememberMeNotice(null)} className="text-white/60 hover:text-white">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Main Canvas Workspace ── */}
      <div className="flex-1 relative overflow-auto bg-[#070709] flex items-center justify-center p-4">
        {/* Loading / Scanning Indicator */}
        {(isAnalyzing || isBatchProcessing) && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 animate-fadeIn">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#C6FF00]/20 animate-ping" />
              <div className="w-full h-full rounded-full border-2 border-t-[#C6FF00] border-r-[#C6FF00]/40 border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#C6FF00]">
                <Sparkles size={20} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white tracking-wide">
                {isBatchProcessing && batchProgress
                  ? `전체 사진 일괄 분석 중... (${batchProgress.current} / ${batchProgress.total})`
                  : 'AI가 사진 속 인물 얼굴을 분석 중입니다...'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                뒷모습/목덜미는 제외하고 정면 얼굴과 내 얼굴을 브라우저 내에서 정밀 분석합니다.
              </p>
            </div>
          </div>
        )}

        {/* Canvas & Overlay Container */}
        {currentLoadedImg && (
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`relative max-w-full max-h-[calc(100vh-270px)] select-none shadow-2xl rounded-lg overflow-hidden border border-white/10 ${
              interactionMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
            }`}
            style={{
              aspectRatio: `${currentLoadedImg.naturalWidth} / ${currentLoadedImg.naturalHeight}`
            }}
          >
            {/* Realtime Processed Canvas */}
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain block"
            />

            {/* Bounding Box Overlays */}
            {!isAnalyzing && currentBoxes.map((box) => {
              const leftPct = (box.x / currentLoadedImg.naturalWidth) * 100;
              const topPct = (box.y / currentLoadedImg.naturalHeight) * 100;
              const widthPct = (box.width / currentLoadedImg.naturalWidth) * 100;
              const heightPct = (box.height / currentLoadedImg.naturalHeight) * 100;

              const isMe = box.isMe;
              const isBlurred = box.isBlurred;
              const isActive = activeBoxId === box.id;

              return (
                <div
                  key={box.id}
                  onClick={(e) => {
                    setActiveBoxId(box.id);
                    if (interactionMode === 'select') {
                      handleToggleBlur(box.id, e);
                    }
                  }}
                  className={`absolute transition-all group ${
                    isMe
                      ? 'border-2 border-[#C6FF00] bg-[#C6FF00]/15'
                      : isBlurred
                      ? 'border-2 border-[#FF5252] bg-[#FF5252]/15'
                      : 'border-2 border-white/50 border-dashed bg-black/20 hover:border-white'
                  } ${isActive ? 'ring-2 ring-white/80' : ''}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderRadius: '8px'
                  }}
                >
                  {/* Badge */}
                  <div className="absolute -top-7 left-0 flex items-center gap-1 z-20 pointer-events-auto">
                    {isMe ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C6FF00] text-black shadow-md flex items-center gap-1">
                        👑 나 (보존됨)
                      </span>
                    ) : isBlurred ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF5252] text-white shadow-md flex items-center gap-1">
                        🛡️ 타인 (블러됨)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-white/20">
                        미적용
                      </span>
                    )}

                    {/* Quick set as ME */}
                    {!isMe && (
                      <button
                        type="button"
                        onClick={(e) => handleSetAsMe(box.id, e)}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 hover:bg-[#C6FF00] hover:text-black text-white border border-white/20 transition-colors shadow-sm"
                        title="이 얼굴을 내 얼굴로 지정하고 영구 에셋으로 저장합니다"
                      >
                        이 사람이 나예요
                      </button>
                    )}

                    {/* Delete if manual box */}
                    {box.manual && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBox(box.id, e)}
                        className="p-0.5 rounded bg-black/80 hover:bg-red-600 text-white transition-colors"
                        title="영역 삭제"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Currently Drawing Box Preview */}
            {isDrawing && currentDraw && currentLoadedImg && (
              <div
                className="absolute border-2 border-[#C6FF00] border-dashed bg-[#C6FF00]/10 pointer-events-none rounded"
                style={{
                  left: `${(currentDraw.x / currentLoadedImg.naturalWidth) * 100}%`,
                  top: `${(currentDraw.y / currentLoadedImg.naturalHeight) * 100}%`,
                  width: `${(currentDraw.w / currentLoadedImg.naturalWidth) * 100}%`,
                  height: `${(currentDraw.h / currentLoadedImg.naturalHeight) * 100}%`
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Filmstrip Thumbnail Gallery (For Multiple Images) ── */}
      {imagesState.length > 1 && (
        <div className="px-6 py-2 border-t border-white/10 bg-[#0C0C0F] flex items-center gap-3 overflow-x-auto shrink-0">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider shrink-0">
            사진 목록 ({activeIdx + 1}/{imagesState.length})
          </span>
          <div className="flex items-center gap-2">
            {imagesState.map((st, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectImage(idx)}
                className={`relative w-14 h-11 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer ${
                  activeIdx === idx
                    ? 'border-[#C6FF00] ring-2 ring-[#C6FF00]/40 scale-105 shadow-md'
                    : 'border-white/15 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={st.processedUrl || st.rawSrc} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-black/70 px-1 rounded">
                  #{idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Summary & Action Bar ── */}
      <div className="h-16 px-6 border-t border-white/10 bg-[#0E0E11] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C6FF00] animate-pulse" />
            <span>
              현재 사진: 감지된 얼굴 <strong className="text-white font-mono">{currentBoxes.length}</strong>명 중{' '}
              <strong className="text-[#FF5252] font-mono">{blurredCount}</strong>명 블러
            </span>
          </div>

          {meBox ? (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-[#C6FF00]/10 border border-[#C6FF00]/30 text-[11px] text-[#C6FF00] font-bold">
              👑 본인 식별 완료 (보존)
            </span>
          ) : !adminTemplate ? (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400">
              💡 내 얼굴 기준 사진을 등록하거나 사진 속 '이 사람이 나예요'를 눌러주세요
            </span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            취소 및 원본 유지
          </button>

          <button
            type="button"
            onClick={handleApplyFinal}
            className="px-5 py-2 rounded-lg text-xs font-extrabold text-black bg-[#C6FF00] hover:bg-white hover:shadow-[0_0_20px_rgba(198,255,0,0.4)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check size={15} />
            <span>
              {imagesState.length > 1
                ? `전체 ${imagesState.length}장 블러 적용 완료`
                : `블러 적용 완료 (${blurredCount}명 보호)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
