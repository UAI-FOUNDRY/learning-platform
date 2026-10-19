/**
 * Development Sample Data for Super Admin Dashboard
 * Clearly labeled mock dataset used while backend APIs are in development.
 * DO NOT claim this data is live platform data.
 */

export const mockDashboardSummary = {
  totalUsers: 1280,
  totalCourses: 84,
  pendingApprovals: 5,
  totalEnrollments: 4320
};

// 7-day data (daily)
const sample7D = {
  registrations: [
    { date: 'Oct 11', value: 14, prevValue: 12 },
    { date: 'Oct 12', value: 19, prevValue: 15 },
    { date: 'Oct 13', value: 8, prevValue: 9 },
    { date: 'Oct 14', value: 24, prevValue: 18 },
    { date: 'Oct 15', value: 31, prevValue: 22 },
    { date: 'Oct 16', value: 27, prevValue: 25 },
    { date: 'Oct 17', value: 16, prevValue: 14 }
  ],
  enrollments: [
    { date: 'Oct 11', value: 45, prevValue: 38 },
    { date: 'Oct 12', value: 58, prevValue: 42 },
    { date: 'Oct 13', value: 32, prevValue: 30 },
    { date: 'Oct 14', value: 76, prevValue: 65 },
    { date: 'Oct 15', value: 89, prevValue: 70 },
    { date: 'Oct 16', value: 64, prevValue: 60 },
    { date: 'Oct 17', value: 50, prevValue: 45 }
  ],
  coursesCreated: [
    { date: 'Oct 11', value: 1, prevValue: 0 },
    { date: 'Oct 12', value: 2, prevValue: 1 },
    { date: 'Oct 13', value: 0, prevValue: 0 }, // Confirmed zero
    { date: 'Oct 14', value: 3, prevValue: 2 },
    { date: 'Oct 15', value: 1, prevValue: 1 },
    { date: 'Oct 16', value: 0, prevValue: 1 }, // Confirmed zero
    { date: 'Oct 17', value: 2, prevValue: 0 }
  ],
  courseApprovals: [
    { date: 'Oct 11', value: 0, prevValue: 1 }, // Confirmed zero
    { date: 'Oct 12', value: 1, prevValue: 0 },
    { date: 'Oct 13', value: 0, prevValue: 0 }, // Confirmed zero
    { date: 'Oct 14', value: 2, prevValue: 1 },
    { date: 'Oct 15', value: 1, prevValue: 2 },
    { date: 'Oct 16', value: 1, prevValue: 0 },
    { date: 'Oct 17', value: 1, prevValue: 1 }
  ],
  courseCompletions: [
    { date: 'Oct 11', value: 8, prevValue: 6 },
    { date: 'Oct 12', value: 12, prevValue: 10 },
    { date: 'Oct 13', value: 5, prevValue: 4 },
    { date: 'Oct 14', value: 16, prevValue: 13 },
    { date: 'Oct 15', value: 19, prevValue: 15 },
    { date: 'Oct 16', value: 14, prevValue: 11 },
    { date: 'Oct 17', value: 9, prevValue: 8 }
  ]
};

