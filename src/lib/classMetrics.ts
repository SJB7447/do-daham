import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

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

/**
 * Fetches approved partner instructors' self-reported stats (when showStats === true)
 * and actually started classes' enrolled students & hours, then adds them onto
 * the verified DO-DAHAM studio baseline (400시간 / 320명).
 */
export async function fetchLiveClassMetrics(): Promise<LiveClassMetrics> {
  let instructorAddedHours = 0;
  let instructorAddedStudents = 0;
  let startedClassesCount = 0;
  let startedClassStudents = 0;
  let startedClassHours = 0;

  try {
    const instSnap = await getDocs(
      query(collection(db, 'instructors'), where('status', '==', 'approved'))
    );
    instSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.showStats === true) {
        const hrs = Number(d.lectureHours || 0);
        const std = Number(d.studentCount || 0);
        if (hrs > 0) instructorAddedHours += hrs;
        if (std > 0) instructorAddedStudents += std;
      }
    });
  } catch {
    // Fallback gracefully if Firestore rules/network unavailable
  }

  try {
    const clsSnap = await getDocs(
      query(collection(db, 'classes'), where('started', '==', true))
    );
    clsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      startedClassesCount += 1;
      const enrolled = Number(d.enrolledCount || 0);
      const sessions = Number(d.sessionCount || 0);
      const hoursPerSession = Number(d.hoursPerSession || 2);
      if (enrolled > 0) startedClassStudents += enrolled;
      if (sessions > 0 && hoursPerSession > 0) startedClassHours += sessions * hoursPerSession;
    });
  } catch {
    // Fallback gracefully
  }

  return {
    totalHours: BASE_LECTURE_HOURS + instructorAddedHours + startedClassHours,
    totalStudents: BASE_STUDENTS + instructorAddedStudents + startedClassStudents,
    instructorAddedHours,
    instructorAddedStudents,
    startedClassesCount,
    startedClassStudents,
    startedClassHours
  };
}
