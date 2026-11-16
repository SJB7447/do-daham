/**
 * Face Blur Engine & Privacy Protection Utilities
 * 100% Client-side on-device processing. No images or face data leave the browser.
 * Powered by Multi-Scale Tiled Google BlazeFace Neural Network + 6-Landmark Aligned Face Recognition.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as blazeface from '@tensorflow-models/blazeface';

export interface FaceBox {
  id: string;
  x: number; // Outer blur box X in original image coordinates
  y: number; // Outer blur box Y
  width: number;
  height: number;
  coreBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: number[][]; // 6 BlazeFace landmarks: [rightEye, leftEye, nose, mouth, rightEar, leftEar]
  isBlurred: boolean;
  isMe: boolean;
  confidence?: number;
  matchScore?: number;
  manual?: boolean;
  faceThumb?: string; // 64x64 Data URL crop of this specific face for quick UI selection
}

export type BlurStyle = 'soft' | 'mosaic';

export const ADMIN_FACE_STORAGE_KEY = 'DODAHAM_ADMIN_FACE_TEMPLATE_V3';

export interface FaceFeatureSample {
  aspectRatio: number;
  colorProfile: number[]; // 3-zone chromaticity & luminance profile (36 bins)
  featureVector: number[]; // 16x16 Z-score normalized inner-face luminance
  featureVectorFlipped: number[]; // Horizontally mirrored 16x16 luminance for pose invariance
  gradientVector: number[]; // 8x8x2 L2-normalized spatial edge gradients (lighting invariant)
  createdAt: number;
}

/**
 * Interface for saved admin face template (My Face Asset with Multi-Sample Bank)
 */
export interface AdminFaceTemplate {
  thumbnail?: string; // Small Data URL thumbnail for UI display
  aspectRatio: number;
  colorProfile: number[];
  featureVector: number[];
  featureVectorFlipped?: number[];
  gradientVector?: number[];
  samples?: FaceFeatureSample[]; // Up to 5 learned samples across different angles/lightings
  updatedAt: number;
}

let loadedBlazeModel: blazeface.BlazeFaceModel | null = null;
let modelLoadPromise: Promise<blazeface.BlazeFaceModel | null> | null = null;

/**
 * Initialize and get BlazeFace AI Model (singleton)
 */
async function getBlazeFaceModel(): Promise<blazeface.BlazeFaceModel | null> {
  if (loadedBlazeModel) return loadedBlazeModel;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      loadedBlazeModel = await blazeface.load({
        maxFaces: 35,
        iouThreshold: 0.3,
        scoreThreshold: 0.6
      });
      return loadedBlazeModel;
    } catch (err) {
      console.warn('BlazeFace WebGL init failed, attempting CPU fallback', err);
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        loadedBlazeModel = await blazeface.load({
          maxFaces: 35,
          iouThreshold: 0.3,
          scoreThreshold: 0.6
        });
        return loadedBlazeModel;
      } catch (cpuErr) {
        console.error('Failed to load BlazeFace AI model', cpuErr);
        return null;
      }
    }
  })();

  return modelLoadPromise;
}

/**
 * Get stored admin face template from localStorage
 */
export function getStoredAdminFaceTemplate(): AdminFaceTemplate | null {
  try {
    const raw = localStorage.getItem(ADMIN_FACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminFaceTemplate;
    if (!parsed || !parsed.featureVector || parsed.featureVector.length === 0) {
      return null;
    }
    return parsed;
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
 * Generate a 64x64 avatar thumbnail Data URL for a FaceBox
 */
export function createFaceThumbnail(image: HTMLImageElement, box: FaceBox): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const sx = Math.max(0, Math.round(box.x));
    const sy = Math.max(0, Math.round(box.y));
    const sw = Math.min(image.naturalWidth - sx, Math.max(1, Math.round(box.width)));
    const sh = Math.min(image.naturalHeight - sy, Math.max(1, Math.round(box.height)));

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, 64, 64);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return '';
  }
}

/**
 * Save an admin face template from a selected box (adds to Multi-Sample Bank)
 */
