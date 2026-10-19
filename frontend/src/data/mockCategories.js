/**
 * Comprehensive Course Taxonomy & Category Dataset
 * Shared across Public Catalog, Course Creation, and Super Admin Category Management.
 */

export const mockCategories = [
  {
    id: 'cat-101',
    name: 'Computer Science',
    slug: 'computer-science',
    description: 'Foundational computing theories, algorithmic complexity, data structures, and computer architecture.',
    status: 'Active',
    icon: '💻',
    subcategories: ['Data Structures & Algorithms', 'Theory of Computation', 'Computer Architecture', 'Operating Systems'],
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z'
  },
  {
    id: 'cat-102',
    name: 'Software Engineering',
    slug: 'software-engineering',
    description: 'Full-stack application development, distributed system design, microservices, and design patterns.',
    status: 'Active',
    icon: '⚙️',
    subcategories: ['Microservices', 'Web Development', 'Design Patterns', 'Legacy Systems', 'Testing & QA'],
    createdAt: '2026-08-05T10:30:00Z',
    updatedAt: '2026-10-16T14:00:00Z'
  },
  {
    id: 'cat-103',
    name: 'Artificial Intelligence',
    slug: 'artificial-intelligence',
    description: 'Machine learning, deep neural networks, transformer models, LLMs, and prompt engineering.',
    status: 'Active',
    icon: '🤖',
    subcategories: ['Deep Learning', 'LLMs & Prompt Engineering', 'Computer Vision', 'Reinforcement Learning'],
    createdAt: '2026-08-10T11:00:00Z',
    updatedAt: '2026-10-17T09:30:00Z'
  },
  {
    id: 'cat-104',
    name: 'Cloud Engineering',
    slug: 'cloud-engineering',
    description: 'Cloud infrastructure, container orchestration with Kubernetes, CI/CD pipelines, and serverless compute.',
    status: 'Active',
    icon: '☁️',
    subcategories: ['Kubernetes & Containers', 'DevOps & CI/CD', 'Serverless Architecture', 'Cloud Networking'],
    createdAt: '2026-08-12T14:15:00Z',
    updatedAt: '2026-10-14T16:20:00Z'
  },
  {
    id: 'cat-105',
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    description: 'Information security, penetration testing, ethical hacking, identity management, and compliance auditing.',
    status: 'Active',
    icon: '🛡️',
    subcategories: ['Cloud Security', 'Ethical Hacking', 'Zero Trust Architecture', 'Incident Response'],
    createdAt: '2026-08-15T08:45:00Z',
    updatedAt: '2026-10-13T11:10:00Z'
  },
  {
    id: 'cat-106',
    name: 'Design & Accessibility',
    slug: 'design-accessibility',
    description: 'User experience research, accessible web interfaces (WCAG 2.2), design systems, and inclusive UI.',
    status: 'Active',
    icon: '🎨',
    subcategories: ['WCAG 2.2 Compliance', 'Design Systems', 'Inclusive UX', 'Prototyping & Figma'],
    createdAt: '2026-08-18T13:00:00Z',
    updatedAt: '2026-10-12T15:00:00Z'
  },
  {
    id: 'cat-107',
    name: 'Mobile Development',
    slug: 'mobile-development',
    description: 'Cross-platform and native mobile applications for iOS and Android with modern frameworks.',
    status: 'Active',
    icon: '📱',
    subcategories: ['React Native', 'iOS & Swift', 'Android & Kotlin', 'Mobile UX & Gestures'],
    createdAt: '2026-08-20T16:30:00Z',
    updatedAt: '2026-10-11T17:40:00Z'
  },
  {
    id: 'cat-108',
    name: 'Data Science',
    slug: 'data-science',
    description: 'Statistical modeling, exploratory data analysis, pipeline engineering, and big data visualization.',
    status: 'Active',
    icon: '📊',
    subcategories: ['Statistical Analysis', 'Machine Learning Operations', 'Big Data Engineering', 'Data Visualization'],
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-10-10T12:00:00Z'
  },
  {
    id: 'cat-109',
    name: 'Business & Management',
    slug: 'business-management',
    description: 'Strategic leadership, Agile product management, organizational transformation, and tech entrepreneurship.',
    status: 'Inactive',
    icon: '💼',
    subcategories: ['Agile Project Management', 'Technology Leadership', 'Product Strategy', 'Executive Governance'],
    createdAt: '2026-09-01T15:20:00Z',
    updatedAt: '2026-10-05T09:00:00Z'
  }
];
