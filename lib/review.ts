export type ReviewGrade = "again" | "hard" | "good" | "easy";

export function computeNextReview(current: any, grade: ReviewGrade) {
  const now = new Date();
  const reps = Number(current?.repetitions || 0);
  const oldInterval = Number(current?.intervalDays || 0);
  let intervalDays = 0;
  let lapses = Number(current?.lapses || 0);
  let next = new Date(now);

  if (grade === "again") {
    lapses += 1;
    next = new Date(now.getTime() + 10 * 60 * 1000);
  } else if (grade === "hard") {
    intervalDays = Math.max(1, Math.round(oldInterval * 1.25) || 1);
    next.setDate(next.getDate() + intervalDays);
  } else if (grade === "good") {
    const ladder = [1, 3, 7, 14, 30, 60, 120];
    intervalDays = oldInterval > 0 ? Math.max(oldInterval + 1, Math.round(oldInterval * 2.1)) : ladder[Math.min(reps, ladder.length - 1)];
    next.setDate(next.getDate() + intervalDays);
  } else {
    intervalDays = oldInterval > 0 ? Math.max(4, Math.round(oldInterval * 3.0)) : 4;
    next.setDate(next.getDate() + intervalDays);
  }

  return {
    nextReviewAt: next,
    lastReviewedAt: now,
    repetitions: reps + 1,
    lapses,
    intervalDays,
    lastGrade: grade,
  };
}