export function saveAdminFaceTemplate(
  image: HTMLImageElement,
  box: FaceBox,
  resetBank: boolean = false
): AdminFaceTemplate | null {
  try {
    const extracted = extractFaceProfile(image, box);
    if (!extracted) return null;

    const existing = resetBank ? null : getStoredAdminFaceTemplate();
    const newSample: FaceFeatureSample = {
      aspectRatio: extracted.aspectRatio,
      colorProfile: extracted.colorProfile,
      featureVector: extracted.featureVector,
      featureVectorFlipped: extracted.featureVectorFlipped || extracted.featureVector,
      gradientVector: extracted.gradientVector || [],
      createdAt: Date.now()
    };

    const prevSamples = existing?.samples || [];
    // Keep up to 5 most recent diverse samples
    const mergedSamples = [newSample, ...prevSamples].slice(0, 5);

    const updatedTemplate: AdminFaceTemplate = {
      ...extracted,
      samples: mergedSamples,
      updatedAt: Date.now()
    };

    localStorage.setItem(ADMIN_FACE_STORAGE_KEY, JSON.stringify(updatedTemplate));
    return updatedTemplate;
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
        // Detect without classifying against old template
        const rawBoxes = await detectRawFacesMultiScale(img);
        let targetBox: FaceBox;
        if (rawBoxes.length > 0) {
          // Pick the largest prominent face in the profile photo
          targetBox = rawBoxes.reduce((prev, curr) =>
            curr.width * curr.height > prev.width * prev.height ? curr : prev
          );
        } else {
          // Fallback: Use center 60% square of profile photo
          const size = Math.min(img.naturalWidth, img.naturalHeight) * 0.6;
          const cx = Math.round((img.naturalWidth - size) / 2);
          const cy = Math.round((img.naturalHeight - size) / 2);
          targetBox = {
            id: 'profile-crop',
            x: cx,
            y: cy,
            width: Math.round(size),
            height: Math.round(size),
            coreBox: {
              x: Math.round(cx + size * 0.1),
              y: Math.round(cy + size * 0.1),
              width: Math.round(size * 0.8),
              height: Math.round(size * 0.8)
            },
            isBlurred: false,
            isMe: true
          };
        }

        const template = saveAdminFaceTemplate(img, targetBox, true);
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
 * Compute tight inner-face core coordinates (strips background walls/clothing margin)
 */
function getInnerCoreRect(
  image: HTMLImageElement,
  box: FaceBox
): { x: number; y: number; width: number; height: number } {
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;

  // 1. If 6 landmarks exist, align tightly around eyes, nose, and mouth
  if (box.landmarks && box.landmarks.length >= 4) {
    const rEye = box.landmarks[0];
    const lEye = box.landmarks[1];
    const nose = box.landmarks[2];
    const mouth = box.landmarks[3];

    const eyeCenterX = (rEye[0] + lEye[0]) / 2;
    const eyeCenterY = (rEye[1] + lEye[1]) / 2;
    const eyeDist = Math.hypot(lEye[0] - rEye[0], lEye[1] - rEye[1]);
    const eyeToMouth = Math.max(eyeDist * 0.9, Math.hypot(mouth[0] - eyeCenterX, mouth[1] - eyeCenterY));

    const faceScale = Math.max(eyeDist * 2.3, eyeToMouth * 2.1);
    if (faceScale >= 12) {
      const centerX = (eyeCenterX * 0.55 + nose[0] * 0.25 + mouth[0] * 0.20);
      const centerY = (eyeCenterY * 0.45 + nose[1] * 0.30 + mouth[1] * 0.25);

      const x = Math.max(0, Math.min(imgW - 4, centerX - faceScale * 0.5));
      const y = Math.max(0, Math.min(imgH - 4, centerY - faceScale * 0.52));
      const width = Math.max(4, Math.min(imgW - x, faceScale));
      const height = Math.max(4, Math.min(imgH - y, faceScale * 1.08));
      return { x, y, width, height };
    }
  }

  // 2. If coreBox exists, inset slightly to focus on central facial features
  if (box.coreBox && box.coreBox.width > 8 && box.coreBox.height > 8) {
    const padX = box.coreBox.width * 0.06;
    const padY = box.coreBox.height * 0.06;
    const x = Math.max(0, box.coreBox.x + padX);
    const y = Math.max(0, box.coreBox.y + padY);
    const width = Math.max(4, Math.min(imgW - x, box.coreBox.width - padX * 2));
    const height = Math.max(4, Math.min(imgH - y, box.coreBox.height - padY * 2));
    return { x, y, width, height };
  }

  // 3. Fallback: inset outer blur box by 16% horizontally and vertically to remove background wall
  const insetX = box.width * 0.16;
  const insetY = box.height * 0.16;
  const x = Math.max(0, box.x + insetX);
  const y = Math.max(0, box.y + insetY);
  const width = Math.max(4, Math.min(imgW - x, box.width - insetX * 2));
  const height = Math.max(4, Math.min(imgH - y, box.height - insetY * 2));
  return { x, y, width, height };
}

/**
 * Extract landmark-aligned multi-feature descriptor from a FaceBox
 */
export function extractFaceProfile(image: HTMLImageElement, box: FaceBox): AdminFaceTemplate | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const core = getInnerCoreRect(image, box);
  if (core.width < 4 || core.height < 4) return null;

  canvas.width = 32;
  canvas.height = 32;

  // Apply head-roll rotation normalization if eye landmarks are available
  if (box.landmarks && box.landmarks.length >= 2) {
    const rEye = box.landmarks[0];
    const lEye = box.landmarks[1];
    const dx = lEye[0] - rEye[0];
    const dy = lEye[1] - rEye[1];
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angle) > 0.03 && Math.abs(angle) < 0.65) {
      ctx.save();
      ctx.translate(16, 16);
      ctx.rotate(-angle);
      ctx.drawImage(image, core.x, core.y, core.width, core.height, -16, -16, 32, 32);
      ctx.restore();
    } else {
      ctx.drawImage(image, core.x, core.y, core.width, core.height, 0, 0, 32, 32);
    }
  } else {
    ctx.drawImage(image, core.x, core.y, core.width, core.height, 0, 0, 32, 32);
  }

  const thumbnail = createFaceThumbnail(image, box) || canvas.toDataURL('image/jpeg', 0.85);
  const imgData = ctx.getImageData(0, 0, 32, 32).data;

  // 1. 3-Zone Chromaticity & Tone Histogram (Top: Hair/Forehead, Mid: Eyes/Cheeks, Bot: Mouth/Chin)
  // 12 bins per zone (4 Normalized R, 4 Normalized G, 4 Luminance) = 36 bins total
  const colorProfile = new Array(36).fill(0);
  const zoneCounts = [0, 0, 0];

  const gray32 = new Float32Array(32 * 32);

  for (let y = 0; y < 32; y++) {
    const zone = y < 11 ? 0 : y < 22 ? 1 : 2;
    for (let x = 0; x < 32; x++) {
      // Elliptical mask to ignore outer corners
      const nx = (x - 15.5) / 15.5;
      const ny = (y - 15.5) / 15.5;
      if (nx * nx + ny * ny > 1.15) continue;

      const idx = (y * 32 + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      gray32[y * 32 + x] = luma;

      const sumRGB = r + g + b + 1;
      // Normalized r and g typically lie in [0.15, 0.55]
      const nr = Math.max(0, Math.min(3, Math.floor(((r / sumRGB) - 0.18) / 0.10)));
      const ng = Math.max(0, Math.min(3, Math.floor(((g / sumRGB) - 0.18) / 0.10)));
      const nl = Math.max(0, Math.min(3, Math.floor(luma / 64)));

      const base = zone * 12;
      colorProfile[base + nr]++;
      colorProfile[base + 4 + ng]++;
      colorProfile[base + 8 + nl]++;
      zoneCounts[zone]++;
    }
  }

  for (let z = 0; z < 3; z++) {
    const denom = Math.max(1, zoneCounts[z]);
    for (let k = 0; k < 12; k++) {
      colorProfile[z * 12 + k] /= denom;
    }
  }

  // 2. 16x16 Z-Score Normalized Luminance Vector + Horizontally Flipped Vector
  const raw16 = new Array(256).fill(0);
  let sum16 = 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const g00 = gray32[(y * 2) * 32 + (x * 2)];
      const g01 = gray32[(y * 2) * 32 + (x * 2 + 1)];
      const g10 = gray32[(y * 2 + 1) * 32 + (x * 2)];
      const g11 = gray32[(y * 2 + 1) * 32 + (x * 2 + 1)];
      const val = (g00 + g01 + g10 + g11) * 0.25;
      raw16[y * 16 + x] = val;
      sum16 += val;
    }
  }

  const mean16 = sum16 / 256;
  let varSum = 0;
  for (let i = 0; i < 256; i++) {
    varSum += (raw16[i] - mean16) ** 2;
  }
  const std16 = Math.sqrt(varSum / 256) || 1;
  const featureVector = raw16.map(v => (v - mean16) / std16);

  const featureVectorFlipped = new Array(256);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      featureVectorFlipped[y * 16 + x] = featureVector[y * 16 + (15 - x)];
    }
  }

  // 3. 8x8x2 Spatial Edge Gradient Descriptor (Lighting-invariant structure)
  const gradientVector = new Array(128).fill(0);
  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      let gxSum = 0;
      let gySum = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          const py = Math.min(30, Math.max(1, cy * 4 + dy));
          const px = Math.min(30, Math.max(1, cx * 4 + dx));
          const gx = Math.abs(gray32[py * 32 + (px + 1)] - gray32[py * 32 + (px - 1)]);
          const gy = Math.abs(gray32[(py + 1) * 32 + px] - gray32[(py - 1) * 32 + px]);
          gxSum += gx;
          gySum += gy;
        }
      }
      const cellIdx = (cy * 8 + cx) * 2;
      gradientVector[cellIdx] = gxSum / 16;
      gradientVector[cellIdx + 1] = gySum / 16;
    }
  }

  let gradNorm = 0;
  for (let i = 0; i < gradientVector.length; i++) {
    gradNorm += gradientVector[i] * gradientVector[i];
  }
  gradNorm = Math.sqrt(gradNorm) || 1;
  for (let i = 0; i < gradientVector.length; i++) {
    gradientVector[i] /= gradNorm;
  }

  const aspectRatio = core.width / (core.height || 1);

  return {
    thumbnail,
    aspectRatio,
    colorProfile,
    featureVector,
    featureVectorFlipped,
    gradientVector,
    updatedAt: Date.now()
  };
}

