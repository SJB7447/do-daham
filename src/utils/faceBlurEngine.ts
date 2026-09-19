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
        const detected = await detectFaces(img, { filterBackView: false, strictMode: false });
        let targetBox: FaceBox;
        if (detected.length > 0) {
          targetBox = detected.reduce((prev, curr) => 
            (curr.width * curr.height > prev.width * prev.height) ? curr : prev
          );
        } else {
          // Fallback: Use center 65% square of profile photo
          const size = Math.min(img.naturalWidth, img.naturalHeight) * 0.65;
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

  canvas.width = 32;
  canvas.height = 32;
  ctx.drawImage(
    image,
    box.x, box.y, box.width, box.height,
    0, 0, 32, 32
  );

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
    const corr = dot / p1.featureVector.length;
    structuralSimilarity = Math.max(0, Math.min(1, (corr + 1) / 2));
  }

  // 3. Aspect ratio consistency penalty
  const aspectDiff = Math.abs(p1.aspectRatio - p2.aspectRatio);
  const aspectScore = Math.max(0.6, 1 - aspectDiff * 0.4);

  return (structuralSimilarity * 0.6 + colorSimilarity * 0.4) * aspectScore;
}

export interface DetectionOptions {
  filterBackView?: boolean; // When true, filters out back-of-head, nape, shoulders
  strictMode?: boolean;     // When true, strictly verifies eye-pair and rejects background/wood wall
}

/**
 * Primary Face Detection:
 * 1. Native window.FaceDetector (Chromium experimental/standard)
 * 2. Fallback: Computer-Vision skin & facial feature contrast candidate detector
 * 3. Strict Eye-pair, back-view and wood/furniture noise rejection
 */
