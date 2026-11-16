import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, X, Sparkles, Check, Eye, EyeOff, 
  UserCheck, Plus, Trash2, Upload, User, 
  Wand2, MousePointerClick
} from 'lucide-react';
import { 
  FaceBox, 
  BlurStyle, 
  detectFaces, 
  detectFaceAtPoint,
  createFaceThumbnail,
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
  const rawList = imageSrcs && imageSrcs.length > 0 ? imageSrcs : (imageSrc ? [imageSrc] : []);

  const [activeIdx, setActiveIdx] = useState(0);
  const [imagesState, setImagesState] = useState<ImageEditState[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Global settings
  const [blurStyle, setBlurStyle] = useState<BlurStyle>('soft');
  const [blurIntensity, setBlurIntensity] = useState<number>(18);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<'select' | 'pickMe' | 'draw'>('select');
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
  const sessionIdRef = useRef<number>(0);

  // Helper to load an HTMLImageElement
  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      img.src = src;
    });
  };

  // 1. Initial setup when modal opens: Auto-analyze ALL images in sequence
  useEffect(() => {
    if (!isOpen || rawList.length === 0) return;

    const currentSession = Date.now();
    sessionIdRef.current = currentSession;

    const stored = getStoredAdminFaceTemplate();
    setAdminTemplate(stored);

    setActiveIdx(0);
    setActiveBoxId(null);
    setRememberMeNotice(null);
    setInteractionMode('select');
    setShowOverlays(true);

    const initialStates: ImageEditState[] = rawList.map(src => ({
      rawSrc: src,
      loadedImg: null,
      boxes: [],
      isAnalyzed: false,
      processedUrl: src
    }));
    setImagesState(initialStates);

    analyzeAllImagesSequentially(initialStates, currentSession);
  }, [isOpen, JSON.stringify(rawList)]);

  // Sequentially analyze all images in the background
  const analyzeAllImagesSequentially = async (states: ImageEditState[], sessionId: number) => {
    setIsAnalyzing(true);

    for (let i = 0; i < states.length; i++) {
      if (sessionIdRef.current !== sessionId) return;
      try {
        const item = states[i];
        const img = await loadImageElement(item.rawSrc);
        if (sessionIdRef.current !== sessionId) return;

        const detected = await detectFaces(img, { filterBackView: true, strictMode: true });
        if (sessionIdRef.current !== sessionId) return;

        const rendered = renderBlurredImage(img, detected, blurStyle, blurIntensity);

        setImagesState(prev => {
          const next = [...prev];
          if (next[i]) {
            // If user already manually edited this photo while background scan was running, keep their edits
            if (next[i].isAnalyzed && next[i].boxes.some(b => b.manual)) {
              return prev;
            }
            next[i] = {
              ...next[i],
              loadedImg: img,
              boxes: detected,
              isAnalyzed: true,
              processedUrl: rendered
            };
          }
          return next;
        });

        if (i === 0) {
          setIsAnalyzing(false);
          if (detected.length > 0) {
            const meBox = detected.find(b => b.isMe);
            setActiveBoxId(meBox ? meBox.id : detected[0].id);
          }
        }
      } catch (err) {
        console.error('Auto-analysis error for image index', i, err);
        if (i === 0) setIsAnalyzing(false);
      }
    }

    setIsAnalyzing(false);
  };

  // Switch active image from filmstrip
  const handleSelectImage = async (idx: number) => {
    if (idx === activeIdx || idx < 0 || idx >= imagesState.length) return;
    setActiveIdx(idx);
    setActiveBoxId(null);

    const target = imagesState[idx];
    if (target && !target.isAnalyzed) {
      setIsAnalyzing(true);
      try {
        const img = target.loadedImg || await loadImageElement(target.rawSrc);
        const detected = await detectFaces(img, { filterBackView: true, strictMode: true });
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
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  // Re-render current image preview whenever active boxes, loadedImg, blurStyle, or blurIntensity changes
  useEffect(() => {
    const current = imagesState[activeIdx];
    if (!current || !current.loadedImg || !previewCanvasRef.current) return;

    const rendered = renderBlurredImage(current.loadedImg, current.boxes, blurStyle, blurIntensity);
    const renderImg = new Image();
    renderImg.onload = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas || !current.loadedImg) return;
      canvas.width = current.loadedImg.naturalWidth;
      canvas.height = current.loadedImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(renderImg, 0, 0);
      }
    };
    renderImg.src = rendered;

    setImagesState(prev => {
      if (!prev[activeIdx] || prev[activeIdx].processedUrl === rendered) return prev;
      const next = [...prev];
      next[activeIdx] = { ...next[activeIdx], processedUrl: rendered };
      return next;
    });
  }, [activeIdx, imagesState[activeIdx]?.loadedImg, imagesState[activeIdx]?.boxes, blurStyle, blurIntensity]);

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
        const rendered = next[activeIdx].loadedImg
          ? renderBlurredImage(next[activeIdx].loadedImg!, nextBoxes, blurStyle, blurIntensity)
          : next[activeIdx].processedUrl;
        next[activeIdx] = { ...next[activeIdx], boxes: nextBoxes, processedUrl: rendered };
      }
      return next;
    });
  };

  // Set single box as "Me (Admin)", save template, and automatically propagate & re-render all other photos
  const handleSetAsMe = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentLoadedImg) return;

    const targetBox = currentBoxes.find(b => b.id === id);
    if (!targetBox) return;

    const newTemplate = saveAdminFaceTemplate(currentLoadedImg, targetBox);
    if (newTemplate) {
      setAdminTemplate(newTemplate);
      setRememberMeNotice('👑 내 얼굴로 지정 및 학습 완료! 내 얼굴은 선명하게 보존되고 나머지 인원은 모두 블러 처리됩니다.');
      setTimeout(() => setRememberMeNotice(null), 4500);
    }

    // Update current image and propagate to all other analyzed photos with immediate re-rendering
    setImagesState(prev => {
      return prev.map((imgState, sIdx) => {
        if (sIdx === activeIdx) {
          const updatedBoxes = imgState.boxes.map(b => ({
            ...b,
            isMe: b.id === id,
            isBlurred: b.id !== id // Preserve Me (unblurred), blur all others
          }));
          const rendered = imgState.loadedImg
            ? renderBlurredImage(imgState.loadedImg, updatedBoxes, blurStyle, blurIntensity)
            : imgState.processedUrl;
          return { ...imgState, boxes: updatedBoxes, processedUrl: rendered };
        } else if (imgState.loadedImg && imgState.boxes.length > 0) {
          const updatedBoxes = classifyFacesWithTemplate(imgState.loadedImg, imgState.boxes);
          const rendered = renderBlurredImage(imgState.loadedImg, updatedBoxes, blurStyle, blurIntensity);
          return { ...imgState, boxes: updatedBoxes, processedUrl: rendered };
        }
        return imgState;
      });
    });

    setActiveBoxId(id);
  };

  // One-click "Pick Me" on canvas
  const handleCanvasClickPickMe = async (clickX: number, clickY: number) => {
    if (!currentLoadedImg) return;

    // 1. Check if click is directly inside or very close to an existing detected face box
    let bestBoxId: string | null = null;
    let minDist = Infinity;

    for (const b of currentBoxes) {
      const inside = clickX >= b.x && clickX <= b.x + b.width && clickY >= b.y && clickY <= b.y + b.height;
      if (inside) {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const dist = Math.hypot(clickX - cx, clickY - cy);
        if (dist < minDist) {
          minDist = dist;
          bestBoxId = b.id;
        }
      }
    }

    setInteractionMode('select');

    if (bestBoxId) {
      handleSetAsMe(bestBoxId);
      return;
    }

    // 2. If clicked on an undetected face, run targeted local face scan around (clickX, clickY)
    const newBox = await detectFaceAtPoint(currentLoadedImg, clickX, clickY);
    if (!newBox) return;

    const newTemplate = saveAdminFaceTemplate(currentLoadedImg, newBox);
    if (newTemplate) {
      setAdminTemplate(newTemplate);
    }

    setImagesState(prev => {
      return prev.map((imgState, sIdx) => {
        if (sIdx === activeIdx) {
          const updatedOthers = imgState.boxes.map(b => ({ ...b, isMe: false, isBlurred: true }));
          const nextBoxes = [...updatedOthers, newBox];
          const rendered = imgState.loadedImg
            ? renderBlurredImage(imgState.loadedImg, nextBoxes, blurStyle, blurIntensity)
            : imgState.processedUrl;
          return {
            ...imgState,
            boxes: nextBoxes,
            processedUrl: rendered
          };
        } else if (imgState.loadedImg && imgState.boxes.length > 0) {
          const updatedBoxes = classifyFacesWithTemplate(imgState.loadedImg, imgState.boxes);
          const rendered = renderBlurredImage(imgState.loadedImg, updatedBoxes, blurStyle, blurIntensity);
          return { ...imgState, boxes: updatedBoxes, processedUrl: rendered };
        }
        return imgState;
      });
    });

    setActiveBoxId(newBox.id);
    setRememberMeNotice('👑 클릭한 위치가 내 얼굴로 지정 및 학습되었습니다! (내 얼굴 보존 + 타인 블러 완료)');
    setTimeout(() => setRememberMeNotice(null), 4500);
  };

  // Upload admin face template from file
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
        setRememberMeNotice('👑 내 얼굴 기준 에셋이 등록되었습니다! 모든 사진에서 내 얼굴을 찾아 보존합니다.');
        setTimeout(() => setRememberMeNotice(null), 4500);

        // Re-classify and re-render all photos with new face template
        setImagesState(prev => {
          return prev.map(imgState => {
            if (imgState.loadedImg && imgState.boxes.length > 0) {
              const updated = classifyFacesWithTemplate(imgState.loadedImg, imgState.boxes, true);
              const rendered = renderBlurredImage(imgState.loadedImg, updated, blurStyle, blurIntensity);
              return { ...imgState, boxes: updated, processedUrl: rendered };
            }
            return imgState;
          });
        });
      } else {
        alert('얼굴을 인식하지 못했습니다. 얼굴이 선명한 정면 사진을 올려주세요.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteAdminFaceAsset = () => {
    if (window.confirm('등록된 내 얼굴 기준 에셋을 삭제하시겠습니까?')) {
      clearStoredAdminFaceTemplate();
      setAdminTemplate(null);
      setRememberMeNotice('내 얼굴 기준 에셋이 삭제되었습니다.');
      setTimeout(() => setRememberMeNotice(null), 3000);
    }
  };

  // Clean background noise: keeps high confidence faces
  const handleCleanBackgroundNoise = () => {
    if (!currentLoadedImg) return;
    const cleaned = currentBoxes.filter(box => box.manual || box.isMe || (box.confidence ?? 1) >= 0.72);
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        const rendered = next[activeIdx].loadedImg
          ? renderBlurredImage(next[activeIdx].loadedImg!, cleaned, blurStyle, blurIntensity)
          : next[activeIdx].processedUrl;
        next[activeIdx] = { ...next[activeIdx], boxes: cleaned, processedUrl: rendered };
      }
      return next;
    });
    setRememberMeNotice(`배경 잡음을 정리했습니다. (${cleaned.length}명 얼굴 유지)`);
    setTimeout(() => setRememberMeNotice(null), 3000);
  };

  // Clear all boxes completely on current photo
  const handleClearAllBoxes = () => {
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        const rendered = next[activeIdx].loadedImg
          ? renderBlurredImage(next[activeIdx].loadedImg!, [], blurStyle, blurIntensity)
          : next[activeIdx].rawSrc;
        next[activeIdx] = { ...next[activeIdx], boxes: [], processedUrl: rendered };
      }
      return next;
    });
    setActiveBoxId(null);
  };

  // Batch process all images: re-detect and strictly blur all attendees across ALL photos
  const handleBatchProcessAll = async () => {
    setIsBatchProcessing(true);
    const updatedStates = [...imagesState];

    for (let i = 0; i < updatedStates.length; i++) {
      setBatchProgress({ current: i + 1, total: updatedStates.length });
      const item = updatedStates[i];

      const img = item.loadedImg || await loadImageElement(item.rawSrc);
      const detected = await detectFaces(img, { filterBackView: true, strictMode: true });
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
    setRememberMeNotice(`전체 ${updatedStates.length}장의 사진에 대해 '내 얼굴 보존 + 타인 블러'가 일괄 적용되었습니다!`);
    setTimeout(() => setRememberMeNotice(null), 4000);
  };

  // Quick action: "나 제외 블러" (Blur all except Me)
  const handleBlurAllExceptMe = () => {
    if (!currentLoadedImg) return;

    const existingMe = currentBoxes.find(b => b.isMe);

    // 1. If "Me" is already identified on this photo, unblur Me and blur everyone else
    if (existingMe) {
      setImagesState(prev => {
        const next = [...prev];
        if (next[activeIdx]) {
          const updatedBoxes = next[activeIdx].boxes.map(b => ({
            ...b,
            isBlurred: !b.isMe
          }));
          const rendered = renderBlurredImage(currentLoadedImg, updatedBoxes, blurStyle, blurIntensity);
          next[activeIdx] = {
            ...next[activeIdx],
            boxes: updatedBoxes,
            processedUrl: rendered
          };
        }
        return next;
      });
      setRememberMeNotice('👑 내 얼굴만 선명하게 보존하고 나머지 참석자를 모두 블러 처리했습니다.');
      setTimeout(() => setRememberMeNotice(null), 3500);
      return;
    }

    // 2. If "Me" is not yet marked on this photo, try matching with stored AdminFaceTemplate (with forceMatchBest = true)
    if (adminTemplate && currentBoxes.length > 0) {
      const reclassified = classifyFacesWithTemplate(currentLoadedImg, currentBoxes, true);
      const matchedMe = reclassified.find(b => b.isMe);
      if (matchedMe) {
        const rendered = renderBlurredImage(currentLoadedImg, reclassified, blurStyle, blurIntensity);
        setImagesState(prev => {
          const next = [...prev];
          if (next[activeIdx]) {
            next[activeIdx] = {
              ...next[activeIdx],
              boxes: reclassified,
              processedUrl: rendered
            };
          }
          return next;
        });
        setActiveBoxId(matchedMe.id);
        setRememberMeNotice('👑 등록된 내 얼굴 에셋과 가장 일치하는 인물을 보존하고 나머지를 블러 처리했습니다!');
        setTimeout(() => setRememberMeNotice(null), 4000);
        return;
      }
    }

    // 3. If no template or no match yet, activate Pick Me mode so user can click their face in 1 second
    setInteractionMode('pickMe');
    setRememberMeNotice('💡 아직 이 사진에서 본인이 지정되지 않았습니다. 사진 속 본인 얼굴이나 아래 인물 목록의 [👑 나로 지정]을 클릭해 주세요!');
    setTimeout(() => setRememberMeNotice(null), 5000);
  };

  // Delete box
  const handleDeleteBox = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImagesState(prev => {
      const next = [...prev];
      if (next[activeIdx]) {
        const nextBoxes = next[activeIdx].boxes.filter(b => b.id !== id);
        const rendered = next[activeIdx].loadedImg
          ? renderBlurredImage(next[activeIdx].loadedImg!, nextBoxes, blurStyle, blurIntensity)
          : next[activeIdx].processedUrl;
        next[activeIdx] = {
          ...next[activeIdx],
          boxes: nextBoxes,
          processedUrl: rendered
        };
      }
      return next;
    });
    if (activeBoxId === id) setActiveBoxId(null);
  };

  // Mouse events for drawing manual blur boxes or picking me
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentLoadedImg || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = currentLoadedImg.naturalWidth / rect.width;
    const scaleY = currentLoadedImg.naturalHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (interactionMode === 'pickMe') {
      handleCanvasClickPickMe(x, y);
      return;
    }

    if (interactionMode === 'draw') {
      setIsDrawing(true);
      setDrawStart({ x, y });
      setCurrentDraw({ x, y, w: 0, h: 0 });
    }
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
      newBox.faceThumb = createFaceThumbnail(currentLoadedImg, newBox);

      setImagesState(prev => {
        const next = [...prev];
        if (next[activeIdx]) {
          const nextBoxes = [...next[activeIdx].boxes, newBox];
          const rendered = next[activeIdx].loadedImg
            ? renderBlurredImage(next[activeIdx].loadedImg!, nextBoxes, blurStyle, blurIntensity)
            : next[activeIdx].processedUrl;
          next[activeIdx] = {
            ...next[activeIdx],
            boxes: nextBoxes,
            processedUrl: rendered
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

  // Final apply for all images: strictly ensures all images are analyzed and rendered
  const handleApplyFinal = async () => {
    setIsAnalyzing(true);
    const finalResults: string[] = [];

    for (let i = 0; i < imagesState.length; i++) {
      const item = imagesState[i];
      const img = item.loadedImg || await loadImageElement(item.rawSrc);
      const boxes = item.isAnalyzed
        ? item.boxes
        : await detectFaces(img, { filterBackView: true, strictMode: true });
      const rendered = renderBlurredImage(img, boxes, blurStyle, blurIntensity);
      finalResults.push(rendered);
    }

    setIsAnalyzing(false);
    onApply(finalResults);
    onClose();
  };

  const blurredCount = currentBoxes.filter(b => b.isBlurred).length;
  const meBox = currentBoxes.find(b => b.isMe);

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden animate-fadeIn select-none">
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
              내 얼굴은 선명하게 보존하고 참석자 얼굴만 자동으로 블러 처리합니다.
            </p>
          </div>
        </div>

        {/* Top Right: My Face Asset Widget & Close */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15">
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
                  <User size={14} />
                </div>
              )}
              <div className="text-left">
                <div className="text-[10px] font-bold text-neutral-300 flex items-center gap-1">
                  <span>내 얼굴 기준 에셋</span>
                  {adminTemplate ? (
                    <span className="text-[#C6FF00] text-[9px] font-mono">
                      ● 등록됨 ({adminTemplate.samples?.length || 1}개 각도 학습)
                    </span>
                  ) : (
                    <span className="text-neutral-500 text-[9px] font-mono">○ 미등록</span>
                  )}
                </div>
                <div className="text-[9px] text-neutral-400">
                  {adminTemplate ? '모든 사진에서 내 얼굴 자동 보존 중' : '셀카 등록 또는 사진 속 내 얼굴 클릭'}
                </div>
              </div>
            </div>

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
              className="px-2 py-1 text-[10px] font-bold bg-[#C6FF00]/15 hover:bg-[#C6FF00] text-[#C6FF00] hover:text-black border border-[#C6FF00]/30 rounded transition-all flex items-center gap-1 cursor-pointer"
              title="내 얼굴 기준 사진(셀카/프로필) 파일 등록"
            >
              <Upload size={10} />
              <span>{adminTemplate ? '사진 변경' : '내 사진 등록'}</span>
            </button>

            {adminTemplate && (
              <button
                type="button"
                onClick={handleDeleteAdminFaceAsset}
                className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                title="등록된 내 얼굴 템플릿 삭제"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Control Toolbar ── */}
      <div className="px-6 py-2.5 border-b border-white/10 bg-[#141418] flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Interaction Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Primary: Pick Me On Canvas Mode */}
          <button
            type="button"
            onClick={() => setInteractionMode(interactionMode === 'pickMe' ? 'select' : 'pickMe')}
            className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all font-bold cursor-pointer ${
              interactionMode === 'pickMe'
                ? 'bg-[#C6FF00] text-black ring-2 ring-[#C6FF00]/50 shadow-[0_0_15px_rgba(198,255,0,0.4)] animate-pulse'
                : 'bg-[#C6FF00]/15 text-[#C6FF00] hover:bg-[#C6FF00] hover:text-black border border-[#C6FF00]/40'
            }`}
            title="사진 속 본인 얼굴 위치를 클릭하면 즉시 '나(블러 제외)'로 지정되고 나머지는 모두 블러됩니다"
          >
            <MousePointerClick size={14} />
            <span>👑 사진에서 나 콕 찍기</span>
          </button>

          {/* Select Mode */}
          <button
            type="button"
            onClick={() => setInteractionMode('select')}
            className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              interactionMode === 'select'
                ? 'bg-white/15 text-white font-bold border border-white/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck size={13} />
            <span>박스 선택</span>
          </button>

          {/* Draw Mode */}
          <button
            type="button"
            onClick={() => setInteractionMode('draw')}
            className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              interactionMode === 'draw'
                ? 'bg-[#C6FF00]/20 text-[#C6FF00] font-bold border border-[#C6FF00]/50'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus size={13} />
            <span>수동 블러 영역 그리기</span>
          </button>

          {/* Toggle box outlines */}
          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
              showOverlays
                ? 'bg-white/5 border-white/15 text-neutral-300'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title="박스 테두리를 끄고 완성된 사진을 확인합니다"
          >
            {showOverlays ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showOverlays ? '박스 보기' : '박스 숨김(미리보기)'}</span>
          </button>

          {/* Clean Noise */}
          <button
            type="button"
            onClick={handleCleanBackgroundNoise}
            className="px-2.5 py-1.5 rounded text-xs flex items-center gap-1 text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            title="낮은 신뢰도의 박스를 정리합니다"
          >
            <Wand2 size={13} className="text-[#C6FF00]" />
            <span>잡음 정리</span>
          </button>
        </div>

        {/* Right: Style & Batch Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Style Selector */}
          <div className="inline-flex p-0.5 rounded-md bg-black/40 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setBlurStyle('soft')}
              className={`px-2 py-1 rounded transition-all font-medium cursor-pointer ${
                blurStyle === 'soft' ? 'bg-[#C6FF00] text-black font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              소프트
            </button>
            <button
              type="button"
              onClick={() => setBlurStyle('mosaic')}
              className={`px-2 py-1 rounded transition-all font-medium cursor-pointer ${
                blurStyle === 'mosaic' ? 'bg-[#C6FF00] text-black font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              모자이크
            </button>
          </div>

          {/* Strength Slider */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>강도:</span>
            <input
              type="range"
              min="8"
              max="35"
              step="1"
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(Number(e.target.value))}
              className="w-16 accent-[#C6FF00] cursor-pointer"
            />
          </div>

          {/* Batch Actions */}
          {imagesState.length > 1 && (
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={handleBatchProcessAll}
              className="px-3 py-1.5 rounded bg-[#C6FF00]/20 text-[#C6FF00] hover:bg-[#C6FF00] hover:text-black font-extrabold border border-[#C6FF00]/40 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(198,255,0,0.2)] disabled:opacity-50 text-xs cursor-pointer"
              title="등록된 내 얼굴 에셋을 바탕으로 모든 사진에 일괄 적용합니다"
            >
              <Sparkles size={13} />
              <span>전체 사진 일괄 블러</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleBlurAllExceptMe}
            className="px-3 py-1.5 rounded bg-[#C6FF00]/15 hover:bg-[#C6FF00] text-[#C6FF00] hover:text-black font-bold border border-[#C6FF00]/30 text-xs transition-colors cursor-pointer"
            title="내 얼굴(👑)만 블러를 해제하고 다른 모든 사람을 블러 처리합니다"
          >
            👑 나 제외 모두 블러
          </button>
          <button
            type="button"
            onClick={handleClearAllBoxes}
            className="px-2.5 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs transition-colors cursor-pointer"
            title="현재 사진의 모든 박스를 지웁니다"
          >
            전체 박스 지우기
          </button>
        </div>
      </div>

      {/* ── Notice Banner if present ── */}
      {rememberMeNotice && (
        <div className="bg-[#C6FF00]/15 border-b border-[#C6FF00]/30 px-6 py-1.5 text-xs text-[#C6FF00] font-bold flex items-center justify-between animate-fadeIn shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            <span>{rememberMeNotice}</span>
          </div>
          <button onClick={() => setRememberMeNotice(null)} className="text-white/60 hover:text-white cursor-pointer">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Main Canvas Workspace ── */}
      <div className="flex-1 relative overflow-auto bg-[#070709] flex items-center justify-center p-6">
        {/* Pick Me Active Guide Overlay */}
        {interactionMode === 'pickMe' && (
          <div className="absolute top-4 z-40 bg-[#C6FF00] text-black px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce pointer-events-none">
            <MousePointerClick size={16} />
            <span>사진 속 강사님(본인) 얼굴을 마우스로 클릭하면 내 얼굴만 보존되고 나머지는 블러됩니다!</span>
          </div>
        )}

        {/* Loading Indicator */}
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
                  : 'AI가 사진 속 인물 얼굴과 내 얼굴을 정밀 분석 중입니다...'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                다중 스케일 BlazeFace 신경망이 작은 얼굴까지 감지하고 내 얼굴만 보존합니다.
              </p>
            </div>
          </div>
        )}

        {/* Canvas & Clean Overlay Container (Note: overflow-visible so edge tooltips are NEVER clipped) */}
        {currentLoadedImg && (
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`relative max-w-full max-h-[calc(100vh-340px)] select-none shadow-2xl rounded-lg border border-white/10 ${
              interactionMode === 'pickMe'
                ? 'cursor-pointer ring-4 ring-[#C6FF00]/60'
                : interactionMode === 'draw'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
            style={{
              aspectRatio: `${currentLoadedImg.naturalWidth} / ${currentLoadedImg.naturalHeight}`
            }}
          >
            {/* Realtime Processed Canvas */}
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain block rounded-lg"
            />

            {/* Clean Box Overlays: Continuous hover bridge & edge-safe positioning */}
            {!isAnalyzing && showOverlays && currentBoxes.map((box, bIdx) => {
              const leftPct = (box.x / currentLoadedImg.naturalWidth) * 100;
              const topPct = (box.y / currentLoadedImg.naturalHeight) * 100;
              const widthPct = (box.width / currentLoadedImg.naturalWidth) * 100;
              const heightPct = (box.height / currentLoadedImg.naturalHeight) * 100;

              const isMe = box.isMe;
              const isBlurred = box.isBlurred;
              const isActive = activeBoxId === box.id;

              // Flip toolbar below box if box is near top edge of image
              const showBelow = topPct < 14;
              // Horizontal alignment to avoid left/right clipping
              const horizAlignClass =
                leftPct < 14
                  ? 'left-0'
                  : leftPct + widthPct > 86
                  ? 'right-0'
                  : 'left-1/2 -translate-x-1/2';

              return (
                <div
                  key={box.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (interactionMode === 'pickMe') {
                      handleSetAsMe(box.id, e);
                      setInteractionMode('select');
                      return;
                    }
                    setActiveBoxId(box.id);
                  }}
                  className={`absolute transition-all group cursor-pointer ${
                    isMe
                      ? 'border-2 border-[#C6FF00] bg-[#C6FF00]/10 ring-2 ring-[#C6FF00]/40 z-20'
                      : isBlurred
                      ? 'border-2 border-[#FF5252]/85 bg-[#FF5252]/10 hover:border-[#FF5252] z-10'
                      : 'border-2 border-white/50 border-dashed bg-black/10 hover:border-white z-10'
                  } ${isActive ? 'ring-2 ring-white shadow-lg z-30' : 'hover:z-30'}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderRadius: '6px'
                  }}
                >
                  {/* Number / Crown Badge on Corner */}
                  <div
                    className={`absolute -top-2.5 -left-2.5 px-1.5 h-5 rounded-full flex items-center justify-center shadow-md font-mono font-bold text-[10px] pointer-events-none ${
                      isMe
                        ? 'bg-[#C6FF00] text-black ring-2 ring-black'
                        : isBlurred
                        ? 'bg-[#FF5252] text-white'
                        : 'bg-neutral-800 text-neutral-200 border border-white/30'
                    }`}
                  >
                    {isMe ? '👑 나' : `#${bIdx + 1}`}
                  </div>

                  {/* Floating Action Toolbar with continuous hover padding bridge (no gap!) */}
                  <div
                    className={`absolute ${
                      showBelow ? 'top-full pt-1.5' : 'bottom-full pb-1.5'
                    } ${horizAlignClass} z-40 pointer-events-auto ${
                      isActive ? 'flex' : 'hidden group-hover:flex'
                    }`}
                  >
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-black/95 border border-white/25 shadow-2xl backdrop-blur-md whitespace-nowrap">
                      {isMe ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C6FF00] text-black">
                          👑 내 얼굴 (블러 제외됨)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleSetAsMe(box.id, e)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C6FF00] hover:bg-white text-black transition-colors cursor-pointer"
                        >
                          👑 내 얼굴로 지정
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleToggleBlur(box.id, e)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          isBlurred
                            ? 'bg-[#FF5252]/20 hover:bg-[#FF5252] text-[#FF5252] hover:text-white border border-[#FF5252]/40'
                            : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                      >
                        {isBlurred ? '블러 해제' : '🛡️ 블러 적용'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteBox(box.id, e)}
                        className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                        title="박스 삭제"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Currently Drawing Box Preview */}
            {isDrawing && currentDraw && currentLoadedImg && (
              <div
                className="absolute border-2 border-[#C6FF00] border-dashed bg-[#C6FF00]/15 pointer-events-none rounded"
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

      {/* ── Detected Faces Quick-Select Strip (1-Click "Set as Me" or Toggle Blur) ── */}
      {!isAnalyzing && currentBoxes.length > 0 && (
        <div className="px-6 py-2.5 border-t border-white/10 bg-[#111116] flex items-center gap-3 overflow-x-auto shrink-0">
          <div className="shrink-0">
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <span>감지된 인물 ({currentBoxes.length}명)</span>
            </div>
            <div className="text-[10px] text-neutral-400">
              본인 얼굴의 <strong className="text-[#C6FF00]">[👑 나로 지정]</strong>을 누르면 내 얼굴만 빼고 모두 블러됩니다
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/10 shrink-0 mx-1" />

          <div className="flex items-center gap-2.5">
            {currentBoxes.map((box, idx) => {
              const isMe = box.isMe;
              const isBlurred = box.isBlurred;
              const isSelected = activeBoxId === box.id;

              return (
                <div
                  key={box.id}
                  onClick={() => setActiveBoxId(box.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                    isMe
                      ? 'bg-[#C6FF00]/15 border-[#C6FF00] ring-1 ring-[#C6FF00]/40'
                      : isSelected
                      ? 'bg-white/10 border-white/40'
                      : 'bg-black/50 border-white/10 hover:border-white/25'
                  }`}
                >
                  {/* Face Thumbnail */}
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0 bg-neutral-900">
                    {box.faceThumb ? (
                      <img src={box.faceThumb} alt={`face-${idx}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[10px]">
                        #{idx + 1}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 text-[8px] font-mono font-bold bg-black/80 text-white px-1 rounded-tl">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-1">
                    {isMe ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#C6FF00] text-black text-center">
                        👑 나 (보존됨)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSetAsMe(box.id, e)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C6FF00]/20 hover:bg-[#C6FF00] text-[#C6FF00] hover:text-black border border-[#C6FF00]/40 transition-colors cursor-pointer"
                      >
                        👑 나로 지정
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleToggleBlur(box.id, e)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                        isBlurred
                          ? 'bg-[#FF5252]/20 hover:bg-[#FF5252] text-[#FF5252] hover:text-white'
                          : 'bg-white/10 hover:bg-white/20 text-neutral-300'
                      }`}
                    >
                      {isBlurred ? '🛡️ 블러됨 (해제)' : '원본 노출 (블러켜기)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filmstrip Thumbnail Gallery (For Multiple Images) ── */}
      {imagesState.length > 1 && (
        <div className="px-6 py-2 border-t border-white/10 bg-[#0C0C0F] flex items-center gap-3 overflow-x-auto shrink-0">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider shrink-0">
            사진 목록 ({activeIdx + 1}/{imagesState.length})
          </span>
          <div className="flex items-center gap-2.5">
            {imagesState.map((st, idx) => {
              const blCount = st.boxes.filter(b => b.isBlurred).length;
              const hasMe = st.boxes.some(b => b.isMe);

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectImage(idx)}
                  className={`relative w-16 h-12 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer ${
                    activeIdx === idx
                      ? 'border-[#C6FF00] ring-2 ring-[#C6FF00]/40 scale-105 shadow-md'
                      : 'border-white/15 opacity-65 hover:opacity-100'
                  }`}
                >
                  <img src={st.processedUrl || st.rawSrc} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-black/70 px-1 rounded">
                    #{idx + 1}
                  </span>
                  {hasMe && (
                    <span className="absolute top-0.5 left-1 text-[8px] font-bold text-[#C6FF00] bg-black/80 px-1 rounded">
                      👑 나
                    </span>
                  )}
                  {blCount > 0 && (
                    <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-[#FF5252] bg-black/80 px-1 rounded">
                      🛡️{blCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom Summary & Action Bar ── */}
      <div className="h-16 px-6 border-t border-white/10 bg-[#0E0E11] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C6FF00] animate-pulse" />
            <span>
              현재 사진: 감지된 인물 <strong className="text-white font-mono">{currentBoxes.length}</strong>명 중{' '}
              <strong className="text-[#FF5252] font-mono">{blurredCount}</strong>명 블러 적용
            </span>
          </div>

          {meBox ? (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-[#C6FF00]/15 border border-[#C6FF00]/40 text-[11px] text-[#C6FF00] font-bold">
              👑 강사 본인(내 얼굴) 블러 제외됨
            </span>
          ) : (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300 font-bold">
              💡 아래 감지된 인물 목록이나 사진에서 [👑 나로 지정]을 누르면 내 얼굴만 선명하게 보존됩니다!
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            취소 및 원본 유지
          </button>

          <button
            type="button"
            onClick={handleApplyFinal}
            className="px-5 py-2.5 rounded-lg text-xs font-extrabold text-black bg-[#C6FF00] hover:bg-white hover:shadow-[0_0_20px_rgba(198,255,0,0.4)] transition-all flex items-center gap-2 cursor-pointer"
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
