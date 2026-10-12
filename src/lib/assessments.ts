import { gradeFor } from './grading';
import type {
  AssessmentCategory,
  AssessmentKind,
  AssessmentMark,
  CalculationMethod,
  GradeBand,
  TermName,
} from '../types';

export interface SchemeSettings {
  assessments: AssessmentCategory[];
  grades: GradeBand[];
  calculationMethod: CalculationMethod;
  passMark: number;
}

export interface ComponentScore {
  categoryId: string;
  name: string;
  kind: AssessmentKind;
  maxMarks: number;
  weight: number;
  required: boolean;
  score: number | null;
}

export type ResultStatus = 'Incomplete' | 'Pass' | 'Fail';

export interface SubjectTermResult {
  subject: string;
  components: ComponentScore[];
  obtained: number | null;
  available: number | null;
  percentage: number | null;
  band: GradeBand | null;
  status: ResultStatus;
  missing: string[];
  position: number | null;
}

export interface TermReport {
  subjects: SubjectTermResult[];
  obtained: number | null;
  available: number | null;
  percentage: number | null;
  band: GradeBand | null;
  status: ResultStatus;
  position: number | null;
  classSize: number;
  completeSubjects: number;
}

function marksFor(
  marks: AssessmentMark[],
  studentId: string,
  year: string,
  term: TermName,
  subject: string,
): AssessmentMark[] {
  return marks.filter(
    (mark) => mark.studentId === studentId && mark.academicYear === year && mark.term === term && mark.subject === subject,
  );
}

export function componentsFor(saved: AssessmentMark[], categories: AssessmentCategory[]): ComponentScore[] {
  return categories.map((category) => {
    const found = saved.find((mark) => mark.categoryId === category.id);
    return {
      categoryId: category.id,
      name: category.name,
      kind: category.kind,
      maxMarks: category.maxMarks,
      weight: category.weight,
      required: category.required,
      score: found ? found.score : null,
    };
  });
}

/**
 * Simple method: final % = marks obtained ÷ marks available × 100.
 * Weighted method: final % = sum of (score ÷ maximum × weight).
 * A missing required assessment blocks the final mark. Optional blanks are left out.
 * A saved score of 0 is a real mark, not a missing one.
 */
export function finalPercentage(components: ComponentScore[], method: CalculationMethod): number | null {
  if (components.some((item) => item.required && item.score == null)) return null;
  const used = components.filter((item) => item.score != null);
  if (used.length === 0) return null;
  if (method === 'weighted') {
    return used.reduce((sum, item) => sum + (item.score! / item.maxMarks) * item.weight, 0);
  }
  const obtained = used.reduce((sum, item) => sum + item.score!, 0);
  const available = used.reduce((sum, item) => sum + item.maxMarks, 0);
  if (available <= 0) return null;
  return (obtained / available) * 100;
}

function enteredTotals(components: ComponentScore[]): { obtained: number | null; available: number | null } {
  const used = components.filter((item) => item.score != null);
  if (used.length === 0) return { obtained: null, available: null };
  return {
    obtained: used.reduce((sum, item) => sum + item.score!, 0),
    available: used.reduce((sum, item) => sum + item.maxMarks, 0),
  };
}

function statusFor(percentage: number | null, passMark: number): ResultStatus {
  if (percentage == null) return 'Incomplete';
  return percentage + 0.001 >= passMark ? 'Pass' : 'Fail';
}

/**
 * Equal percentages share a position. The next position is skipped
 * (1st, 2nd, 2nd, 4th). Positions stay blank until every student in the
 * comparison has a complete result.
 */
