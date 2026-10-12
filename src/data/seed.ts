import {
  ACADEMIC_YEAR,
  CURRENT_TERM,
  DEFAULT_ASSESSMENTS,
  DEFAULT_GRADES,
  PARTIAL_FEE,
  subjectsForClass,
  teacherForSubject,
  TERM_FEE,
  buildTimetable,
} from './school';
import { DEFAULT_COLOURS } from '../lib/colours';
import {
  FINANCE_LOGIN_PASSWORD,
  LIBRARY_LOGIN_PASSWORD,
  REGISTRAR_LOGIN_PASSWORD,
  parentLoginEmail,
  studentIndexFromId,
  studentLoginEmail,
  studentLoginPassword,
  teacherLoginEmail,
  teacherLoginPassword,
} from '../lib/demo-credentials';
import { addDays, fullName } from '../lib/format';
import type { DemoUser } from '../types';
import type {
  AssessmentMark,
  AttendanceRecord,
  AttendanceStatus,
  Book,
  DemoData,
  FeeAccount,
  Gender,
  Loan,
  Payment,
  PaymentMethod,
  Student,
  StudentStatus,
  Teacher,
  TermName,
} from '../types';

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stu(
  id: string,
  firstName: string,
  lastName: string,
  gender: Gender,
  dateOfBirth: string,
  className: string,
  guardianName: string,
  guardianRelation: string,
  phone: string,
  address: string,
  admissionDate: string,
  status: StudentStatus = 'Active',
): Student {
  return {
    id,
    firstName,
    lastName,
    gender,
    dateOfBirth,
    className,
    guardianName,
    guardianRelation,
    guardianPhone: phone,
    contact: phone,
    address,
    admissionDate,
    status,
  };
}

function teacher(
  id: string,
  title: string,
  firstName: string,
  lastName: string,
  gender: Gender,
  subjects: string[],
  classes: string[],
  phone: string,
  email: string,
  qualification: string,
  joinedDate: string,
  status: Teacher['status'] = 'Active',
): Teacher {
  return {
    id,
    title,
    firstName,
    lastName,
    gender,
    subjects,
    classes,
    phone,
    email,
    qualification,
    joinedDate,
    status,
  };
}

const SEPTEMBER = [
  '2026-09-01',
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-28',
  '2026-09-29',
];

const SHOWCASE_FIRST_TERM: Record<string, number> = {
  Mathematics: 78,
  'English Language': 82,
  ICT: 91,
  'Integrated Science': 75,
  'Social Studies': 80,
  French: 74,
  'Religious & Moral Education': 77,
};

function generatedScore(studentId: string, subject: string, examId: string): number {
  const base = 60 + (hashString(studentId) % 25);
  const delta = (hashString(`${studentId}|${subject}|${examId}`) % 13) - 6;
  return Math.max(38, Math.min(98, base + delta));
}

function splitPercent(percent: number, maximums: number[]): number[] {
  const raw = maximums.map((max) => (percent / 100) * max);
  const parts = raw.map((value) => Math.floor(value));
  let remainder = percent - parts.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    const index = order[cursor % order.length].index;
    if (parts[index] < maximums[index]) {
      parts[index] += 1;
      remainder -= 1;
    }
    cursor += 1;
    if (cursor > maximums.reduce((sum, max) => sum + max, 0)) break;
  }
  return parts;
}

function statusFor(studentId: string, date: string): AttendanceStatus {
  const n = hashString(`${studentId}|${date}`) % 100;
  if (n < 5) return 'Absent';
  if (n < 11) return 'Sick';
  return 'Present';
}

