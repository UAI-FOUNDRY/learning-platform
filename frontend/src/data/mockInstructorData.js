/**
 * Mock Data for Instructor Portal
 * Represents instructor profile, curriculum structure, learner statistics,
 * and recent student interactions.
 */

export const mockInstructorProfile = {
  id: 'inst-101',
  name: 'Prof. Elena Rostova',
  role: 'Senior Instructor & Faculty Member',
  department: 'Department of Computer Science & AI',
  email: 'elena.rostova@learnspace.org',
  avatar: 'ER'
};

export const initialInstructorCourses = [
  {
    id: 'crs-inst-101',
    title: 'Deep Learning with PyTorch 2.0',
    description: 'Build transformer architectures, convolutional networks, and scalable model training pipelines from scratch with PyTorch.',
    category: 'Artificial Intelligence',
    level: 'Advanced',
    language: 'English',
    status: 'Published',
    enrolledCount: 142,
    rating: 4.8,
    ratingCount: 38,
    createdAt: '2026-09-10T08:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    learningObjectives: [
      'Implement multi-head attention and transformer decoders in PyTorch',
      'Train large vision models with mixed-precision and distributed data parallel',
      'Optimize neural network inference using TorchScript and ONNX',
      'Deploy production inference servers with TorchServe'
    ],
    prerequisites: [
      'Proficiency in Python and object-oriented programming',
      'Multivariate calculus, linear algebra, and basic probability',
      'Familiarity with standard machine learning concepts'
    ],
    modules: [
      {
        id: 'mod-101-1',
        title: 'Module 1: Modern PyTorch Fundamentals & Autograd',
        lessons: [
          { id: 'les-101-1', title: 'Tensors, Broadcasting, and Memory Layouts', type: 'Video', duration: '18 min' },
          { id: 'les-101-2', title: 'Computational Graphs & Custom Autograd Functions', type: 'Video', duration: '22 min' },
          { id: 'les-101-3', title: 'Implementing Softmax & Cross-Entropy from Scratch', type: 'Coding Exercise', duration: '30 min' }
        ]
      },
      {
        id: 'mod-101-2',
        title: 'Module 2: Convolutional Networks & Transfer Learning',
        lessons: [
          { id: 'les-101-4', title: 'Modern CNN Architectures: ConvNeXt and ResNet-50', type: 'Video', duration: '25 min' },
          { id: 'les-101-5', title: 'Fine-tuning Pretrained Weights on Medical Imaging', type: 'Coding Exercise', duration: '40 min' },
          { id: 'les-101-6', title: 'CNN Architecture & Overfitting Quiz', type: 'Quiz', duration: '15 min' }
        ]
      },
      {
        id: 'mod-101-3',
        title: 'Module 3: Attention Mechanisms and Transformers',
        lessons: [
          { id: 'les-101-7', title: 'Self-Attention Mathematical Derivation', type: 'Article', duration: '12 min' },
          { id: 'les-101-8', title: 'Building Transformer Blocks Step by Step', type: 'Video', duration: '35 min' },
          { id: 'les-101-9', title: 'Attention Layer Implementation Exercise', type: 'Coding Exercise', duration: '45 min' }
        ]
      }
    ]
  },
  {
    id: 'crs-inst-102',
    title: 'Modern Generative AI & Prompt Engineering',
    description: 'Explore LLM fundamentals, retrieval-augmented generation (RAG), vector databases, and multi-agent workflows.',
    category: 'Artificial Intelligence',
    level: 'Intermediate',
    language: 'English',
    status: 'Pending Review',
    enrolledCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt: '2026-10-18T10:30:00Z',
    submittedAt: '2026-10-18T10:30:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
    learningObjectives: [
      'Master advanced prompting: Few-shot, Chain-of-Thought, and ReAct',
      'Build retrieval-augmented generation (RAG) pipelines with hybrid search',
      'Evaluate and benchmark generative AI applications with LangSmith'
    ],
    prerequisites: [
      'Intermediate Python knowledge',
      'Basic understanding of vector embeddings and cosine similarity'
    ],
    modules: [
      {
        id: 'mod-102-1',
        title: 'Module 1: Foundations of Large Language Models',
        lessons: [
          { id: 'les-102-1', title: 'How Tokenization and Next-Token Prediction Work', type: 'Video', duration: '15 min' },
          { id: 'les-102-2', title: 'Prompt Engineering Strategies & Failure Modes', type: 'Article', duration: '20 min' }
        ]
      },
      {
        id: 'mod-102-2',
        title: 'Module 2: Building Production RAG Systems',
        lessons: [
          { id: 'les-102-3', title: 'Chunking Strategies & Vector Indexing', type: 'Video', duration: '28 min' },
          { id: 'les-102-4', title: 'RAG Pipeline with FAISS and FastEmbed', type: 'Coding Exercise', duration: '35 min' }
        ]
      }
    ]
  },
  {
    id: 'crs-inst-103',
    title: 'Computer Vision & Autonomous Agents',
    description: 'Real-time object detection with YOLOv8, visual SLAM algorithms, and multi-agent perception pipelines.',
    category: 'Artificial Intelligence',
    level: 'Advanced',
    language: 'English',
    status: 'Changes Requested',
    enrolledCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: '2026-10-05T09:15:00Z',
    updatedAt: '2026-10-16T15:20:00Z',
    submittedAt: '2026-10-14T11:00:00Z',
    feedback: 'Super Admin Feedback: Please add at least 2 practical coding exercises for real-time edge inference in Module 2, and clarify prerequisite requirements for OpenCV and CUDA drivers before resubmitting.',
    feedbackDate: '2026-10-16T15:20:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=600&q=80',
    learningObjectives: [
      'Implement real-time object tracking and boundary box calculation',
      'Build end-to-end perception systems for edge devices',
      'Integrate vision sensors into ROS 2 autonomous navigation nodes'
    ],
    prerequisites: [
      'C++ or Python',
      'Calculus & Linear Algebra',
      'Basic Computer Vision principles with OpenCV'
    ],
    modules: [
      {
        id: 'mod-103-1',
        title: 'Module 1: Edge Vision & YOLO Architectures',
        lessons: [
          { id: 'les-103-1', title: 'Architecture Evolution from YOLOv5 to YOLOv8', type: 'Video', duration: '24 min' },
          { id: 'les-103-2', title: 'Dataset Annotation and Augmentation Pipeline', type: 'Article', duration: '16 min' }
        ]
      },
      {
        id: 'mod-103-2',
        title: 'Module 2: SLAM and Spatial Localization',
        lessons: [
          { id: 'les-103-3', title: 'Feature Detection: ORB and SIFT Algorithms', type: 'Video', duration: '30 min' },
          { id: 'les-103-4', title: 'Point Cloud Reconstruction Basics', type: 'Video', duration: '20 min' }
        ]
      }
    ]
  },
  {
    id: 'crs-inst-104',
    title: 'Neural Network Architectures & Optimization',
    description: 'In-depth study of gradient descent variations, adaptive learning rates, batch normalization, and weight initialization strategies.',
    category: 'Computer Science',
    level: 'Intermediate',
    language: 'English',
    status: 'Draft',
    enrolledCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: '2026-10-17T11:20:00Z',
    updatedAt: '2026-10-17T11:20:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
    learningObjectives: [
      'Analyze convergence rates of AdamW, RMSProp, and SGD with Momentum',
      'Debug vanishing and exploding gradients in deep residual networks',
      'Formulate custom loss functions for imbalanced multi-class datasets'
    ],
    prerequisites: [
      'Python programming',
      'Multivariable calculus and matrix operations'
    ],
    modules: [
      {
        id: 'mod-104-1',
        title: 'Module 1: Loss Landscapes & Optimization Dynamics',
        lessons: [
          { id: 'les-104-1', title: 'Stochastic Gradient Descent and Saddle Points', type: 'Video', duration: '20 min' },
          { id: 'les-104-2', title: 'Momentum, Nesterov, and Adaptive Methods', type: 'Video', duration: '25 min' }
        ]
      }
    ]
  },
  {
    id: 'crs-inst-105',
    title: 'Practical Python for Data Science & Machine Learning',
    description: 'Hands-on data manipulation with NumPy, Pandas, data visualization with Seaborn, and foundational statistical modeling.',
    category: 'Data Science',
    level: 'Beginner',
    language: 'English',
    status: 'Published',
    enrolledCount: 267,
    rating: 4.9,
    ratingCount: 64,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-10-10T16:00:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    learningObjectives: [
      'Manipulate multi-dimensional arrays efficiently with NumPy vectorized operations',
      'Clean, aggregate, and transform complex tabular data with Pandas',
      'Produce publication-ready interactive visualizations and statistical dashboards'
    ],
    prerequisites: [
      'No prior programming experience required'
    ],
    modules: [
      {
        id: 'mod-105-1',
        title: 'Module 1: Vectorized Computing with NumPy',
        lessons: [
          { id: 'les-105-1', title: 'NumPy Arrays vs Python Lists Performance', type: 'Video', duration: '14 min' },
          { id: 'les-105-2', title: 'Boolean Indexing & Masking in NumPy', type: 'Coding Exercise', duration: '20 min' }
        ]
      },
      {
        id: 'mod-105-2',
        title: 'Module 2: Data Wrangling with Pandas',
        lessons: [
          { id: 'les-105-3', title: 'Series and DataFrames Deep Dive', type: 'Video', duration: '22 min' },
          { id: 'les-105-4', title: 'Groupby Operations and Pivot Tables', type: 'Coding Exercise', duration: '30 min' },
          { id: 'les-105-5', title: 'Data Cleaning Mastery Quiz', type: 'Quiz', duration: '15 min' }
        ]
      }
    ]
  }
];