function sharedPositions(rows: { id: string; percentage: number | null }[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  if (rows.length === 0 || rows.some((row) => row.percentage == null)) {
    for (const row of rows) map.set(row.id, null);
    return map;
  }
  for (const row of rows) {
    const higher = rows.filter((other) => (other.percentage as number) > (row.percentage as number)).length;
    map.set(row.id, 1 + higher);
  }
  return map;
}

export function subjectTermResult(
  studentId: string,
  classmateIds: string[],
  marks: AssessmentMark[],
  year: string,
  term: TermName,
  subject: string,
  settings: SchemeSettings,
): SubjectTermResult {
  const components = componentsFor(marksFor(marks, studentId, year, term, subject), settings.assessments);
  const missing = components.filter((item) => item.required && item.score == null).map((item) => item.name);
  const percentage = finalPercentage(components, settings.calculationMethod);
  const totals = enteredTotals(components);
  const ranked = classmateIds.map((id) => ({
    id,
    percentage: finalPercentage(
      componentsFor(marksFor(marks, id, year, term, subject), settings.assessments),
      settings.calculationMethod,
    ),
  }));
  return {
    subject,
    components,
    obtained: totals.obtained,
    available: totals.available,
    percentage,
    band: percentage == null ? null : gradeFor(percentage, settings.grades),
    status: statusFor(percentage, settings.passMark),
    missing,
    position: sharedPositions(ranked).get(studentId) ?? null,
  };
}

export function termReport(
  studentId: string,
  classmateIds: string[],
  marks: AssessmentMark[],
  year: string,
  term: TermName,
  subjects: string[],
  settings: SchemeSettings,
): TermReport {
  const rows = subjects.map((subject) => subjectTermResult(studentId, classmateIds, marks, year, term, subject, settings));
  const complete = rows.filter((row) => row.percentage != null);
  const obtained = rows.some((row) => row.obtained != null) ? rows.reduce((sum, row) => sum + (row.obtained ?? 0), 0) : null;
  const available = rows.some((row) => row.available != null) ? rows.reduce((sum, row) => sum + (row.available ?? 0), 0) : null;
  const percentage = complete.length === subjects.length && subjects.length > 0
    ? complete.reduce((sum, row) => sum + (row.percentage as number), 0) / complete.length
    : null;
  const ranked = classmateIds.map((id) => {
    const theirs = subjects.map((subject) =>
      finalPercentage(
        componentsFor(marksFor(marks, id, year, term, subject), settings.assessments),
        settings.calculationMethod,
      ),
    );
    const scored = theirs.filter((value): value is number => value != null);
    if (scored.length !== theirs.length || scored.length === 0) return { id, percentage: null };
    return { id, percentage: scored.reduce((sum, value) => sum + value, 0) / scored.length };
  });
  return {
    subjects: rows,
    obtained: percentage == null ? obtained : rows.reduce((sum, row) => sum + (row.obtained ?? 0), 0),
    available: percentage == null ? available : rows.reduce((sum, row) => sum + (row.available ?? 0), 0),
    percentage,
    band: percentage == null ? null : gradeFor(percentage, settings.grades),
    status: statusFor(percentage, settings.passMark),
    position: sharedPositions(ranked).get(studentId) ?? null,
    classSize: classmateIds.length,
    completeSubjects: complete.length,
  };
}

export interface YearTermCell {
  term: TermName;
  obtained: number | null;
  available: number | null;
  percentage: number | null;
}

export interface YearSubjectRow {
  subject: string;
  terms: YearTermCell[];
  obtained: number | null;
  available: number | null;
  percentage: number | null;
  band: GradeBand | null;
  position: number | null;
}

export interface YearSummary {
  subjects: YearSubjectRow[];
  terms: YearTermCell[];
  obtained: number | null;
  available: number | null;
  percentage: number | null;
  band: GradeBand | null;
  position: number | null;
  classSize: number;
}

function scoredTotals(components: ComponentScore[], method: CalculationMethod): { obtained: number; available: number; percentage: number } | null {
  const percentage = finalPercentage(components, method);
  if (percentage == null) return null;
  const used = components.filter((item) => item.score != null);
  return {
    obtained: used.reduce((sum, item) => sum + (item.score ?? 0), 0),
    available: used.reduce((sum, item) => sum + item.maxMarks, 0),
    percentage,
  };
}

function yearPercentage(cells: { obtained: number | null; available: number | null; percentage: number | null }[], method: CalculationMethod): number | null {
  if (cells.length === 0 || cells.some((cell) => cell.percentage == null || cell.obtained == null || cell.available == null)) return null;
  if (method === 'weighted') {
    return cells.reduce((sum, cell) => sum + (cell.percentage ?? 0), 0) / cells.length;
  }
  const obtained = cells.reduce((sum, cell) => sum + (cell.obtained ?? 0), 0);
  const available = cells.reduce((sum, cell) => sum + (cell.available ?? 0), 0);
  if (available <= 0) return null;
  return (obtained / available) * 100;
}

/**
 * Total of all terms = the sum of each completed term.
 * A missing term is left out, not counted as zero.
 * The final percentage and position are calculated only when every term is complete.
 */
export function yearSummary(
  studentId: string,
  classmateIds: string[],
  marks: AssessmentMark[],
  year: string,
  subjects: string[],
  terms: TermName[],
  settings: SchemeSettings,
): YearSummary {
  const subjectCells = (id: string, subject: string): YearTermCell[] =>
    terms.map((term) => {
      const scored = scoredTotals(componentsFor(marksFor(marks, id, year, term, subject), settings.assessments), settings.calculationMethod);
      return scored ? { term, ...scored } : { term, obtained: null, available: null, percentage: null };
    });

  const rankedForSubject = (subject: string) =>
    sharedPositions(
      classmateIds.map((id) => ({
        id,
        percentage: yearPercentage(subjectCells(id, subject), settings.calculationMethod),
      })),
    );

  const rows: YearSubjectRow[] = subjects.map((subject) => {
    const termsForSubject = subjectCells(studentId, subject);
    const complete = termsForSubject.filter((cell) => cell.obtained != null && cell.available != null);
    const percentage = yearPercentage(termsForSubject, settings.calculationMethod);
    return {
      subject,
      terms: termsForSubject,
      obtained: complete.length ? complete.reduce((sum, cell) => sum + (cell.obtained ?? 0), 0) : null,
      available: complete.length ? complete.reduce((sum, cell) => sum + (cell.available ?? 0), 0) : null,
      percentage,
      band: percentage == null ? null : gradeFor(percentage, settings.grades),
      position: rankedForSubject(subject).get(studentId) ?? null,
    };
  });

  const termsOverall: YearTermCell[] = terms.map((term) => {
    const cells = rows.map((row) => row.terms.find((item) => item.term === term) ?? { term, obtained: null, available: null, percentage: null });
    if (cells.some((cell) => cell.percentage == null || cell.obtained == null || cell.available == null)) {
      return { term, obtained: null, available: null, percentage: null };
    }
    const percentage = yearPercentage(cells, settings.calculationMethod);
    return {
      term,
      obtained: cells.reduce((sum, cell) => sum + (cell.obtained ?? 0), 0),
      available: cells.reduce((sum, cell) => sum + (cell.available ?? 0), 0),
      percentage,
    };
  });

  const completeTerms = termsOverall.filter((cell) => cell.obtained != null && cell.available != null);
  const percentage = yearPercentage(termsOverall, settings.calculationMethod);
  const ranked = sharedPositions(
    classmateIds.map((id) => {
      const flat = subjects.flatMap((subject) => subjectCells(id, subject));
      return { id, percentage: yearPercentage(flat, settings.calculationMethod) };
    }),
  );

  return {
    subjects: rows,
    terms: termsOverall,
    obtained: completeTerms.length ? completeTerms.reduce((sum, cell) => sum + (cell.obtained ?? 0), 0) : null,
    available: completeTerms.length ? completeTerms.reduce((sum, cell) => sum + (cell.available ?? 0), 0) : null,
    percentage,
    band: percentage == null ? null : gradeFor(percentage, settings.grades),
    position: ranked.get(studentId) ?? null,
    classSize: classmateIds.length,
  };
}

export function classSubjectSummary(
  studentIds: string[],
  marks: AssessmentMark[],
  year: string,
  term: TermName,
  subject: string,
  settings: SchemeSettings,
): { complete: number; total: number; average: number | null } {
  const percentages = studentIds.map((id) =>
    finalPercentage(componentsFor(marksFor(marks, id, year, term, subject), settings.assessments), settings.calculationMethod),
  );
  const ready = percentages.filter((value): value is number => value != null);
  return {
    complete: ready.length,
    total: studentIds.length,
    average: ready.length ? ready.reduce((sum, value) => sum + value, 0) / ready.length : null,
  };
}

export function assessmentProblem(categories: AssessmentCategory[], method: CalculationMethod): string | null {
  if (categories.length === 0) return 'Add at least one assessment category.';
  if (categories.some((item) => item.name.trim() === '')) return 'Each assessment needs a name.';
  if (new Set(categories.map((item) => item.name.trim().toLowerCase())).size !== categories.length) return 'Assessment names must be different.';
  if (categories.some((item) => !Number.isInteger(item.maxMarks) || item.maxMarks < 1 || item.maxMarks > 1000)) {
    return 'Each maximum mark must be a whole number from 1 to 1,000.';
  }
  if (!categories.some((item) => item.required)) return 'Mark at least one assessment as required before a final result can be calculated.';
  if (method === 'weighted') {
    if (categories.some((item) => !Number.isFinite(item.weight) || item.weight < 0)) return 'Each weight must be zero or greater.';
    const total = categories.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(total - 100) > 0.01) return `Weights must add up to 100. They currently add up to ${total}.`;
  }
  return null;
}

export function calculationNote(method: CalculationMethod): string {
  if (method === 'weighted') {
    return 'Weighted final mark = the sum of (score ÷ maximum × weight). Weights of the active categories must add up to 100. Optional categories count only when a mark is entered.';
  }
  return 'Final mark = total marks obtained ÷ total available marks × 100. Optional categories count only when a mark is entered.';
}
