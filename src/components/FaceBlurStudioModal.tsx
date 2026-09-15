import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, X, Sparkles, Check, RefreshCw, Sliders, Eye, EyeOff, 
  UserCheck, Plus, Trash2, HelpCircle, Layers, Move
} from 'lucide-react';
import { 
  FaceBox, 
  BlurStyle, 
  detectFaces, 
  renderBlurredImage, 
  saveAdminFaceTemplate 
} from '../utils/faceBlurEngine';

interface FaceBlurStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onApply: (processedDataUrl: string) => void;
}

export default function FaceBlurStudioModal({
  isOpen,
  onClose,
  imageSrc,
  onApply
}: FaceBlurStudioModalProps) {
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<FaceBox[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [blurStyle, setBlurStyle] = useState<BlurStyle>('soft');
  const [blurIntensity, setBlurIntensity] = useState<number>(18);
  const [interactionMode, setInteractionMode] = useState<'select' | 'draw'>('select');
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [rememberMeSuccess, setRememberMeSuccess] = useState(false);

  // Manual draw box state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Load image & run face detection when modal opens
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setIsAnalyzing(true);
    setBoxes([]);
    setActiveBoxId(null);
    setRememberMeSuccess(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      setLoadedImage(img);
      try {
        const detected = await detectFaces(img);
        setBoxes(detected);
        if (detected.length > 0) {
          const meBox = detected.find(b => b.isMe);
          setActiveBoxId(meBox ? meBox.id : detected[0].id);
        }
      } catch (err) {
        console.error('Face detection error', err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // 2. Render blurred canvas whenever boxes, style, or intensity changes
  useEffect(() => {
    if (!loadedImage || !previewCanvasRef.current) return;

    const dataUrl = renderBlurredImage(loadedImage, boxes, blurStyle, blurIntensity);
    const renderImg = new Image();
    renderImg.onload = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      canvas.width = loadedImage.naturalWidth;
      canvas.height = loadedImage.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(renderImg, 0, 0);
      }
    };
    renderImg.src = dataUrl;
  }, [loadedImage, boxes, blurStyle, blurIntensity]);

  if (!isOpen || !imageSrc) return null;

  // Toggle single box blur
  const handleToggleBlur = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, isBlurred: !b.isBlurred } : b));
  };

  // Set single box as "Me (Admin)"
  const handleSetAsMe = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBoxes(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, isMe: true, isBlurred: false };
      }
      return { ...b, isMe: false, isBlurred: true };
    }));
    setActiveBoxId(id);

    // Save as admin template for future photos
    if (loadedImage) {
      const targetBox = boxes.find(b => b.id === id);
      if (targetBox) {
        saveAdminFaceTemplate(loadedImage, targetBox);
        setRememberMeSuccess(true);
        setTimeout(() => setRememberMeSuccess(false), 3000);
      }
    }
  };

  // Quick batch: Blur all except me
  const handleBlurAllExceptMe = () => {
    setBoxes(prev => prev.map(b => ({
      ...b,
      isBlurred: !b.isMe
    })));
  };

  // Quick batch: Blur all
  const handleBlurAll = () => {
    setBoxes(prev => prev.map(b => ({ ...b, isBlurred: true })));
  };

  // Quick batch: Clear all blur
  const handleClearAllBlur = () => {
    setBoxes(prev => prev.map(b => ({ ...b, isBlurred: false })));
  };

  // Delete manual box
  const handleDeleteBox = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBoxes(prev => prev.filter(b => b.id !== id));
    if (activeBoxId === id) setActiveBoxId(null);
  };

  // Mouse events for drawing manual blur boxes
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactionMode !== 'draw' || !loadedImage || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = loadedImage.naturalWidth / rect.width;
    const scaleY = loadedImage.naturalHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentDraw({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !loadedImage || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = loadedImage.naturalWidth / rect.width;
    const scaleY = loadedImage.naturalHeight / rect.height;

    const curX = Math.max(0, Math.min(loadedImage.naturalWidth, (e.clientX - rect.left) * scaleX));
    const curY = Math.max(0, Math.min(loadedImage.naturalHeight, (e.clientY - rect.top) * scaleY));

    const x = Math.min(drawStart.x, curX);
    const y = Math.min(drawStart.y, curY);
    const w = Math.abs(curX - drawStart.x);
    const h = Math.abs(curY - drawStart.y);

    setCurrentDraw({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentDraw || !loadedImage) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }

    // Only create if big enough
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
      setBoxes(prev => [...prev, newBox]);
      setActiveBoxId(newBox.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw(null);
  };

  // Final apply
  const handleApplyFinal = () => {
    if (!loadedImage) return;
    const finalDataUrl = renderBlurredImage(loadedImage, boxes, blurStyle, blurIntensity);
    onApply(finalDataUrl);
    onClose();
  };

  const blurredCount = boxes.filter(b => b.isBlurred).length;
  const meBox = boxes.find(b => b.isMe);

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex flex-col justify-between overflow-hidden animate-fadeIn">
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
            </div>
            <p className="text-[11px] text-neutral-400">
              강사님을 제외한 수강생/참석자 얼굴을 자동으로 블러 처리하고 클릭으로 손쉽게 조정합니다.
            </p>
          </div>
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

      {/* ── Control Toolbar ── */}
      <div className="px-6 py-3 border-b border-white/10 bg-[#141418] flex flex-wrap items-center justify-between gap-4 shrink-0">
        {/* Left: Blur Style & Strength */}
        <div className="flex items-center gap-6">
          {/* Style Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">효과:</span>
            <div className="inline-flex p-0.5 rounded-md bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setBlurStyle('soft')}
                className={`px-3 py-1 rounded transition-all font-medium ${
                  blurStyle === 'soft'
                    ? 'bg-[#C6FF00] text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                소프트 블러 (자연스러움)
              </button>
              <button
                type="button"
                onClick={() => setBlurStyle('mosaic')}
                className={`px-3 py-1 rounded transition-all font-medium ${
                  blurStyle === 'mosaic'
                    ? 'bg-[#C6FF00] text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                모자이크 (픽셀)
              </button>
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-neutral-400 font-medium">강도:</span>
            <input
              type="range"
              min="8"
              max="35"
              step="1"
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(Number(e.target.value))}
              className="w-24 accent-[#C6FF00] cursor-pointer"
            />
            <span className="text-xs font-mono text-[#C6FF00] w-6">{blurIntensity}</span>
          </div>

          {/* Tool Mode: Select vs Draw */}
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-6">
            <button
              type="button"
              onClick={() => setInteractionMode('select')}
              className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all ${
                interactionMode === 'select'
                  ? 'bg-white/15 text-white font-bold border border-white/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck size={14} />
              <span>얼굴 선택/토글</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('draw')}
              className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all ${
                interactionMode === 'draw'
                  ? 'bg-[#C6FF00]/20 text-[#C6FF00] font-bold border border-[#C6FF00]/50 shadow-[0_0_10px_rgba(198,255,0,0.2)]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={14} />
              <span>수동 사각 영역 추가</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Batch Actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleBlurAllExceptMe}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
          >
            나 제외 모두 블러
          </button>
          <button
            type="button"
            onClick={handleBlurAll}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
          >
            전체 블러
          </button>
          <button
            type="button"
            onClick={handleClearAllBlur}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
          >
            블러 초기화
          </button>
        </div>
      </div>

      {/* ── Main Canvas Workspace ── */}
      <div className="flex-1 relative overflow-auto bg-[#070709] flex items-center justify-center p-6">
        {/* Loading / Scanning Indicator */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center gap-4 animate-fadeIn">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#C6FF00]/20 animate-ping" />
              <div className="w-full h-full rounded-full border-2 border-t-[#C6FF00] border-r-[#C6FF00]/40 border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#C6FF00]">
                <Sparkles size={20} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white tracking-wide">
                AI가 사진 속 인물 얼굴을 분석 중입니다...
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                사진 외부 전송 없이 브라우저 내에서 안전하게 감지합니다.
              </p>
            </div>
          </div>
        )}

        {/* Canvas & Overlay Container */}
        {loadedImage && (
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`relative max-w-full max-h-[calc(100vh-230px)] select-none shadow-2xl rounded-lg overflow-hidden border border-white/10 ${
              interactionMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
            }`}
            style={{
              aspectRatio: `${loadedImage.naturalWidth} / ${loadedImage.naturalHeight}`
            }}
          >
            {/* Realtime Processed Canvas */}
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain block"
            />

            {/* Bounding Box Overlays */}
            {!isAnalyzing && boxes.map((box, index) => {
              const leftPct = (box.x / loadedImage.naturalWidth) * 100;
              const topPct = (box.y / loadedImage.naturalHeight) * 100;
              const widthPct = (box.width / loadedImage.naturalWidth) * 100;
              const heightPct = (box.height / loadedImage.naturalHeight) * 100;

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
                        👑 나 (보존)
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
                        title="이 얼굴을 강사 본인으로 지정"
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
            {isDrawing && currentDraw && loadedImage && (
              <div
                className="absolute border-2 border-[#C6FF00] border-dashed bg-[#C6FF00]/10 pointer-events-none rounded"
                style={{
                  left: `${(currentDraw.x / loadedImage.naturalWidth) * 100}%`,
                  top: `${(currentDraw.y / loadedImage.naturalHeight) * 100}%`,
                  width: `${(currentDraw.w / loadedImage.naturalWidth) * 100}%`,
                  height: `${(currentDraw.h / loadedImage.naturalHeight) * 100}%`
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Summary & Action Bar ── */}
      <div className="h-18 px-6 border-t border-white/10 bg-[#0E0E11] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C6FF00] animate-pulse" />
            <span>
              감지된 인물 <strong className="text-white font-mono">{boxes.length}</strong>명 중{' '}
              <strong className="text-[#FF5252] font-mono">{blurredCount}</strong>명 블러 적용 중
            </span>
          </div>

          {meBox && (
            <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-neutral-300">
              강사 본인 지정: <strong>👑 보존 완료</strong>
            </span>
          )}

          {rememberMeSuccess && (
            <span className="px-2 py-0.5 rounded bg-[#C6FF00]/20 text-[#C6FF00] text-[11px] font-bold animate-fadeIn">
              ✓ 내 얼굴 템플릿 저장됨! (다음 사진에 자동 반영)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            취소 및 원본 유지
          </button>

          <button
            type="button"
            onClick={handleApplyFinal}
            className="px-5 py-2.5 rounded-lg text-xs font-extrabold text-black bg-[#C6FF00] hover:bg-white hover:shadow-[0_0_20px_rgba(198,255,0,0.4)] transition-all flex items-center gap-2"
          >
            <Check size={15} />
            <span>블러 적용 완료 ({blurredCount}명 보호)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