// 30-day data (daily)
const sample30D = {
  registrations: [
    { date: 'Sep 18', value: 12, prevValue: 10 },
    { date: 'Sep 20', value: 15, prevValue: 14 },
    { date: 'Sep 22', value: 18, prevValue: 12 },
    { date: 'Sep 24', value: 22, prevValue: 17 },
    { date: 'Sep 26', value: 14, prevValue: 11 },
    { date: 'Sep 28', value: 19, prevValue: 16 },
    { date: 'Sep 30', value: 25, prevValue: 20 },
    { date: 'Oct 02', value: 21, prevValue: 19 },
    { date: 'Oct 04', value: 16, prevValue: 13 },
    { date: 'Oct 06', value: 28, prevValue: 22 },
    { date: 'Oct 08', value: 23, prevValue: 21 },
    { date: 'Oct 10', value: 18, prevValue: 15 },
    { date: 'Oct 12', value: 31, prevValue: 24 },
    { date: 'Oct 14', value: 26, prevValue: 22 },
    { date: 'Oct 17', value: 29, prevValue: 25 }
  ],
  enrollments: [
    { date: 'Sep 18', value: 42, prevValue: 35 },
    { date: 'Sep 20', value: 51, prevValue: 44 },
    { date: 'Sep 22', value: 63, prevValue: 50 },
    { date: 'Sep 24', value: 70, prevValue: 58 },
    { date: 'Sep 26', value: 48, prevValue: 40 },
    { date: 'Sep 28', value: 65, prevValue: 55 },
    { date: 'Sep 30', value: 82, prevValue: 71 },
    { date: 'Oct 02', value: 74, prevValue: 68 },
    { date: 'Oct 04', value: 55, prevValue: 49 },
    { date: 'Oct 06', value: 91, prevValue: 78 },
    { date: 'Oct 08', value: 80, prevValue: 72 },
    { date: 'Oct 10', value: 62, prevValue: 54 },
    { date: 'Oct 12', value: 98, prevValue: 84 },
    { date: 'Oct 14', value: 87, prevValue: 75 },
    { date: 'Oct 17', value: 95, prevValue: 80 }
  ],
  coursesCreated: [
    { date: 'Sep 18', value: 2, prevValue: 1 },
    { date: 'Sep 20', value: 1, prevValue: 0 },
    { date: 'Sep 22', value: 3, prevValue: 2 },
    { date: 'Sep 24', value: 0, prevValue: 1 }, // Confirmed zero
    { date: 'Sep 26', value: 2, prevValue: 1 },
    { date: 'Sep 28', value: 1, prevValue: 2 },
    { date: 'Sep 30', value: 4, prevValue: 3 },
    { date: 'Oct 02', value: 2, prevValue: 1 },
    { date: 'Oct 04', value: 1, prevValue: 0 },
    { date: 'Oct 06', value: 3, prevValue: 2 },
    { date: 'Oct 08', value: 0, prevValue: 1 }, // Confirmed zero
    { date: 'Oct 10', value: 2, prevValue: 1 },
    { date: 'Oct 12', value: 3, prevValue: 2 },
    { date: 'Oct 14', value: 1, prevValue: 1 },
    { date: 'Oct 17', value: 2, prevValue: 1 }
  ],
  courseApprovals: [
    { date: 'Sep 18', value: 1, prevValue: 1 },
    { date: 'Sep 20', value: 0, prevValue: 0 }, // Confirmed zero
    { date: 'Sep 22', value: 2, prevValue: 1 },
    { date: 'Sep 24', value: 1, prevValue: 0 },
    { date: 'Sep 26', value: 0, prevValue: 1 }, // Confirmed zero
    { date: 'Sep 28', value: 2, prevValue: 1 },
    { date: 'Sep 30', value: 3, prevValue: 2 },
    { date: 'Oct 02', value: 1, prevValue: 1 },
    { date: 'Oct 04', value: 0, prevValue: 0 }, // Confirmed zero
    { date: 'Oct 06', value: 2, prevValue: 1 },
    { date: 'Oct 08', value: 1, prevValue: 1 },
    { date: 'Oct 10', value: 1, prevValue: 0 },
    { date: 'Oct 12', value: 2, prevValue: 2 },
    { date: 'Oct 14', value: 2, prevValue: 1 },
    { date: 'Oct 17', value: 1, prevValue: 1 }
  ],
  courseCompletions: [
    { date: 'Sep 18', value: 8, prevValue: 7 },
    { date: 'Sep 20', value: 11, prevValue: 9 },
    { date: 'Sep 22', value: 14, prevValue: 11 },
    { date: 'Sep 24', value: 16, prevValue: 12 },
    { date: 'Sep 26', value: 10, prevValue: 8 },
    { date: 'Sep 28', value: 15, prevValue: 13 },
    { date: 'Sep 30', value: 20, prevValue: 16 },
    { date: 'Oct 02', value: 17, prevValue: 14 },
    { date: 'Oct 04', value: 12, prevValue: 10 },
    { date: 'Oct 06', value: 22, prevValue: 17 },
    { date: 'Oct 08', value: 19, prevValue: 15 },
    { date: 'Oct 10', value: 13, prevValue: 11 },
    { date: 'Oct 12', value: 24, prevValue: 19 },
    { date: 'Oct 14', value: 18, prevValue: 16 },
    { date: 'Oct 17', value: 21, prevValue: 18 }
  ]
};

