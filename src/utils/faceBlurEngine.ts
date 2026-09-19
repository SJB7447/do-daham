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

export const ADMIN_FACE_STORAGE_KEY = 'DODAHAM_ADMIN_FACE_TEMPLATE_V2';

/**
 * Interface for saved admin face template (My Face Asset)
 */
export interface AdminFaceTemplate {
  thumbnail?: string; // Small Data URL thumbnail for UI display
  aspectRatio: number;
  colorProfile: number[]; // Normalized RGB histogram
  featureVector: number[]; // 16x16 normalized grayscale feature representation
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
 * Clear stored admin face template
 */
export function clearStoredAdminFaceTemplate(): void {
  try {
    localStorage.removeItem(ADMIN_FACE_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear face template', e);
  }
}

/**
 * Save an admin face template from a selected box
 */
export function saveAdminFaceTemplate(image: HTMLImageElement, box: FaceBox): AdminFaceTemplate | null {
  try {
    const profile = extractFaceProfile(image, box);
    if (profile) {
      localStorage.setItem(ADMIN_FACE_STORAGE_KEY, JSON.stringify(profile));
      return profile;
    }
  } catch (e) {
    console.error('Failed to save face template', e);
  }
  return null;
}

/**
 * Register admin face directly from a profile/selfie image
 */
export async function registerAdminFaceFromImage(imageSrc: string): Promise<AdminFaceTemplate | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        // Detect faces in the profile image, or use the center crop if no face box is found
        const detected = await detectFaces(img, { filterBackView: false });
        let targetBox: FaceBox;
        if (detected.length > 0) {
          // Choose largest or most confident face in profile photo
          targetBox = detected.reduce((prev, curr) => 
            (curr.width * curr.height > prev.width * prev.height) ? curr : prev
          );
        } else {
          // Fallback: Use center 60% square of profile photo
          const size = Math.min(img.naturalWidth, img.naturalHeight) * 0.7;
          targetBox = {
            id: 'profile-crop',
            x: Math.round((img.naturalWidth - size) / 2),
            y: Math.round((img.naturalHeight - size) / 2),
            width: Math.round(size),
            height: Math.round(size),
            isBlurred: false,
            isMe: true
          };
        }

        const template = saveAdminFaceTemplate(img, targetBox);
        resolve(template);
      } catch (err) {
        console.error('Error registering admin face from image', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

/**
 * Extract color profile and 16x16 grayscale feature vector from face box
 */
function extractFaceProfile(image: HTMLImageElement, box: FaceBox): AdminFaceTemplate | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Extract 32x32 for thumbnail and color profile
  canvas.width = 32;
  canvas.height = 32;
  ctx.drawImage(
    image,
    box.x, box.y, box.width, box.height,
    0, 0, 32, 32
  );

  // Generate thumbnail Data URL
  const thumbnail = canvas.toDataURL('image/jpeg', 0.85);

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
  const normalizedColor = histogram.map(v => v / totalPixels);

  // Extract 16x16 normalized grayscale feature vector
  const featCanvas = document.createElement('canvas');
  const featCtx = featCanvas.getContext('2d');
  let featureVector: number[] = [];
  if (featCtx) {
    featCanvas.width = 16;
    featCanvas.height = 16;
    featCtx.drawImage(canvas, 0, 0, 16, 16);
    const featData = featCtx.getImageData(0, 0, 16, 16).data;
    featureVector = new Array(16 * 16);
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      const idx = i * 4;
      const gray = 0.299 * featData[idx] + 0.587 * featData[idx + 1] + 0.114 * featData[idx + 2];
      featureVector[i] = gray;
      sum += gray;
    }
    const mean = sum / 256;
    let varSum = 0;
    for (let i = 0; i < 256; i++) {
      varSum += (featureVector[i] - mean) ** 2;
    }
    const std = Math.sqrt(varSum / 256) || 1;
    // Normalize to zero mean, unit variance
    featureVector = featureVector.map(v => (v - mean) / std);
  }

  return {
    thumbnail,
    aspectRatio: box.width / (box.height || 1),
    colorProfile: normalizedColor,
    featureVector,
    updatedAt: Date.now()
  };
}

/**
 * Compare two face profiles (combines color histogram distance and facial structure similarity)
 */
export function compareFaceProfiles(p1: AdminFaceTemplate, p2: AdminFaceTemplate): number {
  if (!p1.colorProfile || !p2.colorProfile || p1.colorProfile.length !== p2.colorProfile.length) {
    return 0;
  }

  // 1. Color distance (Euclidean)
  let colorDiffSum = 0;
  for (let i = 0; i < p1.colorProfile.length; i++) {
    const diff = p1.colorProfile[i] - p2.colorProfile[i];
    colorDiffSum += diff * diff;
  }
  const colorDist = Math.sqrt(colorDiffSum);
  const colorSimilarity = Math.max(0, 1 - colorDist * 1.5);

  // 2. Grayscale Structure Correlation (Cosine correlation)
  let structuralSimilarity = 0.5;
  if (p1.featureVector && p2.featureVector && p1.featureVector.length === p2.featureVector.length) {
    let dot = 0;
    for (let i = 0; i < p1.featureVector.length; i++) {
      dot += p1.featureVector[i] * p2.featureVector[i];
    }
    // Correlation coefficient between normalized vectors (-1 to 1) -> scaled to 0 to 1
    const corr = dot / p1.featureVector.length;
    structuralSimilarity = Math.max(0, Math.min(1, (corr + 1) / 2));
  }

  // 3. Aspect ratio consistency penalty
  const aspectDiff = Math.abs(p1.aspectRatio - p2.aspectRatio);
  const aspectScore = Math.max(0.6, 1 - aspectDiff * 0.4);

  // Combined score (60% structure, 40% color profile) * aspect weight
  return (structuralSimilarity * 0.6 + colorSimilarity * 0.4) * aspectScore;
}

export interface DetectionOptions {
  filterBackView?: boolean; // When true, filters out back-of-head, nape, shoulders
}

/**
 * Primary Face Detection:
 * 1. Native window.FaceDetector (Chromium experimental/standard)
 * 2. Fallback: Computer-Vision skin & facial feature contrast candidate detector
 * 3. Back-view / Nape / Flat-skin false-positive filter
 */
export async function detectFaces(
  image: HTMLImageElement,
  options: DetectionOptions = { filterBackView: true }
): Promise<FaceBox[]> {
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
    boxes = detectFacesByColorAndContrast(image, options.filterBackView ?? true);
  } else if (options.filterBackView) {
    // Also verify native boxes to eliminate back-of-head or nape false triggers
    boxes = boxes.filter(box => isTrueFrontalOrSideFace(image, box));
  }