function buildSeedUsers(students: Student[]): DemoUser[] {
  const users: DemoUser[] = [
    {
      id: 'USR-001',
      name: 'Alie Tarawallie',
      email: 'olaraymohammed@gmail.com',
      password: 'Olaray@2026',
      role: 'administrator',
      roleLabel: 'Administrator',
      active: true,
    },
    {
      id: 'USR-002',
      name: 'Bockarie Momoh',
      email: teacherLoginEmail(1),
      password: teacherLoginPassword(1),
      role: 'teacher',
      roleLabel: 'Teacher',
      teacherId: 'TCH-014',
      active: true,
    },
    {
      id: 'USR-008',
      name: 'Idrissa Chernor Kamara',
      email: teacherLoginEmail(2),
      password: teacherLoginPassword(2),
      role: 'teacher',
      roleLabel: 'Teacher',
      teacherId: 'TCH-021',
      active: true,
    },
    {
      id: 'USR-009',
      name: 'Mohammed Olaray',
      email: teacherLoginEmail(3),
      password: teacherLoginPassword(3),
      role: 'teacher',
      roleLabel: 'Teacher',
      teacherId: 'TCH-033',
      active: true,
    },
    {
      id: 'USR-005',
      name: 'Mamoudou Barry',
      email: 'library@rokelvalley.edu.sl',
      password: LIBRARY_LOGIN_PASSWORD,
      role: 'libraryManager',
      roleLabel: 'Library Manager',
      active: true,
    },
    {
      id: 'USR-007',
      name: 'Rugiatu Hawa Kamara',
      email: 'register@rokelvalley.edu.sl',
      password: REGISTRAR_LOGIN_PASSWORD,
      role: 'register',
      roleLabel: 'Register',
      active: true,
    },
    {
      id: 'USR-006',
      name: 'Rugiatu Hawa Kamara',
      email: 'registrar@rokelvalley.edu.sl',
      password: FINANCE_LOGIN_PASSWORD,
      role: 'registrar',
      roleLabel: 'Finance',
      active: true,
    },
  ];

  const sortedStudents = [...students].sort((a, b) => a.id.localeCompare(b.id));
  for (const student of sortedStudents) {
    const index = studentIndexFromId(student.id);
    if (index <= 0) continue;
    const slot = String(index).padStart(3, '0');
    users.push(
      {
        id: `USR-S-${slot}`,
        name: fullName(student),
        email: studentLoginEmail(index),
        password: studentLoginPassword(index),
        role: 'student',
        roleLabel: 'Student',
        studentId: student.id,
        active: true,
      },
      {
        id: `USR-P-${slot}`,
        name: student.guardianName,
        email: parentLoginEmail(index),
        password: studentLoginPassword(index),
        role: 'parent',
        roleLabel: 'Parent / Guardian',
        studentId: student.id,
        active: true,
      },
    );
  }
  return users;
}

