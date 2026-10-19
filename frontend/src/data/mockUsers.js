/**
 * Comprehensive Mock User Dataset
 * Used for Super Admin User Management and platform administrative oversight.
 * Includes realistic metadata: IDs, names, emails, roles, account statuses,
 * registration dates, organizations, and activity metrics.
 */

export const mockUsers = [
  {
    id: 'usr-801',
    name: 'Sofia Chen',
    email: 'sofia.chen@enterprise.io',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-16T15:20:00Z',
    organization: 'Enterprise Cloud Institute',
    coursesCount: 3,
    enrollmentsCount: 0,
    lastActive: '2026-10-19T08:30:00Z'
  },
  {
    id: 'usr-802',
    name: "Liam O'Connor",
    email: 'liam.oc@academy.edu',
    role: 'Learner',
    status: 'Active',
    joinedAt: '2026-10-16T11:10:00Z',
    organization: 'Apex Engineering Academy',
    coursesCount: 0,
    enrollmentsCount: 6,
    lastActive: '2026-10-19T06:15:00Z'
  },
  {
    id: 'usr-803',
    name: 'Dr. Tariq Al-Mansoor',
    email: 'tariq.mansoor@univ.org',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-15T18:40:00Z',
    organization: 'Global Science University',
    coursesCount: 4,
    enrollmentsCount: 0,
    lastActive: '2026-10-18T19:20:00Z'
  },
  {
    id: 'usr-804',
    name: 'Amara Okafor',
    email: 'amara.o@techlab.com',
    role: 'Learner',
    status: 'Active',
    joinedAt: '2026-10-15T13:05:00Z',
    organization: 'TechLab Research',
    coursesCount: 0,
    enrollmentsCount: 4,
    lastActive: '2026-10-19T07:45:00Z'
  },
  {
    id: 'usr-805',
    name: 'Julian Keller',
    email: 'julian.keller@codebase.net',
    role: 'Learner',
    status: 'Pending',
    joinedAt: '2026-10-14T09:50:00Z',
    organization: 'Independent Student',
    coursesCount: 0,
    enrollmentsCount: 1,
    lastActive: '2026-10-14T10:12:00Z'
  },
  {
    id: 'usr-806',
    name: 'Marcus Vance',
    email: 'marcus.vance@cloudsec.io',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-13T14:00:00Z',
    organization: 'Cyber Defense Academy',
    coursesCount: 5,
    enrollmentsCount: 0,
    lastActive: '2026-10-19T09:10:00Z'
  },
  {
    id: 'usr-807',
    name: 'Prof. Elena Rostova',
    email: 'elena.rostova@ai-institute.org',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-12T08:15:00Z',
    organization: 'Institute for Advanced AI',
    coursesCount: 6,
    enrollmentsCount: 0,
    lastActive: '2026-10-18T16:40:00Z'
  },
  {
    id: 'usr-808',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@distributed.edu',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-11T12:30:00Z',
    organization: 'Center for Systems Architecture',
    coursesCount: 3,
    enrollmentsCount: 0,
    lastActive: '2026-10-17T14:20:00Z'
  },
  {
    id: 'usr-809',
    name: 'Maya Lin',
    email: 'maya.lin@uxdesign.studio',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-10T16:45:00Z',
    organization: 'Human Interface Collective',
    coursesCount: 4,
    enrollmentsCount: 0,
    lastActive: '2026-10-19T05:50:00Z'
  },
  {
    id: 'usr-810',
    name: 'Devon Miller',
    email: 'devon.miller@rustlang.dev',
    role: 'Instructor',
    status: 'Active',
    joinedAt: '2026-10-09T10:20:00Z',
    organization: 'Systems Programming Lab',
    coursesCount: 2,
    enrollmentsCount: 0,
    lastActive: '2026-10-16T18:00:00Z'
  },
  {
    id: 'usr-811',
    name: 'Dr. Robert Hayes',
    email: 'admin@learnspace.io',
    role: 'Super Admin',
    status: 'Active',
    joinedAt: '2026-09-01T08:00:00Z',
    organization: 'LearnSpace Headquarters',
    coursesCount: 0,
    enrollmentsCount: 0,
    lastActive: '2026-10-19T09:40:00Z'
  },
  {
    id: 'usr-812',
    name: 'Clara Oswald',
    email: 'clara.oswald@admin.learnspace.io',
    role: 'Super Admin',
    status: 'Active',
    joinedAt: '2026-09-15T09:30:00Z',
    organization: 'LearnSpace Governance',
    coursesCount: 0,
    enrollmentsCount: 0,
    lastActive: '2026-10-19T08:55:00Z'
  },
  {
    id: 'usr-813',
    name: 'Lucas Vance',
    email: 'lucas.vance@student.edu',
    role: 'Learner',
    status: 'Suspended',
    joinedAt: '2026-10-05T14:10:00Z',
    organization: 'Metropolitan University',
    coursesCount: 0,
    enrollmentsCount: 2,
    lastActive: '2026-10-14T11:20:00Z'
  },
  {
    id: 'usr-814',
    name: 'Chloe Bennett',
    email: 'c.bennett@enterprise.org',
    role: 'Learner',
    status: 'Suspended',
    joinedAt: '2026-09-28T16:00:00Z',
    organization: 'Enterprise Solutions Inc.',
    coursesCount: 0,
    enrollmentsCount: 5,
    lastActive: '2026-10-12T15:30:00Z'
  },
  {
    id: 'usr-815',
    name: 'Priya Patel',
    email: 'priya.p@polytech.edu',
    role: 'Learner',
    status: 'Active',
    joinedAt: '2026-10-04T11:25:00Z',
    organization: 'Polytechnic Institute',
    coursesCount: 0,
    enrollmentsCount: 8,
    lastActive: '2026-10-19T07:10:00Z'
  },
  {
    id: 'usr-816',
    name: 'Kenji Sato',
    email: 'kenji.sato@globalnet.jp',
    role: 'Learner',
    status: 'Active',
    joinedAt: '2026-10-03T09:15:00Z',
    organization: 'Tokyo Applied Informatics',
    coursesCount: 0,
    enrollmentsCount: 3,
    lastActive: '2026-10-18T14:05:00Z'
  },
  {
    id: 'usr-817',
    name: 'David Kim',
    email: 'david.kim@frontendlab.io',
    role: 'Learner',
    status: 'Pending',
    joinedAt: '2026-10-02T13:40:00Z',
    organization: 'Seoul Web Studio',
    coursesCount: 0,
    enrollmentsCount: 0,
    lastActive: '2026-10-02T13:45:00Z'
  },
  {
    id: 'usr-818',
    name: 'Emily Watson',
    email: 'emily.watson@bioresearch.org',
    role: 'Instructor',
    status: 'Suspended',
    joinedAt: '2026-09-20T10:00:00Z',
    organization: 'Computational Biology Lab',
    coursesCount: 1,
    enrollmentsCount: 0,
    lastActive: '2026-10-08T16:20:00Z'
  }
];
