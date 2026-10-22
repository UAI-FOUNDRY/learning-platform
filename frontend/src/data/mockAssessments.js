/**
 * Realistic Mock Assessments Dataset for LearnSpace Super Admin Portal.
 * Includes quizzes and assignments linked to courses, instructors, and modules.
 */

export const mockAssessments = [
  {
    id: 'asm-101',
    title: 'Kubernetes Cluster Architecture & Pod Lifecycle Quiz',
    type: 'Quiz',
    courseId: 'crs-201',
    courseTitle: 'Kubernetes in Production: Zero to Hero',
    instructor: 'Marcus Vance',
    category: 'Cloud Engineering',
    status: 'Published',
    questionsCount: 15,
    tasksCount: null,
    totalMarks: 100,
    passingScore: 75,
    timeLimitMinutes: 30,
    attemptsAllowed: 3,
    createdAt: '2026-10-10T11:00:00Z',
    updatedAt: '2026-10-18T16:20:00Z',
    description: 'Comprehensive multiple-choice and scenario-based quiz testing cluster control planes, kubelet operations, and pod eviction strategies.',
    questions: [
      {
        id: 'q-101-1',
        prompt: 'Which component is responsible for maintaining the desired state of pods defined in Deployment manifests?',
        type: 'Multiple Choice',
        points: 5,
        options: ['kube-scheduler', 'kube-controller-manager', 'kubelet', 'etcd'],
        correctAnswer: 'kube-controller-manager'
      },
      {
        id: 'q-101-2',
        prompt: 'What happens to a Pod when its node becomes unreachable and the pod eviction timeout expires?',
        type: 'Multiple Choice',
        points: 5,
        options: ['Pod immediately terminates on node', 'Pod is rescheduled to a healthy node and marked Terminating on failed node', 'Pod is deleted permanently from etcd', 'Pod continues running without status updates'],
        correctAnswer: 'Pod is rescheduled to a healthy node and marked Terminating on failed node'
      },
      {
        id: 'q-101-3',
        prompt: 'ConfigMaps and Secrets can be mounted as volumes or exposed as environment variables.',
        type: 'True/False',
        points: 5,
        options: ['True', 'False'],
        correctAnswer: 'True'
      }
    ]
  },
  {
    id: 'asm-102',
    title: 'Production Helm Chart Deployment Challenge',
    type: 'Assignment',
    courseId: 'crs-201',
    courseTitle: 'Kubernetes in Production: Zero to Hero',
    instructor: 'Marcus Vance',
    category: 'Cloud Engineering',
    status: 'Published',
    questionsCount: null,
    tasksCount: 4,
    totalMarks: 100,
    passingScore: 70,
    timeLimitMinutes: null,
    submissionType: 'Git Repository & YAML Bundle',
    createdAt: '2026-10-11T14:30:00Z',
    updatedAt: '2026-10-19T09:45:00Z',
    description: 'Construct a reusable production-grade Helm v3 chart supporting horizontal pod autoscaling, ingress annotations for TLS termination, and readiness probes.',
    rubric: [
      { criterion: 'Chart templating structure and values.yaml validation', points: 30 },
      { criterion: 'Horizontal Pod Autoscaler (HPA) resource metrics integration', points: 25 },
      { criterion: 'TLS Ingress configuration with cert-manager annotations', points: 25 },
      { criterion: 'Readiness & liveness probe parameterization', points: 20 }
    ]
  },
  {
    id: 'asm-103',
    title: 'PyTorch Tensors, Autograd & Linear Layers Evaluation',
    type: 'Quiz',
    courseId: 'crs-202',
    courseTitle: 'Deep Learning with PyTorch 2.0',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    status: 'Published',
    questionsCount: 12,
    tasksCount: null,
    totalMarks: 60,
    passingScore: 80,
    timeLimitMinutes: 25,
    attemptsAllowed: 2,
    createdAt: '2026-10-12T08:15:00Z',
    updatedAt: '2026-10-17T11:30:00Z',
    description: 'Assesses foundational proficiency in tensor operations, autograd backward passes, device placement (CUDA/MPS), and loss functions.',
    questions: [
      {
        id: 'q-103-1',
        prompt: 'Which method call zeroes out accumulated gradients before the backward propagation pass?',
        type: 'Multiple Choice',
        points: 5,
        options: ['optimizer.step()', 'optimizer.zero_grad()', 'loss.backward()', 'torch.no_grad()'],
        correctAnswer: 'optimizer.zero_grad()'
      },
      {
        id: 'q-103-2',
        prompt: 'Setting torch.no_grad() disables gradient calculation, reducing memory consumption for evaluation.',
        type: 'True/False',
        points: 5,
        options: ['True', 'False'],
        correctAnswer: 'True'
      }
    ]
  },
  {
    id: 'asm-104',
    title: 'Transformer Multi-Head Self-Attention from Scratch',
    type: 'Assignment',
    courseId: 'crs-202',
    courseTitle: 'Deep Learning with PyTorch 2.0',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    status: 'Published',
    questionsCount: null,
    tasksCount: 3,
    totalMarks: 100,
    passingScore: 75,
    timeLimitMinutes: null,
    submissionType: 'Jupyter Notebook (.ipynb) & PyTorch Module',
    createdAt: '2026-10-13T10:00:00Z',
    updatedAt: '2026-10-20T14:10:00Z',
    description: 'Implement scaled dot-product attention and multi-head self-attention mechanisms in pure PyTorch without using torch.nn.MultiheadAttention.',
    rubric: [
      { criterion: 'Query, Key, Value linear projections and head splitting', points: 35 },
      { criterion: 'Scaled dot-product attention calculation with causal masking support', points: 35 },
      { criterion: 'Output linear projection and unit test suite passing on random batch', points: 30 }
    ]
  },
  {
    id: 'asm-105',
    title: 'Distributed Go Microservices & gRPC Concurrency Test',
    type: 'Quiz',
    courseId: 'c-app-101',
    courseTitle: 'Advanced Microservices Architecture with Go',
    instructor: 'Dr. Aris Thorne',
    category: 'Software Engineering',
    status: 'Draft',
    questionsCount: 10,
    tasksCount: null,
    totalMarks: 50,
    passingScore: 70,
    timeLimitMinutes: 20,
    attemptsAllowed: 2,
    createdAt: '2026-10-14T12:00:00Z',
    updatedAt: '2026-10-16T18:00:00Z',
    description: 'Evaluates goroutine lifecycle management, channel synchronization, gRPC interceptors, and dead-letter queue architectures.',
    questions: [
      {
        id: 'q-105-1',
        prompt: 'What happens when sending to an unbuffered channel when no receiver is ready?',
        type: 'Multiple Choice',
        points: 5,
        options: ['The value is dropped', 'The sending goroutine blocks until a receiver is ready', 'A runtime panic occurs', 'The value is queued in memory'],
        correctAnswer: 'The sending goroutine blocks until a receiver is ready'
      }
    ]
  },
  {
    id: 'asm-106',
    title: 'Event-Driven Order Processing System with Kafka',
    type: 'Assignment',
    courseId: 'c-app-101',
    courseTitle: 'Advanced Microservices Architecture with Go',
    instructor: 'Dr. Aris Thorne',
    category: 'Software Engineering',
    status: 'Published',
    questionsCount: null,
    tasksCount: 4,
    totalMarks: 100,
    passingScore: 70,
    timeLimitMinutes: null,
    submissionType: 'Go Project & Docker Compose',
    createdAt: '2026-10-14T15:30:00Z',
    updatedAt: '2026-10-19T13:45:00Z',
    description: 'Architect a 3-service distributed order management workflow featuring outbox pattern database transactions, Kafka message publishing, and idempotent consumers.',
    rubric: [
      { criterion: 'Transactional outbox pattern implementation preventing dual-write failure', points: 30 },
      { criterion: 'Idempotent Kafka consumer group with duplicate message deduplication', points: 30 },
      { criterion: 'gRPC contract definitions and error status propagation', points: 25 },
      { criterion: 'Docker Compose orchestration and graceful shutdown handling', points: 15 }
    ]
  },
  {
    id: 'asm-107',
    title: 'Prompt Engineering, RAG Pipelines & Embeddings Checkpoint',
    type: 'Quiz',
    courseId: 'c-app-102',
    courseTitle: 'Modern Generative AI & Prompt Engineering',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    status: 'Published',
    questionsCount: 15,
    tasksCount: null,
    totalMarks: 75,
    passingScore: 75,
    timeLimitMinutes: 30,
    attemptsAllowed: 3,
    createdAt: '2026-10-15T09:15:00Z',
    updatedAt: '2026-10-20T10:15:00Z',
    description: 'Checkpoint quiz on chunking strategies, vector cosine similarity, system prompt constraints, and hallucinations mitigation.',
    questions: [
      {
        id: 'q-107-1',
        prompt: 'Which metric measures the orientation between two normalized vector embeddings regardless of their magnitude?',
        type: 'Multiple Choice',
        points: 5,
        options: ['Euclidean L2 Distance', 'Cosine Similarity', 'Manhattan Distance', 'Hamming Distance'],
        correctAnswer: 'Cosine Similarity'
      }
    ]
  },
  {
    id: 'asm-108',
    title: 'Vector Search Chatbot Implementation',
    type: 'Assignment',
    courseId: 'c-app-102',
    courseTitle: 'Modern Generative AI & Prompt Engineering',
    instructor: 'Prof. Elena Rostova',
    category: 'Artificial Intelligence',
    status: 'Draft',
    questionsCount: null,
    tasksCount: 3,
    totalMarks: 100,
    passingScore: 80,
    timeLimitMinutes: null,
    submissionType: 'Python Codebase & Streamlit UI',
    createdAt: '2026-10-15T14:00:00Z',
    updatedAt: '2026-10-18T17:30:00Z',
    description: 'Develop a functional RAG document search assistant utilizing Chroma/Qdrant vector stores, recursive character text chunking, and source citation generation.',
    rubric: [
      { criterion: 'Document ingestion, chunking with overlap, and embedding generation', points: 35 },
      { criterion: 'Top-K semantic retrieval and context injection into LLM prompt', points: 35 },
      { criterion: 'Source citation attribution and conversational history management', points: 30 }
    ]
  },
  {
    id: 'asm-109',
    title: 'Data Structures: Balanced Trees & Graph Traversal Quiz',
    type: 'Quiz',
    courseId: 'crs-204',
    courseTitle: 'Data Structures & Algorithms Masterclass',
    instructor: 'Dr. Devonte Miller',
    category: 'Computer Science',
    status: 'Published',
    questionsCount: 20,
    tasksCount: null,
    totalMarks: 100,
    passingScore: 70,
    timeLimitMinutes: 45,
    attemptsAllowed: 2,
    createdAt: '2026-10-08T10:00:00Z',
    updatedAt: '2026-10-17T12:00:00Z',
    description: 'Tests AVL tree rotations, Red-Black tree properties, Breadth-First Search (BFS), and Depth-First Search (DFS) time complexities.',
    questions: [
      {
        id: 'q-109-1',
        prompt: 'What is the worst-case time complexity of searching an element in a balanced AVL tree with N nodes?',
        type: 'Multiple Choice',
        points: 5,
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
        correctAnswer: 'O(log N)'
      }
    ]
  },
  {
    id: 'asm-110',
    title: 'Dijkstra & A* Shortest Path Pathfinder Lab',
    type: 'Assignment',
    courseId: 'crs-204',
    courseTitle: 'Data Structures & Algorithms Masterclass',
    instructor: 'Dr. Devonte Miller',
    category: 'Computer Science',
    status: 'Published',
    questionsCount: null,
    tasksCount: 3,
    totalMarks: 100,
    passingScore: 75,
    timeLimitMinutes: null,
    submissionType: 'Python Algorithm Suite & Benchmark Results',
    createdAt: '2026-10-09T13:20:00Z',
    updatedAt: '2026-10-18T15:00:00Z',
    description: 'Implement optimized Dijkstra shortest-path with min-heap priority queues and comparative A* heuristic search on weighted grid mazes.',
    rubric: [
      { criterion: 'Min-heap priority queue backed Dijkstra implementation', points: 40 },
      { criterion: 'A* search algorithm with Manhattan & Euclidean admissible heuristics', points: 35 },
      { criterion: 'Benchmark performance report across sparse vs dense graph benchmarks', points: 25 }
    ]
  },
  {
    id: 'asm-111',
    title: 'React 19 Server Components & Suspense Architecture',
    type: 'Quiz',
    courseId: 'crs-205',
    courseTitle: 'Full-Stack React & Next.js 15',
    instructor: 'Sarah Jenkins',
    category: 'Software Engineering',
    status: 'Published',
    questionsCount: 12,
    tasksCount: null,
    totalMarks: 60,
    passingScore: 75,
    timeLimitMinutes: 20,
    attemptsAllowed: 3,
    createdAt: '2026-10-11T16:00:00Z',
    updatedAt: '2026-10-19T11:20:00Z',
    description: 'Focuses on React Server Components (RSC) boundary rules, useActionState hooks, optimistic updates, and streaming SSR.',
    questions: [
      {
        id: 'q-111-1',
        prompt: 'React Server Components can directly access server-side resources like databases without sending sensitive code to the client browser.',
        type: 'True/False',
        points: 5,
        options: ['True', 'False'],
        correctAnswer: 'True'
      }
    ]
  },
  {
    id: 'asm-112',
    title: 'WCAG 2.2 Level AA Accessibility Audit & Remediations',
    type: 'Assignment',
    courseId: 'crs-206',
    courseTitle: 'Design Systems & WCAG 2.2 Accessibility',
    instructor: 'Amara Chen',
    category: 'Design & Accessibility',
    status: 'Published',
    questionsCount: null,
    tasksCount: 3,
    totalMarks: 100,
    passingScore: 80,
    timeLimitMinutes: null,
    submissionType: 'Accessibility Audit Report & Fixed HTML/CSS Components',
    createdAt: '2026-10-12T11:45:00Z',
    updatedAt: '2026-10-19T14:30:00Z',
    description: 'Conduct a thorough automated and manual screen reader audit on an intentionally broken web portal, remedying contrast, focus rings, and ARIA labels.',
    rubric: [
      { criterion: 'Screen reader accessibility and keyboard focus trap elimination', points: 40 },
      { criterion: 'Color contrast ratio compliance (4.5:1 text, 3:1 graphical elements)', points: 30 },
      { criterion: 'Correct semantic HTML element and ARIA role usage', points: 30 }
    ]
  },
  {
    id: 'asm-113',
    title: 'Docker Security & Container Hardening Exam',
    type: 'Quiz',
    courseId: 'crs-203',
    courseTitle: 'Cloud Native Security Fundamentals',
    instructor: 'Marcus Vance',
    category: 'Cybersecurity',
    status: 'Archived',
    questionsCount: 15,
    tasksCount: null,
    totalMarks: 75,
    passingScore: 70,
    timeLimitMinutes: 30,
    attemptsAllowed: 1,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-10-05T16:00:00Z',
    description: 'Legacy exam assessing rootless container configurations, vulnerability scanning with Trivy, and read-only root filesystems.',
    questions: [
      {
        id: 'q-113-1',
        prompt: 'Why should production containers avoid executing processes as the root user (UID 0)?',
        type: 'Multiple Choice',
        points: 5,
        options: ['It slows down network throughput', 'It increases the blast radius if container breakout vulnerabilities are exploited', 'Docker does not support root execution', 'It disables container logging'],
        correctAnswer: 'It increases the blast radius if container breakout vulnerabilities are exploited'
      }
    ]
  },
  {
    id: 'asm-114',
    title: 'OAuth2 & OpenID Connect Authorization Gateway Lab',
    type: 'Assignment',
    courseId: 'crs-203',
    courseTitle: 'Cloud Native Security Fundamentals',
    instructor: 'Marcus Vance',
    category: 'Cybersecurity',
    status: 'Draft',
    questionsCount: null,
    tasksCount: 3,
    totalMarks: 100,
    passingScore: 70,
    timeLimitMinutes: null,
    submissionType: 'Security Architecture Diagram & Go Middleware',
    createdAt: '2026-10-16T11:00:00Z',
    updatedAt: '2026-10-20T09:30:00Z',
    description: 'Configure an API gateway validating JWT access tokens with JWKS endpoints, PKCE verification, and scope-based route protection.',
    rubric: [
      { criterion: 'PKCE Authorization Code Flow implementation', points: 35 },
      { criterion: 'JWKS asymmetric cryptographic signature verification', points: 35 },
      { criterion: 'RBAC and token scope claim parsing middleware', points: 30 }
    ]
  }
];