/**
 * Compare a single face sample against a candidate profile
 */
function compareSingleSample(
  sample: {
    aspectRatio: number;
    colorProfile: number[];
    featureVector: number[];
    featureVectorFlipped?: number[];
    gradientVector?: number[];
  },
  candidate: AdminFaceTemplate
): number {
  // 1. Z-Score Luminance Correlation (Pose-tolerant via normal + flipped max)
  let lumSim = 0;
  if (
    sample.featureVector &&
    candidate.featureVector &&
    sample.featureVector.length === candidate.featureVector.length
  ) {
    const n = sample.featureVector.length;
    let dotNormal = 0;
    let dotFlipped = 0;
    const candFlip = candidate.featureVectorFlipped || candidate.featureVector;

    for (let i = 0; i < n; i++) {
      dotNormal += sample.featureVector[i] * candidate.featureVector[i];
      dotFlipped += sample.featureVector[i] * candFlip[i];
    }
    const corrNormal = dotNormal / n;
    const corrFlipped = dotFlipped / n;
    const bestCorr = Math.max(corrNormal, corrFlipped * 0.96);
    // Map correlation [-0.2 .. 1.0] -> [0 .. 1]
    lumSim = Math.max(0, Math.min(1, (bestCorr + 0.15) / 1.15));
  }

  // 2. Spatial Gradient Cosine Similarity (Lighting-invariant facial structure)
  let gradSim = lumSim;
  if (
    sample.gradientVector &&
    candidate.gradientVector &&
    sample.gradientVector.length === candidate.gradientVector.length &&
    sample.gradientVector.length > 0
  ) {
    let dotGrad = 0;
    for (let i = 0; i < sample.gradientVector.length; i++) {
      dotGrad += sample.gradientVector[i] * candidate.gradientVector[i];
    }
    // Since gradient magnitudes are non-negative, baseline random dot product is ~0.55
    gradSim = Math.max(0, Math.min(1, (dotGrad - 0.45) / 0.55));
  }

  // 3. 3-Zone Chromaticity Bhattacharyya Similarity
  let colorSim = 0.5;
  if (
    sample.colorProfile &&
    candidate.colorProfile &&
    sample.colorProfile.length === candidate.colorProfile.length
  ) {
    let bhatt = 0;
    for (let i = 0; i < sample.colorProfile.length; i++) {
      bhatt += Math.sqrt(Math.max(0, sample.colorProfile[i] * candidate.colorProfile[i]));
    }
    // Sum of 3 zones * 3 histograms (nr, ng, nl) = max 9.0
    const normalizedBhatt = bhatt / 9.0;
    colorSim = Math.max(0, Math.min(1, (normalizedBhatt - 0.45) / 0.55));
  }

  return lumSim * 0.45 + gradSim * 0.35 + colorSim * 0.20;
}