export const mockLearnerStats = {
  totalStudents: 409,
  averageRating: 4.86,
  totalRatingsCount: 102,
  completionRate: 78.5,
  activeInquiries: 14,
  monthlyEnrollments: [
    { month: 'May', count: 48 },
    { month: 'Jun', count: 62 },
    { month: 'Jul', count: 75 },
    { month: 'Aug', count: 88 },
    { month: 'Sep', count: 110 },
    { month: 'Oct', count: 126 }
  ]
};

export const mockRecentActivity = [
  {
    id: 'act-1',
    type: 'enrollment',
    title: 'New Student Enrollment',
    description: 'Sarah Chen enrolled in Deep Learning with PyTorch 2.0',
    time: '15 minutes ago',
    icon: 'user'
  },
  {
    id: 'act-2',
    type: 'code_pass',
    title: 'Coding Exercise Passed',
    description: 'Marcus Brody passed all 5 test cases on "Implementing Softmax"',
    time: '1 hour ago',
    icon: 'code'
  },
  {
    id: 'act-3',
    type: 'question',
    title: 'New Student Question',
    description: 'Alex Rivera: "Clarification on tensor broadcasting in Lesson 1"',
    time: '2 hours ago',
    icon: 'message'
  },
  {
    id: 'act-4',
    type: 'feedback',
    title: 'Admin Review Update',
    description: 'Super Admin reviewed "Computer Vision & Autonomous Agents" with notes',
    time: '1 day ago',
    icon: 'review'
  },
  {
    id: 'act-5',
    type: 'rating',
    title: '5-Star Rating Received',
    description: 'Deep Learning with PyTorch 2.0 received a 5.0 rating with positive review',
    time: '2 days ago',
    icon: 'star'
  }
];
