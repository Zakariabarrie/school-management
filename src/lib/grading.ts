import { DEFAULT_GRADES } from '../data/school';
import type { GradeBand } from '../types';

export function gradeFor(score: number, bands: GradeBand[]): GradeBand {
  const source = bands.length > 0 ? bands : DEFAULT_GRADES;
  const sorted = [...source].sort((a, b) => b.min - a.min);
  const match = sorted.find((band) => score >= band.min);
  return match ?? sorted[sorted.length - 1];
}

export function gradeRange(band: GradeBand, bands: GradeBand[]): string {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const index = sorted.findIndex((item) => item.grade === band.grade);
  if (index <= 0) return `${band.min}–100`;
  return `${band.min}–${sorted[index - 1].min - 1}`;
}

export function teacherComment(firstName: string, grade: string): string {
  switch (grade) {
    case 'A':
      return `${firstName} has worked with consistency and shows a secure command of this term's work. This standard should be maintained.`;
    case 'B':
      return `${firstName} has a sound grasp of most topics. With steadier revision, the next grade boundary is within reach.`;
    case 'C':
      return `${firstName} meets the main demands of the course. More regular practice will make the work more secure.`;
    case 'D':
      return `${firstName} has reached a pass standard. Extra support and daily practice are needed before the next examination.`;
    default:
      return `${firstName} has not yet reached a pass standard. A clear support plan should be agreed with the parent or guardian.`;
  }
}

export function principalComment(firstName: string, grade: string): string {
  switch (grade) {
    case 'A':
      return `I commend ${firstName} for an excellent term. Continue to lead by example in conduct and study.`;
    case 'B':
      return `${firstName} has had a good term. I encourage greater consistency across every subject.`;
    case 'C':
      return `${firstName} is making progress. I expect closer attention to classwork and homework next term.`;
    case 'D':
      return `${firstName} is advised to attend support lessons and to keep a regular study timetable.`;
    default:
      return `The school will meet the parent or guardian of ${firstName} to agree how the next term can be used more effectively.`;
  }
}