/**
 * Compare stored AdminFaceTemplate (including its multi-sample bank) with a candidate face
 */
export function compareFaceProfiles(template: AdminFaceTemplate, candidate: AdminFaceTemplate): number {
  let maxScore = compareSingleSample(template, candidate);

  if (template.samples && template.samples.length > 0) {
    for (const sample of template.samples) {
      const sScore = compareSingleSample(sample, candidate);
      if (sScore > maxScore) {
        maxScore = sScore;
      }
    }
  }

  return maxScore;
}

export interface DetectionOptions {
  filterBackView?: boolean;
  strictMode?: boolean;
}

/**
 * Verify that a detected candidate box is a genuine front/side human face
 * and NOT a flat wall, ceiling speaker, monitor, or back-of-head (뒷모습).
 */
function verifyHumanFaceCandidate(
  image: HTMLImageElement,
  coreX: number,
  coreY: number,
  coreW: number,
  coreH: number,
  landmarks?: number[][]
): boolean {
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;

  if (coreW < 14 || coreH < 14) return false;
  const aspect = coreW / coreH;
  if (aspect < 0.48 || aspect > 1.75) return false;

  // 1. Anatomical landmark geometry verification
  if (landmarks && landmarks.length >= 4) {
    const rEye = landmarks[0];
    const lEye = landmarks[1];
    const nose = landmarks[2];
    const mouth = landmarks[3];

    const eyeMidY = (rEye[1] + lEye[1]) / 2;
    const eyeDist = Math.hypot(lEye[0] - rEye[0], lEye[1] - rEye[1]);

    // Eyes must be above mouth
    if (mouth[1] <= eyeMidY + coreH * 0.05) return false;
    // Nose must not be far above eyes or below mouth
    if (nose[1] < eyeMidY - coreH * 0.12 || nose[1] > mouth[1] + coreH * 0.08) return false;
    // Eye distance must be anatomically plausible
    if (eyeDist < coreW * 0.08 || eyeDist > coreW * 0.92) return false;
    // Head tilt check (reject upside-down/extreme false positives)
    const eyeTilt = Math.abs(Math.atan2(lEye[1] - rEye[1], Math.abs(lEye[0] - rEye[0]) + 0.001));
    if (eyeTilt > 0.85) return false;
  }

  // 2. Visual pixel verification (reject flat walls, speakers, and back-of-head hair)
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    const sx = Math.max(0, Math.min(imgW - 2, Math.round(coreX)));
    const sy = Math.max(0, Math.min(imgH - 2, Math.round(coreY)));
    const sw = Math.max(2, Math.min(imgW - sx, Math.round(coreW)));
    const sh = Math.max(2, Math.min(imgH - sy, Math.round(coreH)));

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, 24, 24);
    const data = ctx.getImageData(0, 0, 24, 24).data;

    let lumaSum = 0;
    const lumas = new Float32Array(24 * 24);
    let darkHairPixels = 0;
    let skinTonePixels = 0;

    for (let i = 0; i < 24 * 24; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      lumas[i] = y;
      lumaSum += y;

      if (y < 48) {
        darkHairPixels++;
      }

      // YCbCr + RGB skin/warm facial tone check
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (y > 45 && y < 245 && cr >= 130 && cr <= 180 && cb >= 75 && cb <= 135 && r > b) {
        skinTonePixels++;
      }
    }

    const total = 24 * 24;
    const meanLuma = lumaSum / total;
    let varSum = 0;
    for (let i = 0; i < total; i++) {
      varSum += (lumas[i] - meanLuma) ** 2;
    }
    const stdLuma = Math.sqrt(varSum / total);

    // Flat wall / solid color screen check
    if (stdLuma < 9.5) return false;

    // Back-of-head (뒷모습) check: overwhelmingly dark hair with almost no skin tone
    const darkRatio = darkHairPixels / total;
    const skinRatio = skinTonePixels / total;
    if (darkRatio > 0.72 && skinRatio < 0.08) return false;
  } catch {
    // Ignore canvas errors
  }

  return true;
}