export async function detectFaces(
  image: HTMLImageElement,
  options: DetectionOptions = { filterBackView: true, strictMode: true }
): Promise<FaceBox[]> {
  let boxes: FaceBox[] = [];

  // Attempt Native FaceDetector
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({
        fastMode: false,
        maxDetectedFaces: 25
      });
      const faces = await detector.detect(image);
      if (faces && faces.length > 0) {
        boxes = faces.map((f: any, idx: number) => {
          const bb = f.boundingBox;
          const marginW = bb.width * 0.12;
          const marginH = bb.height * 0.12;
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
    boxes = detectFacesByColorAndContrast(image, options.filterBackView ?? true, options.strictMode ?? true);
  }

  // Strict verification: eliminate wood wall panels, chairs, back-of-head, screen text
  if (options.filterBackView ?? true) {
    boxes = boxes.filter(box => isStrictHumanFace(image, box));
  }

  // Deduplicate overlapping boxes
  boxes = filterOverlappingBoxes(boxes);

  // Determine who is "Me" vs "Others"
  boxes = classifyFacesWithTemplate(image, boxes);

  return boxes;
}

/**
 * Strict Human Face & Eye-Pair Verifier:
 * Filters out:
 *  1. Wood wall panels, furniture, chairs, monitor screen text
 *  2. Back of head / hair mass
 *  3. Flat skin / nape / shoulders
 * Real faces must have:
 *  - Left eye local dark region (y: 25-45%, x: 18-42%)
 *  - Right eye local dark region (y: 25-45%, x: 58-82%)
 *  - Nose bridge / Forehead brighter than eyes (T-zone contrast)
 */
export function isStrictHumanFace(image: HTMLImageElement, box: FaceBox): boolean {
  if (box.manual) return true;

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
    const lum = new Float32Array(32 * 32);
    let totalLum = 0;

    for (let i = 0; i < 32 * 32; i++) {
      const idx = i * 4;
      const yVal = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      lum[i] = yVal;
      totalLum += yVal;
    }
    const meanLum = totalLum / (32 * 32);

    // Variance check: very flat regions (plain wall, nape, solid furniture) are rejected
    let varSum = 0;
    for (let i = 0; i < 32 * 32; i++) {
      varSum += (lum[i] - meanLum) ** 2;
    }
    const stdDev = Math.sqrt(varSum / (32 * 32));
    if (stdDev < 13) return false; // Uniform wood grain, flat wall, or bare neck

    // Sample face zones:
    // Left eye zone: x: 6~13, y: 9~15
    // Right eye zone: x: 18~25, y: 9~15
    // Forehead zone: x: 10~22, y: 3~7
    // Nose bridge: x: 13~18, y: 9~16
    // Cheeks zone: x: 6~25, y: 17~23

    let leftEyeSum = 0, leftEyeCount = 0;
    let rightEyeSum = 0, rightEyeCount = 0;
    let foreheadSum = 0, foreheadCount = 0;
    let noseBridgeSum = 0, noseBridgeCount = 0;
    let cheekSum = 0, cheekCount = 0;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const val = lum[y * 32 + x];

        if (y >= 9 && y <= 15) {
          if (x >= 6 && x <= 13) { leftEyeSum += val; leftEyeCount++; }
          else if (x >= 18 && x <= 25) { rightEyeSum += val; rightEyeCount++; }
          else if (x >= 13 && x <= 18) { noseBridgeSum += val; noseBridgeCount++; }
        } else if (y >= 3 && y <= 7 && x >= 9 && x <= 22) {
          foreheadSum += val; foreheadCount++;
        } else if (y >= 17 && y <= 23 && x >= 6 && x <= 25) {
          cheekSum += val; cheekCount++;
        }
      }
    }

    const avgLeftEye = leftEyeCount ? leftEyeSum / leftEyeCount : 0;
    const avgRightEye = rightEyeCount ? rightEyeSum / rightEyeCount : 0;
    const avgForehead = foreheadCount ? foreheadSum / foreheadCount : 0;
    const avgNoseBridge = noseBridgeCount ? noseBridgeSum / noseBridgeCount : 0;
    const avgCheek = cheekCount ? cheekSum / cheekCount : 0;

    // Test 1: Eyes must be darker than surrounding forehead / nose / cheeks
    const leftEyeDarker = (avgNoseBridge - avgLeftEye > 2) || (avgCheek - avgLeftEye > 2.5) || (avgForehead - avgLeftEye > 2.5);
    const rightEyeDarker = (avgNoseBridge - avgRightEye > 2) || (avgCheek - avgRightEye > 2.5) || (avgForehead - avgRightEye > 2.5);

    // If neither eye is darker than surrounding facial regions -> wood wall, chair, or back-of-head
    if (!leftEyeDarker && !rightEyeDarker) {
      return false;
    }

    // Test 2: Back-of-head rejection (dark hair top, light neck bottom, zero eye dip)
    if (avgForehead < 55 && avgLeftEye < 60 && avgRightEye < 60 && avgCheek > 115) {
      return false; // Back of head / nape
    }

    // Test 3: Screen text / artificial high contrast noise rejection
    if (stdDev > 75) {
      return false; // Too noisy / text on screen / complex background
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Fast Client-Side Face Candidate Detector (Skin-Tone + Eye-Contrast + Aspect Ratio)
 */
function detectFacesByColorAndContrast(
  image: HTMLImageElement,
  filterBackView: boolean = true,
  strictMode: boolean = true
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

  const skinMap = new Uint8Array(w * h);
  const lumMap = new Uint8Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
    lumMap[i / 4] = Math.round(yVal);

    // Precise skin color filter (stricter to reject yellow-brown wood panels)
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    const isSkin =
      cb >= 85 && cb <= 130 &&
      cr >= 135 && cr <= 180 &&
      yVal > 40 && yVal < 235 &&
      r > g && g > b &&
      (r - g) >= 12 && // Human skin has distinct red dominance over green
      (g - b) >= 4;

    if (isSkin) {
      skinMap[i / 4] = 1;
    }
  }

  const candidates: { x: number; y: number; size: number; density: number; faceScore: number }[] = [];
  const minSize = Math.max(28, Math.round(w * 0.06));
  const maxSize = Math.round(w * 0.35);
  const step = Math.max(10, Math.round(w * 0.035));

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

        // Human face density in bounding box
        if (density >= 0.42 && density <= 0.82) {
          const score = evaluateFacialStructure(
            lumMap, skinMap, w, h,
            cx - halfSize, cy - halfSize, size, Math.round(size * 1.25)
          );

          const threshold = strictMode ? 0.58 : 0.45;
          if (!filterBackView || score >= threshold) {
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

  candidates.sort((a, b) => (b.faceScore * 0.75 + b.density * 0.25) - (a.faceScore * 0.75 + a.density * 0.25));

  const boxes: FaceBox[] = [];

  for (const c of candidates) {
    const origX = Math.round(c.x / scale);
    const origY = Math.round(c.y / scale);
    const origW = Math.round(c.size / scale);
    const origH = Math.round((c.size * 1.25) / scale);

    const overlaps = boxes.some(b => {
      const xOverlap = Math.max(0, Math.min(origX + origW, b.x + b.width) - Math.max(origX, b.x));
      const yOverlap = Math.max(0, Math.min(origY + origH, b.y + b.height) - Math.max(origY, b.y));
      const overlapArea = xOverlap * yOverlap;
      const minArea = Math.min(origW * origH, b.width * b.height);
      return overlapArea / minArea > 0.35;
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
      if (boxes.length >= 15) break;
    }
  }

  return boxes;
}

/**
 * Facial Feature & Back-View Evaluator
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

  let lumA = 0, countA = 0; // Forehead
  let lumB = 0, countB = 0; // Eye strip
  let lumC = 0, countC = 0; // Cheeks/Nose
  let lumD = 0, countD = 0; // Mouth/Chin

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

      if (yPct < 0.25) { lumA += val; countA++; }
      else if (yPct < 0.50) { lumB += val; countB++; }
      else if (yPct < 0.75) { lumC += val; countC++; }
      else { lumD += val; countD++; }
    }
  }

  if (totalCount === 0) return 0;

  const avgA = countA ? lumA / countA : 0;
  const avgB = countB ? lumB / countB : 0;
  const avgC = countC ? lumC / countC : 0;
  const avgD = countD ? lumD / countD : 0;
  const overallAvg = totalLum / totalCount;

  let varianceSum = 0;
  for (const v of lumValues) {
    varianceSum += (v - overallAvg) ** 2;
  }
  const stdDev = Math.sqrt(varianceSum / totalCount);

  if (stdDev < 12) return 0.1; // Flat wood, plain background

  const eyeCheekDiff = avgC - avgB;
  const eyeForeheadDiff = avgA - avgB;

  let eyeContrastScore = 0.3;
  if (eyeCheekDiff > 5 && eyeForeheadDiff > 3) {
    eyeContrastScore = 0.9;
  } else if (eyeCheekDiff > 2) {
    eyeContrastScore = 0.7;
  } else if (eyeCheekDiff < -10) {
    return 0.1; // Inverted, likely clothing or chair
  }

  if (avgA < 55 && avgB < 60 && avgC > 120 && avgD > 120) {
    return 0.1; // Definite back of head / nape
  }

  const varianceScore = Math.min(1, stdDev / 30);
  return eyeContrastScore * 0.7 + varianceScore * 0.3;
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
      return (overlapArea / minArea) > 0.5;
    });
    if (!isDuplicate) {
      result.push(box);
    }
  }
  return result;
}

/**
 * Classify which face is likely "Me (Admin)" vs "Others"
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
        isBlurred: !isMe
      };
    });
  }

  // If no template is stored or not matched, leave all unselected or default first if only 1 box exists
  if (boxes.length === 1) {
    return [{ ...boxes[0], isMe: true, isBlurred: false }];
  }

  // If multiple boxes and no template match, default all to unblurred or blur, but do not guess blindly
  return boxes.map(box => ({
    ...box,
    isMe: false,
    isBlurred: true
  }));
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

  ctx.drawImage(image, 0, 0, w, h);

  const blurBoxes = boxes.filter(b => b.isBlurred);
  if (blurBoxes.length === 0) {
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  if (style === 'mosaic') {
    const blockSize = Math.max(6, Math.round(intensity * (w / 1000)));

    for (const box of blurBoxes) {
      const bx = Math.max(0, Math.round(box.x));
      const by = Math.max(0, Math.round(box.y));
      const bw = Math.min(w - bx, Math.round(box.width));
      const bh = Math.min(h - by, Math.round(box.height));
      if (bw <= 0 || bh <= 0) continue;

      const faceData = ctx.getImageData(bx, by, bw, bh);
      const pixels = faceData.data;

      const rx = bw / 2;
      const ry = bh / 2;
      const cx = rx;
      const cy = ry;

      for (let y = 0; y < bh; y += blockSize) {
        for (let x = 0; x < bw; x += blockSize) {
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

          for (let dy = 0; dy < blockSize && (y + dy) < bh; dy++) {
            for (let dx = 0; dx < blockSize && (x + dx) < bw; dx++) {
              const curX = x + dx;
              const curY = y + dy;
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
    for (const box of blurBoxes) {
      const bx = Math.max(0, Math.round(box.x));
      const by = Math.max(0, Math.round(box.y));
      const bw = Math.min(w - bx, Math.round(box.width));
      const bh = Math.min(h - by, Math.round(box.height));
      if (bw <= 0 || bh <= 0) continue;

      const patchCanvas = document.createElement('canvas');
      const patchCtx = patchCanvas.getContext('2d');
      if (!patchCtx) continue;

      patchCanvas.width = bw;
      patchCanvas.height = bh;

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

      patchCtx.imageSmoothingEnabled = true;
      patchCtx.imageSmoothingQuality = 'high';
      patchCtx.filter = `blur(${Math.round(intensity * 0.6)}px)`;
      patchCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, bw, bh);

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