  // Deduplicate overlapping boxes
  boxes = filterOverlappingBoxes(boxes);

  // Determine who is "Me" vs "Others"
  boxes = classifyFacesWithTemplate(image, boxes);

  return boxes;
}

/**
 * Fast Client-Side Face Candidate Detector (Skin-Tone + Facial Contrast Analysis + Back-View Filter)
 */
function detectFacesByColorAndContrast(
  image: HTMLImageElement,
  filterBackView: boolean = true
): FaceBox[] {
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
  // Luminance map for contrast inspection
  const lumMap = new Uint8Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
    lumMap[i / 4] = Math.round(yVal);

    // Normalized YCbCr skin color heuristic
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
  const candidates: { x: number; y: number; size: number; density: number; faceScore: number }[] = [];
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

        // Typical human face density in bounding square is 0.35 to 0.85
        if (density >= 0.38 && density <= 0.85) {
          // Run Facial Feature & Back-View Verification
          const score = evaluateFacialStructure(
            lumMap, skinMap, w, h,
            cx - halfSize, cy - halfSize, size, Math.round(size * 1.2)
          );

          if (!filterBackView || score >= 0.42) {
            candidates.push({
              x: cx - halfSize,
              y: cy - halfSize,
              size,
              density,
              faceScore: score
            });
          }
        }
      }
    }
  }

  // Sort candidates by face feature score + density
  candidates.sort((a, b) => (b.faceScore * 0.7 + b.density * 0.3) - (a.faceScore * 0.7 + a.density * 0.3));

  const boxes: FaceBox[] = [];

  for (const c of candidates) {
    const origX = Math.round(c.x / scale);
    const origY = Math.round(c.y / scale);
    const origW = Math.round(c.size / scale);
    const origH = Math.round((c.size * 1.2) / scale); // Human head aspect ratio

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
        confidence: c.faceScore
      });
      if (boxes.length >= 20) break; // Reasonable cap
    }
  }

  return boxes;
}

/**
 * Facial Feature & Back-View Evaluator:
 * Back of the head, neck/nape, and shoulders have:
 *  1. Flat uniform luminance (no eye/nose/mouth features) OR
 *  2. 100% hair texture with no eye contrast in upper-middle face OR
 *  3. Inverted lighting (upper dark hair, lower uniform neck skin) without facial T-zone.
 * Front/Side faces have:
 *  1. Darker eye/eyebrow strip compared to forehead/cheeks (upper 30-55% luminance drop).
 *  2. Sufficient variance (texture) across features.
 */