/**
 * Multi-scale tiled BlazeFace detector (without template classification)
 */
async function detectRawFacesMultiScale(image: HTMLImageElement): Promise<FaceBox[]> {
  let rawDetections: FaceBox[] = [];
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;
  if (imgW <= 0 || imgH <= 0) return [];

  try {
    const model = await getBlazeFaceModel();
    if (model) {
      // Build multi-scale tiles:
      // Tile 0: Full image (catches close/medium faces)
      // Sub-tiles: Overlapping regions so smaller/distant faces in lecture halls aren't crushed into 4px in 128x128
      interface ScanTile {
        x: number;
        y: number;
        w: number;
        h: number;
        minProb: number;
        isSubTile: boolean;
      }

      const tiles: ScanTile[] = [
        { x: 0, y: 0, w: imgW, h: imgH, minProb: 0.55, isSubTile: false }
      ];

      if (imgW >= 480 && imgH >= 320) {
        // 2x2 overlapping quadrants + center region
        tiles.push(
          { x: 0, y: 0, w: imgW * 0.62, h: imgH * 0.65, minProb: 0.68, isSubTile: true },
          { x: imgW * 0.38, y: 0, w: imgW * 0.62, h: imgH * 0.65, minProb: 0.68, isSubTile: true },
          { x: 0, y: imgH * 0.32, w: imgW * 0.62, h: imgH * 0.68, minProb: 0.66, isSubTile: true },
          { x: imgW * 0.38, y: imgH * 0.32, w: imgW * 0.62, h: imgH * 0.68, minProb: 0.66, isSubTile: true },
          { x: imgW * 0.18, y: imgH * 0.14, w: imgW * 0.64, h: imgH * 0.72, minProb: 0.66, isSubTile: true }
        );

        // 3 horizontal mid/lower bands where podium instructors and seated attendees are located
        tiles.push(
          { x: 0, y: imgH * 0.18, w: imgW * 0.44, h: imgH * 0.66, minProb: 0.70, isSubTile: true },
          { x: imgW * 0.28, y: imgH * 0.18, w: imgW * 0.44, h: imgH * 0.66, minProb: 0.70, isSubTile: true },
          { x: imgW * 0.56, y: imgH * 0.18, w: imgW * 0.44, h: imgH * 0.66, minProb: 0.70, isSubTile: true }
        );
      }

      const tileCanvas = document.createElement('canvas');
      const tileCtx = tileCanvas.getContext('2d');

      for (let tIdx = 0; tIdx < tiles.length; tIdx++) {
        const tile = tiles[tIdx];
        const maxTileDim = 640;
        const scale = Math.min(1, maxTileDim / Math.max(tile.w, tile.h));
        const cw = Math.max(32, Math.round(tile.w * scale));
        const ch = Math.max(32, Math.round(tile.h * scale));

        if (!tileCtx) continue;
        tileCanvas.width = cw;
        tileCanvas.height = ch;
        tileCtx.clearRect(0, 0, cw, ch);
        tileCtx.drawImage(image, tile.x, tile.y, tile.w, tile.h, 0, 0, cw, ch);

        const predictions = await model.estimateFaces(tileCanvas, false);
        if (!predictions || predictions.length === 0) continue;

        for (let pIdx = 0; pIdx < predictions.length; pIdx++) {
          const pred: any = predictions[pIdx];
          const prob = Number(Array.isArray(pred.probability) ? pred.probability[0] : (pred.probability ?? 0.9));
          if (prob < tile.minProb) continue;

          const tl = pred.topLeft as [number, number];
          const br = pred.bottomRight as [number, number];

          // Reject detections clipped right on an internal sub-tile cut edge
          if (tile.isSubTile) {
            const nearLeftEdge = tile.x > 5 && tl[0] < cw * 0.03;
            const nearRightEdge = tile.x + tile.w < imgW - 5 && br[0] > cw * 0.97;
            const nearTopEdge = tile.y > 5 && tl[1] < ch * 0.03;
            const nearBotEdge = tile.y + tile.h < imgH - 5 && br[1] > ch * 0.97;
            if (nearLeftEdge || nearRightEdge || nearTopEdge || nearBotEdge) continue;
          }

          const rawX = tile.x + tl[0] / scale;
          const rawY = tile.y + tl[1] / scale;
          const rawW = (br[0] - tl[0]) / scale;
          const rawH = (br[1] - tl[1]) / scale;

          // Map 6 landmarks to original image coordinates
          let mappedLandmarks: number[][] | undefined;
          if (Array.isArray(pred.landmarks) && pred.landmarks.length >= 4) {
            mappedLandmarks = pred.landmarks.map((pt: number[]) => [
              tile.x + pt[0] / scale,
              tile.y + pt[1] / scale
            ]);
          }

          if (!verifyHumanFaceCandidate(image, rawX, rawY, rawW, rawH, mappedLandmarks)) {
            continue;
          }

          // Outer box with natural margin to cover full head for privacy blur
          const marginW = rawW * 0.16;
          const marginH = rawH * 0.20;
          const x = Math.max(0, rawX - marginW);
          const y = Math.max(0, rawY - marginH * 0.75);
          const width = Math.min(imgW - x, rawW + marginW * 2);
          const height = Math.min(imgH - y, rawH + marginH * 1.75);

          rawDetections.push({
            id: `face-blaze-${tIdx}-${pIdx}-${Date.now()}`,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            coreBox: {
              x: Math.round(Math.max(0, rawX)),
              y: Math.round(Math.max(0, rawY)),
              width: Math.round(Math.min(imgW, rawW)),
              height: Math.round(Math.min(imgH, rawH))
            },
            landmarks: mappedLandmarks,
            isBlurred: true,
            isMe: false,
            confidence: tile.isSubTile ? prob * 0.98 : prob
          });
        }
      }
    }
  } catch (err) {
    console.warn('BlazeFace multi-scale detection error, checking native fallback', err);
  }

  // Fallback: Native window.FaceDetector if BlazeFace found nothing
  if (rawDetections.length === 0 && typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({
        fastMode: false,
        maxDetectedFaces: 35
      });
      const faces = await detector.detect(image);
      if (faces && faces.length > 0) {
        for (let idx = 0; idx < faces.length; idx++) {
          const bb = faces[idx].boundingBox;
          if (!verifyHumanFaceCandidate(image, bb.x, bb.y, bb.width, bb.height)) continue;

          const marginW = bb.width * 0.14;
          const marginH = bb.height * 0.16;
          const x = Math.max(0, bb.x - marginW);
          const y = Math.max(0, bb.y - marginH);
          const width = Math.min(imgW - x, bb.width + marginW * 2);
          const height = Math.min(imgH - y, bb.height + marginH * 2);

          rawDetections.push({
            id: `face-native-${idx}-${Date.now()}`,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            coreBox: {
              x: Math.round(bb.x),
              y: Math.round(bb.y),
              width: Math.round(bb.width),
              height: Math.round(bb.height)
            },
            isBlurred: true,
            isMe: false,
            confidence: 0.90
          });
        }
      }
    } catch (err) {
      console.warn('Native FaceDetector fallback failed', err);
    }
  }

  return filterOverlappingBoxes(rawDetections);
}

