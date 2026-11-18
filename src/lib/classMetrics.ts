import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { ADMIN_EMAILS } from '../data/defaultActivities';

export const BASE_LECTURE_HOURS = 400;
export const BASE_STUDENTS = 320;

export interface LiveClassMetrics {
  totalHours: number;
  totalStudents: number;
  instructorAddedHours: number;
  instructorAddedStudents: number;
  startedClassesCount: number;
  startedClassStudents: number;
  startedClassHours: number;
}

export const DEFAULT_METRICS: LiveClassMetrics = {
  totalHours: BASE_LECTURE_HOURS,
  totalStudents: BASE_STUDENTS,
  instructorAddedHours: 0,
  instructorAddedStudents: 0,
  startedClassesCount: 0,
  startedClassStudents: 0,
  startedClassHours: 0
};

const CACHE_TTL_MS = 60_000;
const CLASS_METRICS_CACHE_KEY = 'dodaham-class-metrics-cache-v2';

let metricsMemoryCache: { value: LiveClassMetrics; cachedAt: number } | null = null;
let inflightMetrics: Promise<LiveClassMetrics> | null = null;

export function clearClassMetricsCache() {
  metricsMemoryCache = null;
  inflightMetrics = null;
  try {
    sessionStorage.removeItem(CLASS_METRICS_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function readStoredMetricsCache(): LiveClassMetrics | null {
  try {
    const raw = sessionStorage.getItem(CLASS_METRICS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: LiveClassMetrics; cachedAt?: number };
    if (parsed?.value && typeof parsed.cachedAt === 'number' && Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
      return parsed.value;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function writeMetricsCache(value: LiveClassMetrics) {
  const cachedAt = Date.now();
  metricsMemoryCache = { value, cachedAt };
  try {
    sessionStorage.setItem(CLASS_METRICS_CACHE_KEY, JSON.stringify({ value, cachedAt }));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Fetches approved partner instructors' self-reported stats (when showStats === true)
 * and actually started classes' enrolled students & hours, then adds them onto
 * the verified DO-DAHAM studio baseline (400시간 / 320명).
 * Cached for 60s in memory & sessionStorage to avoid redundant Firestore roundtrips.
 */
export async function fetchLiveClassMetrics(): Promise<LiveClassMetrics> {
  if (metricsMemoryCache && Date.now() - metricsMemoryCache.cachedAt < CACHE_TTL_MS) {
    return metricsMemoryCache.value;
  }

  const stored = readStoredMetricsCache();
  if (stored) {
    metricsMemoryCache = { value: stored, cachedAt: Date.now() };
    return stored;
  }

  if (inflightMetrics) {
    return inflightMetrics;
  }

  inflightMetrics = (async () => {
    let leadBaseHours = BASE_LECTURE_HOURS;
    let leadBaseStudents = BASE_STUDENTS;
    let instructorAddedHours = 0;
    let instructorAddedStudents = 0;
    let startedClassesCount = 0;
    let startedClassStudents = 0;
    let startedClassHours = 0;

    try {
      const [instResult, clsResult] = await Promise.allSettled([
        getDocs(query(collection(db, 'instructors'), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'classes'), where('started', '==', true)))
      ]);

      if (instResult.status === 'fulfilled') {
        instResult.value.forEach((docSnap) => {
          const d = docSnap.data();
          const isLead =
            ADMIN_EMAILS.includes(String(d.emailLower || '').trim().toLowerCase()) ||
            String(d.displayName || '').trim() === '심정보';
          const hrs = Number(d.lectureHours || 0);
          const std = Number(d.studentCount || 0);

          if (isLead) {
            if (d.showStats !== false) {
              leadBaseHours = hrs > 0 ? hrs : BASE_LECTURE_HOURS;
              leadBaseStudents = std > 0 ? std : BASE_STUDENTS;
            }
          } else if (d.showStats === true) {
            if (hrs > 0) instructorAddedHours += hrs;
            if (std > 0) instructorAddedStudents += std;
          }
        });
      }

      if (clsResult.status === 'fulfilled') {
        clsResult.value.forEach((docSnap) => {
          const d = docSnap.data();
          startedClassesCount += 1;
          const enrolled = Number(d.enrolledCount || 0);
          const sessions = Number(d.sessionCount || 0);
          const hoursPerSession = Number(d.hoursPerSession || 2);
          if (enrolled > 0) startedClassStudents += enrolled;
          if (sessions > 0 && hoursPerSession > 0) startedClassHours += sessions * hoursPerSession;
        });
      }
    } finally {
      inflightMetrics = null;
    }

    const result: LiveClassMetrics = {
      totalHours: leadBaseHours + instructorAddedHours + startedClassHours,
      totalStudents: leadBaseStudents + instructorAddedStudents + startedClassStudents,
      instructorAddedHours,
      instructorAddedStudents,
      startedClassesCount,
      startedClassStudents,
      startedClassHours
    };

    writeMetricsCache(result);
    return result;
  })();

  return inflightMetrics;
}
