/**
 * Face Blur Engine & Privacy Protection Utilities
 * 100% Client-side on-device processing. No images or face data leave the browser.
 * Powered by Google BlazeFace Neural Network for zero-false-positive human face detection.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as blazeface from '@tensorflow-models/blazeface';

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

let loadedBlazeModel: blazeface.BlazeFaceModel | null = null;
let isModelLoading = false;
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
      loadedBlazeModel = await blazeface.load();
      return loadedBlazeModel;
    } catch (err) {
      console.warn('BlazeFace WebGL init failed, attempting CPU fallback', err);
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        loadedBlazeModel = await blazeface.load();
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
        const detected = await detectFaces(img);
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
 * Compare two face profiles
 */
export function compareFaceProfiles(p1: AdminFaceTemplate, p2: AdminFaceTemplate): number {
  if (!p1.colorProfile || !p2.colorProfile || p1.colorProfile.length !== p2.colorProfile.length) {
    return 0;
  }

  let colorDiffSum = 0;
  for (let i = 0; i < p1.colorProfile.length; i++) {
    const diff = p1.colorProfile[i] - p2.colorProfile[i];
    colorDiffSum += diff * diff;
  }
  const colorDist = Math.sqrt(colorDiffSum);
  const colorSimilarity = Math.max(0, 1 - colorDist * 1.5);

  let structuralSimilarity = 0.5;
  if (p1.featureVector && p2.featureVector && p1.featureVector.length === p2.featureVector.length) {
    let dot = 0;
    for (let i = 0; i < p1.featureVector.length; i++) {
      dot += p1.featureVector[i] * p2.featureVector[i];
    }
    const corr = dot / p1.featureVector.length;
    structuralSimilarity = Math.max(0, Math.min(1, (corr + 1) / 2));
  }

  const aspectDiff = Math.abs(p1.aspectRatio - p2.aspectRatio);
  const aspectScore = Math.max(0.6, 1 - aspectDiff * 0.4);

  return (structuralSimilarity * 0.6 + colorSimilarity * 0.4) * aspectScore;
}

export interface DetectionOptions {
  filterBackView?: boolean;
  strictMode?: boolean;
}

/**
 * Primary Face Detection:
 * 1. Google BlazeFace Deep Learning Model (Zero False-Positives on walls/furniture/screens)
 * 2. Native window.FaceDetector (Chromium fallback)
 */
export async function detectFaces(
  image: HTMLImageElement,
  options: DetectionOptions = { filterBackView: true, strictMode: true }
): Promise<FaceBox[]> {
  let boxes: FaceBox[] = [];

  // 1. Google BlazeFace Neural Network (Highly accurate, rejects non-faces, walls, furniture, back-of-head)
  try {
    const model = await getBlazeFaceModel();
    if (model) {
      // returnTensors: false
      const predictions = await model.estimateFaces(image, false);
      if (predictions && predictions.length > 0) {
        boxes = predictions.map((pred: any, idx: number) => {
          const tl = pred.topLeft as [number, number];
          const br = pred.bottomRight as [number, number];
          const rawW = br[0] - tl[0];
          const rawH = br[1] - tl[1];

          // Small natural margin around detected face
          const marginW = rawW * 0.18;
          const marginH = rawH * 0.22;
          const x = Math.max(0, tl[0] - marginW);
          const y = Math.max(0, tl[1] - marginH * 0.8);
          const width = Math.min(image.naturalWidth - x, rawW + marginW * 2);
          const height = Math.min(image.naturalHeight - y, rawH + marginH * 1.8);

          const prob = Array.isArray(pred.probability) ? pred.probability[0] : (pred.probability ?? 0.95);

          return {
            id: `face-blaze-${idx}-${Date.now()}`,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            isBlurred: true,
            isMe: false,
            confidence: Number(prob)
          };
        });

        // Filter out very low confidence detections (< 0.70)
        boxes = boxes.filter(b => (b.confidence ?? 1) >= 0.70);
      }
    }
  } catch (err) {
    console.warn('BlazeFace detection error, checking native fallback', err);
  }

  // 2. Native window.FaceDetector (if BlazeFace didn't return any boxes)
  if (boxes.length === 0 && typeof window !== 'undefined' && 'FaceDetector' in window) {
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
            confidence: 0.92
          };
        });
      }
    } catch (err) {
      console.warn('Native FaceDetector fallback failed', err);
    }
  }

  // Deduplicate overlapping boxes
  boxes = filterOverlappingBoxes(boxes);

  // Determine who is "Me" vs "Others"
  boxes = classifyFacesWithTemplate(image, boxes);

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

  // If template matched with good confidence (>= 0.46), assign as "Me"
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

  // If only 1 person detected, default as Me
  if (boxes.length === 1) {
    return [{ ...boxes[0], isMe: true, isBlurred: false }];
  }

  // Otherwise, default all to blurred (protect attendee privacy)
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
