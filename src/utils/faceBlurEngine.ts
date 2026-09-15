/**
 * Face Blur Engine & Privacy Protection Utilities
 * 100% Client-side on-device processing. No images or face data leave the browser.
 */

export interface FaceBox {
  id: string;
  x: number; // In original image coordinates
  y: number;
  width: number;
  height: number;
  isBlurred: boolean;
  isMe: boolean;
  confidence?: number;
  manual?: boolean;
}

export type BlurStyle = 'soft' | 'mosaic';

const ADMIN_FACE_STORAGE_KEY = 'DODAHAM_ADMIN_FACE_TEMPLATE_V1';

/**
 * Interface for saved admin face template
 */
interface AdminFaceTemplate {
  aspectRatio: number;
  colorProfile: number[]; // Normalized RGB histogram
  updatedAt: number;
}

/**
 * Get stored admin face template from localStorage
 */
export function getStoredAdminFaceTemplate(): AdminFaceTemplate | null {
  try {
    const raw = localStorage.getItem(ADMIN_FACE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save an admin face template from a selected box
 */
export function saveAdminFaceTemplate(image: HTMLImageElement, box: FaceBox): void {
  try {
    const profile = extractFaceProfile(image, box);
    if (profile) {
      localStorage.setItem(ADMIN_FACE_STORAGE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.error('Failed to save face template', e);
  }
}

/**
 * Extract simple color/aspect profile from face box
 */
function extractFaceProfile(image: HTMLImageElement, box: FaceBox): AdminFaceTemplate | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = 32;
  canvas.height = 32;
  ctx.drawImage(
    image,
    box.x, box.y, box.width, box.height,
    0, 0, 32, 32
  );

  const imgData = ctx.getImageData(0, 0, 32, 32).data;
  const histogram = new Array(24).fill(0); // 8 bins per R, G, B

  for (let i = 0; i < imgData.length; i += 4) {
    const rBin = Math.min(7, Math.floor(imgData[i] / 32));
    const gBin = Math.min(7, Math.floor(imgData[i + 1] / 32));
    const bBin = Math.min(7, Math.floor(imgData[i + 2] / 32));
    histogram[rBin]++;
    histogram[8 + gBin]++;
    histogram[16 + bBin]++;
  }

  const totalPixels = 32 * 32;
  const normalized = histogram.map(v => v / totalPixels);

  return {
    aspectRatio: box.width / (box.height || 1),
    colorProfile: normalized,
    updatedAt: Date.now()
  };
}

/**
 * Compare two face profiles (cosine / Euclidean similarity)
 */
function compareFaceProfiles(p1: AdminFaceTemplate, p2: AdminFaceTemplate): number {
  if (!p1.colorProfile || !p2.colorProfile || p1.colorProfile.length !== p2.colorProfile.length) {
    return 0;
  }
  let sumDiff = 0;
  for (let i = 0; i < p1.colorProfile.length; i++) {
    const diff = p1.colorProfile[i] - p2.colorProfile[i];
    sumDiff += diff * diff;
  }
  const distance = Math.sqrt(sumDiff);
  return Math.max(0, 1 - distance * 1.5);
}

/**
 * Primary Face Detection:
 * 1. Native window.FaceDetector (Chromium experimental/standard)
 * 2. Fallback: Computer-Vision skin & feature contrast candidate detector
 */
export async function detectFaces(image: HTMLImageElement): Promise<FaceBox[]> {
  let boxes: FaceBox[] = [];

  // Attempt Native FaceDetector
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({
        fastMode: false,
        maxDetectedFaces: 30
      });
      const faces = await detector.detect(image);
      if (faces && faces.length > 0) {
        boxes = faces.map((f: any, idx: number) => {
          const bb = f.boundingBox;
          // Add small margin around face for natural blurring
          const marginW = bb.width * 0.15;
          const marginH = bb.height * 0.15;
          const x = Math.max(0, bb.x - marginW);
          const y = Math.max(0, bb.y - marginH);
          const width = Math.min(image.naturalWidth - x, bb.width + marginW * 2);
          const height = Math.min(image.naturalHeight - y, bb.height + marginH * 2);

          return {
            id: `face-native-${idx}-${Date.now()}`,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            isBlurred: true,
            isMe: false,
            confidence: 0.95
          };
        });
      }
    } catch (err) {
      console.warn('Native FaceDetector failed, falling back to CV detection', err);
    }
  }

  // If native detector wasn't available or found nothing, run fast canvas CV detector
  if (boxes.length === 0) {
    boxes = detectFacesByColorAndContrast(image);
  }

  // Deduplicate overlapping boxes
  boxes = filterOverlappingBoxes(boxes);

  // Determine who is "Me" vs "Others"
  boxes = classifyFacesWithTemplate(image, boxes);

  return boxes;
}

/**
 * Fast Client-Side Face Candidate Detector (Skin-Tone + Facial Contrast Analysis)
 */
function detectFacesByColorAndContrast(image: HTMLImageElement): FaceBox[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const maxDim = 480;
  let scale = 1;
  if (image.naturalWidth > maxDim || image.naturalHeight > maxDim) {
    scale = maxDim / Math.max(image.naturalWidth, image.naturalHeight);
  }

  const w = Math.round(image.naturalWidth * scale);
  const h = Math.round(image.naturalHeight * scale);
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(image, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Skin map array (1 = skin, 0 = non-skin)
  const skinMap = new Uint8Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Normalized YCbCr skin color heuristic
    const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    const isSkin =
      cb >= 77 && cb <= 135 &&
      cr >= 130 && cr <= 185 &&
      yVal > 30 &&
      r > g && g > b &&
      (r - g) >= 8;

    if (isSkin) {
      skinMap[i / 4] = 1;
    }
  }

  // Grid scan for face-sized skin clusters
  const candidates: { x: number; y: number; size: number; density: number }[] = [];
  const minSize = Math.max(24, Math.round(w * 0.05));
  const maxSize = Math.round(w * 0.4);
  const step = Math.max(8, Math.round(w * 0.025));

  for (let size = minSize; size <= maxSize; size = Math.round(size * 1.35)) {
    const halfSize = Math.floor(size / 2);
    for (let cy = halfSize; cy < h - halfSize; cy += step) {
      for (let cx = halfSize; cx < w - halfSize; cx += step) {
        let skinCount = 0;
        const totalSamples = 36;
        for (let sy = -halfSize; sy < halfSize; sy += Math.floor(size / 6)) {
          for (let sx = -halfSize; sx < halfSize; sx += Math.floor(size / 6)) {
            const px = cx + sx;
            const py = cy + sy;
            if (px >= 0 && px < w && py >= 0 && py < h) {
              if (skinMap[py * w + px] === 1) skinCount++;
            }
          }
        }
        const density = skinCount / totalSamples;
        // Typical human face density in bounding square is 0.35 to 0.75
        if (density >= 0.38 && density <= 0.85) {
          candidates.push({ x: cx - halfSize, y: cy - halfSize, size, density });
        }
      }
    }
  }

  // Cluster candidates
  const boxes: FaceBox[] = [];
  candidates.sort((a, b) => b.density - a.density);

  for (const c of candidates) {
    const origX = Math.round(c.x / scale);
    const origY = Math.round(c.y / scale);
    const origW = Math.round(c.size / scale);
    const origH = Math.round((c.size * 1.2) / scale); // Slightly tall for human head

    // Check overlap with already accepted boxes
    const overlaps = boxes.some(b => {
      const xOverlap = Math.max(0, Math.min(origX + origW, b.x + b.width) - Math.max(origX, b.x));
      const yOverlap = Math.max(0, Math.min(origY + origH, b.y + b.height) - Math.max(origY, b.y));
      const overlapArea = xOverlap * yOverlap;
      const minArea = Math.min(origW * origH, b.width * b.height);
      return overlapArea / minArea > 0.4;
    });

    if (!overlaps && origX >= 0 && origY >= 0 && origX + origW <= image.naturalWidth && origY + origH <= image.naturalHeight) {
      boxes.push({
        id: `face-cv-${boxes.length}-${Date.now()}`,
        x: origX,
        y: origY,
        width: origW,
        height: origH,
        isBlurred: true,
        isMe: false,
        confidence: c.density
      });
      if (boxes.length >= 15) break; // Reasonable cap
    }
  }

  return boxes;
}

/**
 * Filter and remove overlapping/contained boxes
 */
function filterOverlappingBoxes(boxes: FaceBox[]): FaceBox[] {
  const result: FaceBox[] = [];
  for (const box of boxes) {
    const isDuplicate = result.some(existing => {
      const xOverlap = Math.max(0, Math.min(box.x + box.width, existing.x + existing.width) - Math.max(box.x, existing.x));
      const yOverlap = Math.max(0, Math.min(box.y + box.height, existing.y + existing.height) - Math.max(box.y, existing.y));
      const overlapArea = xOverlap * yOverlap;
      const minArea = Math.min(box.width * box.height, existing.width * existing.height);
      return (overlapArea / minArea) > 0.55;
    });
    if (!isDuplicate) {
      result.push(box);
    }
  }
  return result;
}

/**
 * Classify which face is likely "Me (Admin)" vs "Others":
 * If an admin template is stored, compare similarity.
 * Otherwise, default the largest / most central candidate or first detected as candidate "Me".
 */
export function classifyFacesWithTemplate(image: HTMLImageElement, boxes: FaceBox[]): FaceBox[] {
  if (boxes.length === 0) return boxes;

  const template = getStoredAdminFaceTemplate();
  let bestMeIdx = -1;
  let bestScore = -1;

  if (template) {
    boxes.forEach((box, idx) => {
      const prof = extractFaceProfile(image, box);
      if (prof) {
        const score = compareFaceProfiles(template, prof);
        if (score > bestScore) {
          bestScore = score;
          bestMeIdx = idx;
        }
      }
    });
  }

  // If no template or low confidence, pick the primary subject (usually largest or most central)
  if (bestMeIdx === -1 || bestScore < 0.4) {
    const imgCenterX = image.naturalWidth / 2;
    const imgCenterY = image.naturalHeight / 2;
    let bestWeight = -1;

    boxes.forEach((box, idx) => {
      const boxCenterX = box.x + box.width / 2;
      const boxCenterY = box.y + box.height / 2;
      const distToCenter = Math.hypot(boxCenterX - imgCenterX, boxCenterY - imgCenterY);
      const centerScore = 1 - distToCenter / Math.hypot(imgCenterX, imgCenterY);
      const sizeScore = (box.width * box.height) / (image.naturalWidth * image.naturalHeight);
      const weight = sizeScore * 0.6 + centerScore * 0.4;

      if (weight > bestWeight) {
        bestWeight = weight;
        bestMeIdx = idx;
      }
    });
  }

  return boxes.map((box, idx) => {
    const isMe = idx === bestMeIdx;
    return {
      ...box,
      isMe,
      // If it is ME, do not blur. If it is someone else, blur by default.
      isBlurred: !isMe
    };
  });
}

/**
 * Render blurred image on HTML5 canvas and return Data URL
 */
export function renderBlurredImage(
  image: HTMLImageElement,
  boxes: FaceBox[],
  style: BlurStyle = 'soft',
  intensity: number = 18
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return image.src;

  const w = image.naturalWidth;
  const h = image.naturalHeight;
  canvas.width = w;
  canvas.height = h;

  // 1. Draw base original image
  ctx.drawImage(image, 0, 0, w, h);

  // 2. Filter only boxes marked for blurring
  const blurBoxes = boxes.filter(b => b.isBlurred);
  if (blurBoxes.length === 0) {
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  if (style === 'mosaic') {
    // Pixelate / Mosaic effect
    const blockSize = Math.max(6, Math.round(intensity * (w / 1000)));

    for (const box of blurBoxes) {
      const bx = Math.max(0, Math.round(box.x));
      const by = Math.max(0, Math.round(box.y));
      const bw = Math.min(w - bx, Math.round(box.width));
      const bh = Math.min(h - by, Math.round(box.height));
      if (bw <= 0 || bh <= 0) continue;

      const faceData = ctx.getImageData(bx, by, bw, bh);
      const pixels = faceData.data;

      // Elliptical mask check for natural look
      const rx = bw / 2;
      const ry = bh / 2;
      const cx = rx;
      const cy = ry;

      for (let y = 0; y < bh; y += blockSize) {
        for (let x = 0; x < bw; x += blockSize) {
          // Average color in this block
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let dy = 0; dy < blockSize && (y + dy) < bh; dy++) {
            for (let dx = 0; dx < blockSize && (x + dx) < bw; dx++) {
              const pIdx = ((y + dy) * bw + (x + dx)) * 4;
              rSum += pixels[pIdx];
              gSum += pixels[pIdx + 1];
              bSum += pixels[pIdx + 2];
              count++;
            }
          }

          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);

          // Fill the block with average color
          for (let dy = 0; dy < blockSize && (y + dy) < bh; dy++) {
            for (let dx = 0; dx < blockSize && (x + dx) < bw; dx++) {
              const curX = x + dx;
              const curY = y + dy;
              // Check if inside rounded face ellipse
              const normX = (curX - cx) / rx;
              const normY = (curY - cy) / ry;
              if (normX * normX + normY * normY <= 1.05) {
                const pIdx = (curY * bw + curX) * 4;
                pixels[pIdx] = avgR;
                pixels[pIdx + 1] = avgG;
                pixels[pIdx + 2] = avgB;
              }
            }
          }
        }
      }

      ctx.putImageData(faceData, bx, by);
    }
  } else {
    // Soft Gaussian Blur with smooth feathered elliptical clipping
    for (const box of blurBoxes) {
      const bx = Math.max(0, Math.round(box.x));
      const by = Math.max(0, Math.round(box.y));
      const bw = Math.min(w - bx, Math.round(box.width));
      const bh = Math.min(h - by, Math.round(box.height));
      if (bw <= 0 || bh <= 0) continue;

      // Extract patch to offscreen canvas
      const patchCanvas = document.createElement('canvas');
      const patchCtx = patchCanvas.getContext('2d');
      if (!patchCtx) continue;

      patchCanvas.width = bw;
      patchCanvas.height = bh;

      // Multi-pass downscale & upscale for fast high-strength Gaussian blur
      const blurLevel = Math.max(8, intensity);
      const smallScale = Math.max(0.04, 1 / (blurLevel * 0.8));
      const smallW = Math.max(4, Math.round(bw * smallScale));
      const smallH = Math.max(4, Math.round(bh * smallScale));

      const smallCanvas = document.createElement('canvas');
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) continue;

      smallCanvas.width = smallW;
      smallCanvas.height = smallH;
      smallCtx.drawImage(image, bx, by, bw, bh, 0, 0, smallW, smallH);

      // Draw back to patch with CSS filter blur if supported, or scaled bilinear smoothing
      patchCtx.imageSmoothingEnabled = true;
      patchCtx.imageSmoothingQuality = 'high';
      patchCtx.filter = `blur(${Math.round(intensity * 0.6)}px)`;
      patchCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, bw, bh);

      // Clip onto main canvas with rounded ellipse & soft shadow
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2, by + bh / 2, bw * 0.52, bh * 0.52, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(patchCanvas, bx, by);
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}