function buildDemoData(): DemoData {
  const students: Student[] = [
    stu('STU-2026-001', 'Isata Alpha', 'Bah', 'Female', '2011-03-14', 'JSS 3', 'Alpha Bah', 'Father', '+232 76 412 880', '12 Pademba Road, Freetown', '2023-09-04'),
    stu('STU-2026-002', 'Bob', 'Lincoln', 'Male', '2011-07-22', 'JSS 3', 'Mary Lincoln', 'Mother', '+232 77 308 114', '4 Wilkinson Road, Freetown', '2023-09-04'),
    stu('STU-2026-005', 'Daniel', 'Grant', 'Male', '2012-02-11', 'JSS 2', 'Elizabeth Grant', 'Mother', '+232 76 230 448', '18 Syke Street, Freetown', '2024-09-02'),
    stu('STU-2026-006', 'Elizabeth', 'Johnson', 'Female', '2012-06-03', 'JSS 2', 'Samuel Johnson', 'Father', '+232 77 812 095', '2 Hill Station, Freetown', '2024-09-02'),
    stu('STU-2026-009', 'Memunatu I.', 'Mansaray', 'Female', '2013-01-09', 'JSS 1', 'Alhaji Mansaray', 'Father', '+232 76 905 331', '11 Sanders Street, Freetown', '2025-09-01'),
    stu('STU-2026-010', 'Salima AB', 'Barrie', 'Female', '2013-04-16', 'JSS 1', 'Haja Barrie', 'Mother', '+232 77 214 808', '5 Aberdeen Road, Freetown', '2025-09-01'),
    stu('STU-2026-003', 'Precious', 'Mansaray', 'Female', '2010-11-02', 'SSS 1', 'Aminata Mansaray', 'Mother', '+232 76 551 903', '28 Kissy Road, Freetown', '2022-09-05'),
    stu('STU-2026-004', 'Dameer', 'Kargbo', 'Male', '2010-04-19', 'SSS 1', 'Sorie Kargbo', 'Father', '+232 78 220 441', '9 Signal Hill Road, Freetown', '2022-09-05'),
    stu('STU-2026-007', 'Hindolo', 'Nyandemo', 'Male', '2009-08-19', 'SSS 2', 'Memunatu Nyandemo', 'Mother', '+232 75 441 772', '44 Bai Bureh Road, Freetown', '2021-09-06'),
    stu('STU-2026-008', 'Hamza H.', 'Kanu', 'Male', '2009-10-28', 'SSS 2', 'Ibrahim Kanu', 'Father', '+232 78 663 120', '7 Congo Cross, Freetown', '2021-09-06'),
    stu('STU-2026-011', 'Ahmed S.', 'Conteh', 'Male', '2008-07-21', 'SSS 3', 'Fatmata Conteh', 'Mother', '+232 78 552 643', '30 Fourah Bay Road, Freetown', '2020-09-07'),
    stu('STU-2026-012', 'Haja Janet', 'Kemokai', 'Female', '2008-05-13', 'SSS 3', 'Janet Kemokai', 'Mother', '+232 77 640 228', '1 Juba Hill, Freetown', '2020-09-07'),
  ];

  const teachers: Teacher[] = [
    teacher('TCH-014', 'Mr.', 'Bockarie', 'Momoh', 'Male', ['Mathematics'], ['JSS 2', 'JSS 3'], '+232 78 221 045', 'b.momoh@rokelvalley.edu.sl', 'B.Sc. Mathematics, Fourah Bay College', '2016-09-05'),
    teacher('TCH-021', 'Mr.', 'Idrissa', 'Chernor Kamara', 'Male', ['English Language'], ['JSS 3', 'SSS 1'], '+232 76 540 218', 'i.kamara@rokelvalley.edu.sl', 'B.A. English, University of Sierra Leone', '2014-09-01'),
    teacher('TCH-008', 'Ms.', 'Fatmata', 'Jalloh', 'Female', ['ICT'], ['JSS 1', 'JSS 2', 'JSS 3'], '+232 77 318 902', 'f.jalloh@rokelvalley.edu.sl', 'B.Sc. Information Technology, Njala University', '2019-09-02'),
    teacher('TCH-033', 'Mr.', 'Mohammed', 'Olaray', 'Male', ['Integrated Science'], ['JSS 3', 'SSS 1', 'SSS 2'], '+232 75 662 114', 'm.olaray@rokelvalley.edu.sl', 'B.Sc. Chemistry, Fourah Bay College', '2012-09-03'),
    teacher('TCH-019', 'Mrs.', 'Mariama', 'Bangura', 'Female', ['Social Studies'], ['JSS 1', 'JSS 2'], '+232 78 904 331', 'm.bangura@rokelvalley.edu.sl', 'B.Ed. Social Studies, University of Sierra Leone', '2015-09-07'),
    teacher('TCH-027', 'Mr.', 'Alusine', 'Turay', 'Male', ['French'], ['JSS 2', 'JSS 3', 'SSS 1'], '+232 76 228 457', 'a.turay@rokelvalley.edu.sl', 'B.A. French, Fourah Bay College', '2017-09-04'),
    teacher('TCH-041', 'Mrs.', 'Isatu', 'Mansaray', 'Female', ['Agricultural Science'], ['JSS 1', 'SSS 1', 'SSS 2'], '+232 77 515 680', 'i.mansaray@rokelvalley.edu.sl', 'B.Sc. Agriculture, Njala University', '2011-09-05', 'On leave'),
    teacher('TCH-012', 'Mr.', 'Abdulai', 'Jalloh', 'Male', ['Religious & Moral Education'], ['JSS 3', 'SSS 1', 'SSS 3'], '+232 78 103 774', 'a.jalloh@rokelvalley.edu.sl', 'B.A. Theology, University of Sierra Leone', '2013-09-02'),
  ];

  const attendance: AttendanceRecord[] = [];
  for (const student of students) {
    for (const date of SEPTEMBER) {
      attendance.push({
        id: `${date}:${student.id}`,
        studentId: student.id,
        className: student.className,
        date,
        status: statusFor(student.id, date),
      });
    }
  }

  const marks: AssessmentMark[] = [];
  const pushTerm = (student: Student, term: TermName, key: string, skipFinalMathFor?: string) => {
    for (const subject of subjectsForClass(student.className)) {
      let percent = generatedScore(student.id, subject, key);
      if (student.id === 'STU-2026-001' && term === 'First Term' && SHOWCASE_FIRST_TERM[subject] != null) {
        percent = SHOWCASE_FIRST_TERM[subject];
      }
      const parts = splitPercent(percent, DEFAULT_ASSESSMENTS.map((item) => item.maxMarks));
      DEFAULT_ASSESSMENTS.forEach((category, index) => {
        if (category.id === 'final' && skipFinalMathFor === student.id && subject === 'Mathematics') return;
        marks.push({
          id: `${ACADEMIC_YEAR}|${term}|${student.id}|${subject}|${category.id}`,
          studentId: student.id,
          academicYear: ACADEMIC_YEAR,
          term,
          className: student.className,
          subject,
          categoryId: category.id,
          score: parts[index],
          teacherId: teacherForSubject(subject),
        });
      });
    }
  };
  for (const student of students) {
    pushTerm(student, 'First Term', 'first-2026');
    pushTerm(student, 'Second Term', 'second-2026', 'STU-2026-006');
  }

  const full = new Set([
    'STU-2026-001',
    'STU-2026-002',
    'STU-2026-003',
    'STU-2026-004',
    'STU-2026-009',
    'STU-2026-010',
  ]);
  const partial = new Set(['STU-2026-005', 'STU-2026-006', 'STU-2026-011', 'STU-2026-012']);
  const methods: PaymentMethod[] = ['Cash', 'Bank deposit', 'Mobile money'];
  const payDates = ['2026-09-04', '2026-09-08', '2026-09-11', '2026-09-15', '2026-09-18', '2026-09-22', '2026-09-24', '2026-09-26'];
  const fees: FeeAccount[] = [];
  const payments: Payment[] = [];
  students.forEach((student, index) => {
    const paid = full.has(student.id) ? TERM_FEE : partial.has(student.id) ? PARTIAL_FEE : 0;
    const fee: FeeAccount = {
      id: `FEE-${student.id}`,
      studentId: student.id,
      academicYear: ACADEMIC_YEAR,
      term: CURRENT_TERM,
      description: `${CURRENT_TERM} fees (tuition, development levy, and ICT levy)`,
      expected: TERM_FEE,
      paid,
    };
    fees.push(fee);
    if (paid > 0 && partial.has(student.id)) {
      const firstDate = payDates[index % payDates.length];
      const firstAmount = Math.min(600, paid - 100);
      payments.push({
        id: `PAY-${student.id}-1`,
        studentId: student.id,
        feeAccountId: fee.id,
        amount: firstAmount,
        date: firstDate,
        method: methods[index % methods.length],
        reference: `RV-${2400 + index}`,
        recordedBy: 'Alie Tarawallie',
      });
      payments.push({
        id: `PAY-${student.id}-2`,
        studentId: student.id,
        feeAccountId: fee.id,
        amount: paid - firstAmount,
        date: addDays(firstDate, 14),
        method: methods[(index + 1) % methods.length],
        reference: `RV-${2400 + index}B`,
        recordedBy: 'Alie Tarawallie',
      });
    } else if (paid > 0) {
      payments.push({
        id: `PAY-${student.id}`,
        studentId: student.id,
        feeAccountId: fee.id,
        amount: paid,
        date: payDates[index % payDates.length],
        method: methods[index % methods.length],
        reference: `RV-${2400 + index}`,
        recordedBy: 'Alie Tarawallie',
      });
    }
  });

  const books: Book[] = [
    { id: 'BK-1042', title: 'New General Mathematics for Junior Secondary', author: 'M. F. Macrae', category: 'Mathematics', quantity: 40, available: 40 },
    { id: 'BK-1108', title: 'Integrated Science for Junior Secondary Schools', author: 'S. A. Asabere', category: 'Science', quantity: 36, available: 36 },
    { id: 'BK-1215', title: 'Introduction to ICT', author: 'A. Mansaray', category: 'ICT', quantity: 24, available: 24 },
    { id: 'BK-0988', title: 'Things Fall Apart', author: 'Chinua Achebe', category: 'Literature', quantity: 18, available: 18 },
    { id: 'BK-0994', title: 'The Lion and the Jewel', author: 'Wole Soyinka', category: 'Literature', quantity: 15, available: 15 },
    { id: 'BK-1302', title: 'English Language for Junior Secondary', author: 'P. A. Ogundipe', category: 'English', quantity: 38, available: 38 },
    { id: 'BK-1410', title: 'A Concise History of Sierra Leone', author: 'M. K. Fofanah', category: 'Social Studies', quantity: 12, available: 12 },
    { id: 'BK-1522', title: 'Junior Secondary Agriculture', author: 'A. K. Conteh', category: 'Agriculture', quantity: 20, available: 20 },
    { id: 'BK-0881', title: 'French for Beginners', author: 'E. Touré', category: 'Languages', quantity: 6, available: 6 },
    { id: 'BK-1604', title: 'Civic Education for Sierra Leone', author: 'M. J. Kamara', category: 'Social Studies', quantity: 22, available: 22 },
    { id: 'BK-1711', title: 'Computer Studies Workbook', author: 'F. Jalloh', category: 'ICT', quantity: 30, available: 30 },
    { id: 'BK-1702', title: 'Atlas of Sierra Leone', author: 'Rokel Valley Geography Department', category: 'Reference', quantity: 2, available: 2 },
    { id: 'BK-1820', title: 'Poetry for Secondary Schools', author: 'K. Brew', category: 'Literature', quantity: 14, available: 14 },
  ];
  const loans: Loan[] = [];
  const give = (studentId: string, bookId: string, borrowDate: string, dueDate: string, returnDate?: string) => {
    const book = books.find((item) => item.id === bookId);
    if (!book) return;
    if (!returnDate) book.available -= 1;
    loans.push({ id: `loan-${loans.length + 1}`, studentId, bookId, borrowDate, dueDate, returnDate });
  };
  give('STU-2026-001', 'BK-1108', '2026-09-15', '2026-10-02');
  give('STU-2026-001', 'BK-0988', '2026-09-02', '2026-09-16', '2026-09-14');
  give('STU-2026-002', 'BK-1215', '2026-09-06', '2026-09-20');
  give('STU-2026-003', 'BK-1042', '2026-09-18', '2026-10-10');
  give('STU-2026-004', 'BK-0881', '2026-09-10', '2026-10-06');
  give('STU-2026-007', 'BK-0881', '2026-09-04', '2026-09-18');
  give('STU-2026-011', 'BK-1702', '2026-09-11', '2026-09-25');
  give('STU-2026-012', 'BK-1702', '2026-09-20', '2026-10-08');

  return {
    students,
    teachers,
    attendance,
    marks,
    fees,
    payments,
    books,
    loans,
    timetable: buildTimetable(),
    notifications: [
      {
        id: 'n1',
        title: 'Examination results entered',
        message: 'First Term Mathematics scores for JSS 3 are ready for review.',
        time: '2026-09-29T08:40:00',
        read: false,
        category: 'exam',
      },
      {
        id: 'n2',
        title: 'Fee payment recorded',
        message: 'Bob Lincoln — SLE 2,200 received for First Term fees.',
        time: '2026-09-28T14:15:00',
        read: false,
        category: 'fee',
      },
      {
        id: 'n3',
        title: 'Attendance report generated',
        message: 'JSS 3 attendance for the week of 22 September is available.',
        time: '2026-09-28T09:05:00',
        read: false,
        category: 'attendance',
      },
      {
        id: 'n4',
        title: 'Library book due soon',
        message: 'Isata Alpha Bah — Integrated Science for Junior Secondary Schools is due on 2 October.',
        time: '2026-09-27T16:20:00',
        read: false,
        category: 'library',
      },
      {
        id: 'n5',
        title: 'New student registered',
        message: 'Haja Janet Kemokai was added to SSS 3.',
        time: '2026-09-26T11:00:00',
        read: true,
        category: 'student',
      },
    ],
    users: buildSeedUsers(students),
    settings: {
      name: 'Rokel Valley Secondary School',
      shortName: 'Rokel Valley',
      motto: 'Knowledge, Discipline, Service',
      address: 'Hill Station, Freetown, Sierra Leone',
      phone: '+232 76 000 214',
      email: 'office@rokelvalley.edu.sl',
      academicYear: ACADEMIC_YEAR,
      currentTerm: CURRENT_TERM,
      currency: 'SLE',
      principal: 'Mrs. Adama C. Williams',
      grades: DEFAULT_GRADES.map((band) => ({ ...band })),
      calculationMethod: 'simple',
      passMark: 50,
      assessments: DEFAULT_ASSESSMENTS.map((item) => ({ ...item })),
      colours: { ...DEFAULT_COLOURS },
    },
  };
}

/** Bump when the demonstration student roster or related seed rows change. */
export const SEED_ROSTER_REVISION = 3;

export const INITIAL_DATA = buildDemoData();

function paidTotal(fees: FeeAccount[]) {
  return fees.reduce((sum, fee) => sum + fee.paid, 0);
}

function outstandingTotal(fees: FeeAccount[]) {
  return fees.reduce((sum, fee) => sum + Math.max(0, fee.expected - fee.paid), 0);
}

const initialExpected = INITIAL_DATA.fees.reduce((sum, fee) => sum + fee.expected, 0);
const initialFullyPaid = INITIAL_DATA.fees.filter((fee) => fee.expected > 0 && fee.paid >= fee.expected).length;

export const OFFSETS = {
  students: 1248 - INITIAL_DATA.students.length,
  teachers: 86 - INITIAL_DATA.teachers.length,
  collected: 482_500 - paidTotal(INITIAL_DATA.fees),
  outstanding: 76_500 - outstandingTotal(INITIAL_DATA.fees),
  expected: 482_500 + 76_500 - initialExpected,
  paidStudents: 912 - initialFullyPaid,
};