// 90-day data (weekly aggregations)
const sample90D = {
  registrations: [
    { date: 'W1 (Jul 20)', value: 84, prevValue: 75 },
    { date: 'W3 (Aug 03)', value: 110, prevValue: 92 },
    { date: 'W5 (Aug 17)', value: 95, prevValue: 88 },
    { date: 'W7 (Aug 31)', value: 132, prevValue: 115 },
    { date: 'W9 (Sep 14)', value: 145, prevValue: 128 },
    { date: 'W11 (Sep 28)', value: 168, prevValue: 140 },
    { date: 'W13 (Oct 12)', value: 182, prevValue: 155 }
  ],
  enrollments: [
    { date: 'W1 (Jul 20)', value: 290, prevValue: 245 },
    { date: 'W3 (Aug 03)', value: 375, prevValue: 310 },
    { date: 'W5 (Aug 17)', value: 340, prevValue: 305 },
    { date: 'W7 (Aug 31)', value: 450, prevValue: 390 },
    { date: 'W9 (Sep 14)', value: 495, prevValue: 430 },
    { date: 'W11 (Sep 28)', value: 560, prevValue: 480 },
    { date: 'W13 (Oct 12)', value: 610, prevValue: 520 }
  ],
  coursesCreated: [
    { date: 'W1 (Jul 20)', value: 6, prevValue: 4 },
    { date: 'W3 (Aug 03)', value: 8, prevValue: 5 },
    { date: 'W5 (Aug 17)', value: 5, prevValue: 5 },
    { date: 'W7 (Aug 31)', value: 11, prevValue: 7 },
    { date: 'W9 (Sep 14)', value: 9, prevValue: 8 },
    { date: 'W11 (Sep 28)', value: 14, prevValue: 10 },
    { date: 'W13 (Oct 12)', value: 12, prevValue: 9 }
  ],
  courseApprovals: [
    { date: 'W1 (Jul 20)', value: 4, prevValue: 3 },
    { date: 'W3 (Aug 03)', value: 6, prevValue: 4 },
    { date: 'W5 (Aug 17)', value: 3, prevValue: 4 },
    { date: 'W7 (Aug 31)', value: 8, prevValue: 6 },
    { date: 'W9 (Sep 14)', value: 7, prevValue: 6 },
    { date: 'W11 (Sep 28)', value: 10, prevValue: 8 },
    { date: 'W13 (Oct 12)', value: 9, prevValue: 7 }
  ],
  courseCompletions: [
    { date: 'W1 (Jul 20)', value: 52, prevValue: 44 },
    { date: 'W3 (Aug 03)', value: 68, prevValue: 55 },
    { date: 'W5 (Aug 17)', value: 61, prevValue: 52 },
    { date: 'W7 (Aug 31)', value: 84, prevValue: 70 },
    { date: 'W9 (Sep 14)', value: 96, prevValue: 82 },
    { date: 'W11 (Sep 28)', value: 112, prevValue: 94 },
    { date: 'W13 (Oct 12)', value: 128, prevValue: 106 }
  ]
};

// 1-Year data (monthly aggregations)
const sample1Y = {
  registrations: [
    { date: 'Nov 2025', value: 280, prevValue: 240 },
    { date: 'Jan 2026', value: 360, prevValue: 310 },
    { date: 'Mar 2026', value: 410, prevValue: 350 },
    { date: 'May 2026', value: 480, prevValue: 415 },
    { date: 'Jul 2026', value: 520, prevValue: 460 },
    { date: 'Sep 2026', value: 640, prevValue: 550 },
    { date: 'Oct 2026', value: 380, prevValue: 340 }
  ],
  enrollments: [
    { date: 'Nov 2025', value: 920, prevValue: 790 },
    { date: 'Jan 2026', value: 1250, prevValue: 1050 },
    { date: 'Mar 2026', value: 1420, prevValue: 1200 },
    { date: 'May 2026', value: 1680, prevValue: 1440 },
    { date: 'Jul 2026', value: 1810, prevValue: 1600 },
    { date: 'Sep 2026', value: 2240, prevValue: 1950 },
    { date: 'Oct 2026', value: 1350, prevValue: 1180 }
  ],
  coursesCreated: [
    { date: 'Nov 2025', value: 18, prevValue: 14 },
    { date: 'Jan 2026', value: 24, prevValue: 20 },
    { date: 'Mar 2026', value: 29, prevValue: 24 },
    { date: 'May 2026', value: 34, prevValue: 28 },
    { date: 'Jul 2026', value: 31, prevValue: 27 },
    { date: 'Sep 2026', value: 42, prevValue: 35 },
    { date: 'Oct 2026', value: 26, prevValue: 22 }
  ],
  courseApprovals: [
    { date: 'Nov 2025', value: 14, prevValue: 11 },
    { date: 'Jan 2026', value: 19, prevValue: 16 },
    { date: 'Mar 2026', value: 23, prevValue: 19 },
    { date: 'May 2026', value: 27, prevValue: 22 },
    { date: 'Jul 2026', value: 25, prevValue: 21 },
    { date: 'Sep 2026', value: 34, prevValue: 28 },
    { date: 'Oct 2026', value: 20, prevValue: 17 }
  ],
  courseCompletions: [
    { date: 'Nov 2025', value: 160, prevValue: 135 },
    { date: 'Jan 2026', value: 220, prevValue: 185 },
    { date: 'Mar 2026', value: 265, prevValue: 220 },
    { date: 'May 2026', value: 310, prevValue: 260 },
    { date: 'Jul 2026', value: 345, prevValue: 295 },
    { date: 'Sep 2026', value: 430, prevValue: 370 },
    { date: 'Oct 2026', value: 270, prevValue: 230 }
  ]
};