/**
 * Primary Face Detection & Recognition Pipeline
 */
export async function detectFaces(
  image: HTMLImageElement,
  _options: DetectionOptions = { filterBackView: true, strictMode: true }
): Promise<FaceBox[]> {
  let boxes = await detectRawFacesMultiScale(image);

  // Attach face thumbnails for UI avatar selector and sort left-to-right
  boxes.sort((a, b) => a.x - b.x);
  boxes = boxes.map((box, idx) => ({
    ...box,
    id: `face-${idx}-${Date.now()}`,
    faceThumb: createFaceThumbnail(image, box)
  }));

  // Classify who is "Me (Admin)" vs "Others (Blurred)"
  boxes = classifyFacesWithTemplate(image, boxes);

  return boxes;
}

/**
 * Targeted local face detection around a clicked point (x, y) when user uses "Pick Me" on an undetected face
 */
export async function detectFaceAtPoint(
  image: HTMLImageElement,
  clickX: number,
  clickY: number
): Promise<FaceBox | null> {
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;

  try {
    const model = await getBlazeFaceModel();
    if (model) {
      const cropSize = Math.round(Math.min(imgW, imgH) * 0.36);
      const tx = Math.max(0, Math.min(imgW - cropSize, Math.round(clickX - cropSize / 2)));
      const ty = Math.max(0, Math.min(imgH - cropSize, Math.round(clickY - cropSize / 2)));
      const tw = Math.min(imgW - tx, cropSize);
      const th = Math.min(imgH - ty, cropSize);

      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 384;
      const ctx = canvas.getContext('2d');
      if (ctx && tw > 20 && th > 20) {
        const scaleX = 384 / tw;
        const scaleY = 384 / th;
        ctx.drawImage(image, tx, ty, tw, th, 0, 0, 384, 384);
        const preds = await model.estimateFaces(canvas, false);
        if (preds && preds.length > 0) {
          let bestPred: any = null;
          let minDist = Infinity;

          for (const pred of preds) {
            const tl = pred.topLeft as [number, number];
            const br = pred.bottomRight as [number, number];
            const rx = tx + tl[0] / scaleX;
            const ry = ty + tl[1] / scaleY;
            const rw = (br[0] - tl[0]) / scaleX;
            const rh = (br[1] - tl[1]) / scaleY;
            const cx = rx + rw / 2;
            const cy = ry + rh / 2;
            const d = Math.hypot(clickX - cx, clickY - cy);
            if (d < minDist && d < Math.max(rw, rh) * 1.2) {
              minDist = d;
              bestPred = { rx, ry, rw, rh, landmarks: pred.landmarks };
            }
          }

          if (bestPred) {
            const { rx, ry, rw, rh, landmarks } = bestPred;
            const marginW = rw * 0.16;
            const marginH = rh * 0.20;
            const x = Math.max(0, rx - marginW);
            const y = Math.max(0, ry - marginH * 0.75);
            const width = Math.min(imgW - x, rw + marginW * 2);
            const height = Math.min(imgH - y, rh + marginH * 1.75);

            const mappedLandmarks = Array.isArray(landmarks)
              ? landmarks.map((pt: number[]) => [tx + pt[0] / scaleX, ty + pt[1] / scaleY])
              : undefined;

            const box: FaceBox = {
              id: `manual-me-${Date.now()}`,
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(width),
              height: Math.round(height),
              coreBox: {
                x: Math.round(rx),
                y: Math.round(ry),
                width: Math.round(rw),
                height: Math.round(rh)
              },
              landmarks: mappedLandmarks,
              isBlurred: false,
              isMe: true,
              manual: true,
              confidence: 0.99
            };
            box.faceThumb = createFaceThumbnail(image, box);
            return box;
          }
        }
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback manual box centered at click point
  const boxSize = Math.max(44, Math.round(Math.min(imgW, imgH) * 0.09));
  const x = Math.max(0, Math.min(imgW - boxSize, Math.round(clickX - boxSize / 2)));
  const y = Math.max(0, Math.min(imgH - boxSize, Math.round(clickY - boxSize / 2)));
  const width = Math.min(imgW - x, boxSize);
  const height = Math.min(imgH - y, Math.round(boxSize * 1.18));

  const fallbackBox: FaceBox = {
    id: `manual-me-${Date.now()}`,
    x,
    y,
    width,
    height,
    coreBox: {
      x: Math.round(x + width * 0.12),
      y: Math.round(y + height * 0.12),
      width: Math.round(width * 0.76),
      height: Math.round(height * 0.76)
    },
    isBlurred: false,
    isMe: true,
    manual: true
  };
  fallbackBox.faceThumb = createFaceThumbnail(image, fallbackBox);
  return fallbackBox;
}

/**
 * Non-Maximum Suppression (NMS) to deduplicate overlapping boxes across multi-scale tiles
 */
function filterOverlappingBoxes(boxes: FaceBox[]): FaceBox[] {
  const sorted = [...boxes].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const result: FaceBox[] = [];

  for (const box of sorted) {
    const isDuplicate = result.some(existing => {
      const xOverlap = Math.max(0, Math.min(box.x + box.width, existing.x + existing.width) - Math.max(box.x, existing.x));
      const yOverlap = Math.max(0, Math.min(box.y + box.height, existing.y + existing.height) - Math.max(box.y, existing.y));
      const overlapArea = xOverlap * yOverlap;
      if (overlapArea <= 0) return false;

      const areaA = box.width * box.height;
      const areaB = existing.width * existing.height;
      const minArea = Math.min(areaA, areaB);
      const unionArea = areaA + areaB - overlapArea;

      const iou = overlapArea / unionArea;
      const containment = overlapArea / minArea;

      return iou > 0.32 || containment > 0.52;
    });

    if (!isDuplicate) {
      result.push(box);
    }
  }

  return result;
}

/**
 * Classify which face is "Me (Admin)" vs "Others" using stored multi-sample template
 */
export function classifyFacesWithTemplate(
  image: HTMLImageElement,
  boxes: FaceBox[],
  forceMatchBest: boolean = false
): FaceBox[] {
  if (boxes.length === 0) return boxes;

  const template = getStoredAdminFaceTemplate();

  // Compute similarity scores for all boxes if template exists
  let bestMeIdx = -1;
  let bestScore = -1;
  const scores: number[] = new Array(boxes.length).fill(0);

  if (template) {
    boxes.forEach((box, idx) => {
      const prof = extractFaceProfile(image, box);
      if (prof) {
        const score = compareFaceProfiles(template, prof);
        scores[idx] = score;
        if (score > bestScore) {
          bestScore = score;
          bestMeIdx = idx;
        }
      }
    });
  }

  // Threshold: 0.47 for automatic matching, or 0.35 if user explicitly pressed "나 제외 블러" (forceMatchBest)
  const threshold = forceMatchBest ? 0.35 : 0.47;

  if (template && bestMeIdx !== -1 && bestScore >= threshold) {
    return boxes.map((box, idx) => {
      const isMe = idx === bestMeIdx;
      return {
        ...box,
        faceThumb: box.faceThumb || createFaceThumbnail(image, box),
        matchScore: scores[idx],
        isMe,
        isBlurred: !isMe // Preserve Me, blur all others
      };
    });
  }

  // Otherwise, blur all detected faces by default to protect portrait rights
  return boxes.map((box, idx) => ({
    ...box,
    faceThumb: box.faceThumb || createFaceThumbnail(image, box),
    matchScore: scores[idx],
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

  // Strictly never blur a box marked as isMe unless user explicitly toggled isBlurred = true
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