function evaluateFacialStructure(
  lumMap: Uint8Array,
  skinMap: Uint8Array,
  mapW: number,
  mapH: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): number {
  if (bx < 0 || by < 0 || bx + bw > mapW || by + bh > mapH) return 0;

  // Sample regions within the candidate face box:
  // Zone A: Forehead (0% to 25% height)
  // Zone B: Eye / Eyebrow strip (25% to 50% height)
  // Zone C: Cheeks / Nose (50% to 75% height)
  // Zone D: Mouth / Chin (75% to 100% height)

  let lumA = 0, countA = 0;
  let lumB = 0, countB = 0;
  let lumC = 0, countC = 0;
  let lumD = 0, countD = 0;

  let totalLum = 0;
  let totalCount = 0;
  const lumValues: number[] = [];

  const stepY = Math.max(1, Math.floor(bh / 12));
  const stepX = Math.max(1, Math.floor(bw / 12));

  for (let dy = 0; dy < bh; dy += stepY) {
    const yPct = dy / bh;
    for (let dx = 0; dx < bw; dx += stepX) {
      const idx = (by + dy) * mapW + (bx + dx);
      const val = lumMap[idx];
      lumValues.push(val);
      totalLum += val;
      totalCount++;

      if (yPct < 0.25) {
        lumA += val; countA++;
      } else if (yPct < 0.50) {
        lumB += val; countB++;
      } else if (yPct < 0.75) {
        lumC += val; countC++;
      } else {
        lumD += val; countD++;
      }
    }
  }

  if (totalCount === 0) return 0;

  const avgA = countA ? lumA / countA : 0;
  const avgB = countB ? lumB / countB : 0;
  const avgC = countC ? lumC / countC : 0;
  const avgD = countD ? lumD / countD : 0;
  const overallAvg = totalLum / totalCount;

  // 1. Calculate Standard Deviation (texture variance)
  let varianceSum = 0;
  for (const v of lumValues) {
    varianceSum += (v - overallAvg) ** 2;
  }
  const stdDev = Math.sqrt(varianceSum / totalCount);

  // Back of neck or bare skin is almost flat (stdDev < 11). Disqualify back views!
  if (stdDev < 10) {
    return 0.1; // Flat skin / nape / shoulder
  }

  // 2. Eye strip darkness test:
  // In real faces, Zone B (eyes/eyebrows) is darker than Zone C (cheeks/nose) and Zone A (forehead).
  // In back-of-head views, Zone A is dark hair and Zone C/D is neck (Zone B is NOT an eye drop).
  const eyeCheekDiff = avgC - avgB; // Should be positive (eyes darker than cheeks)
  const eyeForeheadDiff = avgA - avgB;

  let eyeContrastScore = 0.5;
  if (eyeCheekDiff > 4 && eyeForeheadDiff > 2) {
    eyeContrastScore = 0.85; // High confidence facial feature
  } else if (eyeCheekDiff > 0) {
    eyeContrastScore = 0.65;
  } else if (eyeCheekDiff < -15) {
    // Cheeks much darker than eyes -> highly atypical for face, likely back view/clothing
    eyeContrastScore = 0.2;
  }

  // 3. Hair vs Skin transition test:
  // Back of head has dark hair at top (Zone A, B) and sudden light neck skin at bottom (Zone C, D),
  // with no eyes. If top is very dark (<50) and bottom is light (>130) with no eye dip, it's a back-of-head.
  if (avgA < 60 && avgB < 65 && avgC > 120 && avgD > 120) {
    return 0.15; // Definite back of head / nape
  }

  // Combine scores
  const varianceScore = Math.min(1, stdDev / 35);
  return eyeContrastScore * 0.65 + varianceScore * 0.35;
}

/**
 * Secondary verification for native FaceDetector bounding boxes to eliminate back-of-head false positives
 */
function isTrueFrontalOrSideFace(image: HTMLImageElement, box: FaceBox): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;

    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(
      image,
      box.x, box.y, box.width, box.height,
      0, 0, 32, 32
    );

    const imgData = ctx.getImageData(0, 0, 32, 32).data;
    let lumSum = 0;
    const lums: number[] = [];
    let topLum = 0, midLum = 0, botLum = 0;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const idx = (y * 32 + x) * 4;
        const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
        lums.push(lum);
        lumSum += lum;

        if (y < 10) topLum += lum;
        else if (y < 22) midLum += lum;
        else botLum += lum;
      }
    }

    const mean = lumSum / (32 * 32);
    let varSum = 0;
    for (const l of lums) {
      varSum += (l - mean) ** 2;
    }
    const std = Math.sqrt(varSum / (32 * 32));

    // Reject extremely flat patches (nape/shoulders)
    if (std < 9) return false;

    // Reject back-of-head (black hair top, white/pale neck bottom with zero eye dip)
    const avgTop = topLum / (10 * 32);
    const avgMid = midLum / (12 * 32);
    const avgBot = botLum / (10 * 32);
    if (avgTop < 50 && avgMid < 55 && avgBot > 130) {
      return false; // Back of head
    }

    return true;
  } catch {
    return true;
  }
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
 * If template score > 0.45, that face is automatically classified as "Me" (unblurred) and others blurred.
 * If no template is stored, defaults to leaving all unselected or prompt the user.
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

  // If match confidence is solid (score >= 0.46), assign that person as "Me"
  if (template && bestMeIdx !== -1 && bestScore >= 0.46) {
    return boxes.map((box, idx) => {
      const isMe = idx === bestMeIdx;
      return {
        ...box,
        isMe,
        isBlurred: !isMe // Preserve Me, blur everyone else
      };
    });
  }

  // If no template is saved, default the largest / most central candidate as "Me",
  // but if only 1 face exists, default it as Me.
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

  return boxes.map((box, idx) => {
    const isMe = idx === bestMeIdx;
    return {
      ...box,
      isMe,
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