export const mockActivityTrends = {
  '7D': sample7D,
  '30D': sample30D,
  '90D': sample90D,
  '1Y': sample1Y
};

export const mockPendingApprovals = [
  {
    id: 'c-app-101',
    title: 'Advanced Microservices Architecture with Go',
    instructor: 'Dr. Aris Thorne',
    category: 'Software Engineering',
    level: 'Advanced',
    submittedAt: '2026-10-15T09:30:00Z',
    modulesCount: 8,
    status: 'Pending Review'
  },
  {
    id: 'c-app-102',
    title: 'Modern Generative AI & Prompt Engineering',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    level: 'Intermediate',
    submittedAt: '2026-10-14T14:15:00Z',
    modulesCount: 6,
    status: 'Pending Review'
  },
  {
    id: 'c-app-103',
    title: 'Practical Cloud Security & Compliance',
    instructor: 'Marcus Vance',
    category: 'Cybersecurity',
    level: 'Intermediate',
    submittedAt: '2026-10-13T11:45:00Z',
    modulesCount: 7,
    status: 'Pending Review'
  },
  {
    id: 'c-app-104',
    title: 'Data Structures & Algorithms in Rust',
    instructor: 'Devon Miller',
    category: 'Computer Science',
    level: 'Beginner',
    submittedAt: '2026-10-12T16:20:00Z',
    modulesCount: 10,
    status: 'Pending Review'
  },
  {
    id: 'c-app-105',
    title: 'Full-Stack React Native & Mobile UX',
    instructor: 'Maya Lin',
    category: 'Mobile Development',
    level: 'All Levels',
    submittedAt: '2026-10-11T18:00:00Z',
    modulesCount: 9,
    status: 'Pending Review'
  }
];

export const mockRecentUsers = [
  {
    id: 'usr-801',
    name: 'Sofia Chen',
    email: 'sofia.chen@enterprise.io',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-16T15:20:00Z'
  },
  {
    id: 'usr-802',
    name: 'Liam O\'Connor',
    email: 'liam.oc@academy.edu',
    role: 'Learner',
    status: 'Active',
    joinedAt: '2026-10-16T11:10:00Z'
  },
  {
    id: 'usr-803',
    name: 'Dr. Tariq Al-Mansoor',
    email: 'tariq.mansoor@univ.org',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-15T18:40:00Z'
  },
  {
    id: 'usr-804',
    name: 'Amara Okafor',
    email: 'amara.o@techlab.com',
    role: 'Learner',
    status: 'Active',
    joinedAt: '2026-10-15T13:05:00Z'
  },
  {
    id: 'usr-805',
    name: 'Julian Keller',
    email: 'julian.keller@codebase.net',
    role: 'Learner',
    status: 'Pending',
    joinedAt: '2026-10-14T09:50:00Z'
  }
];

export const mockRecentCourses = [
  {
    id: 'crs-201',
    title: 'Kubernetes in Production: Zero to Hero',
    instructor: 'Marcus Vance',
    category: 'Cloud Engineering',
    createdAt: '2026-10-16T14:30:00Z',
    status: 'Published',
    enrolledCount: 142
  },
  {
    id: 'crs-202',
    title: 'Deep Learning with PyTorch 2.0',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    createdAt: '2026-10-15T10:15:00Z',
    status: 'Published',
    enrolledCount: 89
  },
  {
    id: 'crs-203',
    title: 'Advanced Microservices Architecture with Go',
    instructor: 'Dr. Aris Thorne',
    category: 'Software Engineering',
    createdAt: '2026-10-15T09:30:00Z',
    status: 'Pending Review',
    enrolledCount: 0
  },
  {
    id: 'crs-204',
    title: 'Modern Generative AI & Prompt Engineering',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    createdAt: '2026-10-14T14:15:00Z',
    status: 'Pending Review',
    enrolledCount: 0
  },
  {
    id: 'crs-205',
    title: 'Designing Accessible Systems (WCAG 2.2)',
    instructor: 'Maya Lin',
    category: 'Design & Accessibility',
    createdAt: '2026-10-13T16:00:00Z',
    status: 'Published',
    enrolledCount: 215
  }
];
