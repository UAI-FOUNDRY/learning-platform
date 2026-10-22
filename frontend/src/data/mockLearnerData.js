/**
 * Realistic Mock Data for LearnSpace Learner Portal
 * Supports student profile, enrollments, curriculum progress,
 * quizzes, assignments, coding challenges, notes, and certificates.
 */

export const mockLearnerProfile = {
  id: 'lrn-2026-001',
  name: 'Sarah Chen',
  email: 'sarah.chen@stanford.edu',
  avatar: 'SC',
  role: 'Learner',
  headline: 'Senior Computer Science Student @ Stanford University',
  institution: 'Stanford University',
  department: 'School of Engineering',
  enrolledSince: 'September 2025',
  stats: {
    hoursLearned: 48.5,
    streakDays: 12,
    completedCourses: 1,
    inProgressCourses: 2,
    totalPoints: 1450,
    rankTitle: 'Advanced Scholar'
  },
  learningGoal: {
    weeklyTargetHours: 8,
    completedHoursThisWeek: 6.5,
    streakGoalDays: 14
  },
  interests: ['Artificial Intelligence', 'Deep Learning', 'Cloud Systems', 'Accessibility'],
  badges: [
    {
      id: 'bdg-1',
      title: 'PyTorch Maestro',
      description: 'Completed 10 advanced neural network exercises',
      icon: '⚡',
      earnedAt: '2026-10-14',
      unlocked: true
    },
    {
      id: 'bdg-2',
      title: '12-Day Streak',
      description: 'Studied consistently for 12 days without interruption',
      icon: '🔥',
      earnedAt: '2026-10-21',
      unlocked: true
    },
    {
      id: 'bdg-3',
      title: 'Code Evaluator',
      description: 'Passed all unit test cases on first submission',
      icon: '💻',
      earnedAt: '2026-10-18',
      unlocked: true
    },
    {
      id: 'bdg-4',
      title: 'WCAG Specialist',
      description: 'Earned certified certificate in Accessible Systems',
      icon: '🏆',
      earnedAt: '2026-10-12',
      unlocked: true
    },
    {
      id: 'bdg-5',
      title: 'Community Scholar',
      description: 'Contributed 5 upvoted answers in lecture discussions',
      icon: '💡',
      earnedAt: null,
      unlocked: false
    },
    {
      id: 'bdg-6',
      title: 'Polyglot Developer',
      description: 'Complete coding exercises in 3 different languages',
      icon: '🌐',
      earnedAt: null,
      unlocked: false
    }
  ]
};

export const initialEnrolledCourses = [
  {
    id: 'crs-inst-101',
    title: 'Deep Learning with PyTorch 2.0',
    description: 'Build transformer architectures, convolutional networks, and scalable model training pipelines from scratch with PyTorch.',
    instructor: 'Prof. Elena Rostova',
    instructorTitle: 'Senior Faculty in Artificial Intelligence',
    category: 'Artificial Intelligence',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    progressPercent: 66,
    enrolledAt: '2026-10-01',
    lastAccessedAt: '2026-10-21T14:30:00Z',
    lastLessonId: 'les-101-3',
    lastLessonTitle: 'Implementing Softmax & Cross-Entropy from Scratch',
    totalLessons: 9,
    completedLessonsCount: 6,
    modules: [
      {
        id: 'mod-101-1',
        title: 'Module 1: Modern PyTorch Fundamentals & Autograd',
        lessons: [
          {
            id: 'les-101-1',
            title: 'Tensors, Broadcasting, and Memory Layouts',
            type: 'Video',
            duration: '18 min',
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            summary: 'Comprehensive deep dive into multi-dimensional stride layouts, GPU device memory allocations, and automatic broadcasting mechanics in modern PyTorch 2.0.',
            notes: 'Strides in memory are contiguous along dimension 0 for row-major order. Use .contiguous() when reshaping non-contiguous sliced tensors.'
          },
          {
            id: 'les-101-2',
            title: 'Computational Graphs & Custom Autograd Functions',
            type: 'Video',
            duration: '22 min',
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            summary: 'How PyTorch constructs dynamic Directed Acyclic Graphs (DAGs) on every forward pass and executes reverse-mode automatic differentiation with custom backwards.',
            notes: 'Always inherit from torch.autograd.Function and decorate forward/backward with @staticmethod.'
          },
          {
            id: 'les-101-3',
            title: 'Implementing Softmax & Cross-Entropy from Scratch',
            type: 'Coding Exercise',
            duration: '30 min',
            completed: true,
            exerciseId: 'code-ex-101',
            summary: 'Implement numerically stable Log-Softmax and negative log-likelihood loss functions to prevent floating-point underflow/overflow.',
            starterCode: `import math

def log_softmax_custom(logits):
    """
    Compute numerically stable log-softmax for a list of logits.
    LogSoftmax(x_i) = x_i - c - log(sum(exp(x_j - c))) where c = max(x).
    """
    # TODO: Calculate max_logit for numerical stability
    max_logit = max(logits)
    
    # Calculate shifted exponentials sum
    shifted_exp_sum = sum(math.exp(x - max_logit) for x in logits)
    log_sum_exp = max_logit + math.log(shifted_exp_sum)
    
    # Return log probabilities
    return [round(x - log_sum_exp, 4) for x in logits]

def cross_entropy_loss(log_probs, target_index):
    """
    Compute Cross Entropy Loss given log probabilities and target index.
    Loss = -log_probs[target_index]
    """
    return round(-log_probs[target_index], 4)
`,
            testCases: [
              { id: 'tc-1', input: 'logits = [2.0, 1.0, 0.1]', expected: '[-0.4076, -1.4076, -2.3076]', description: 'Standard distinct logits vector' },
              { id: 'tc-2', input: 'logits = [1000.0, 1001.0, 1002.0]', expected: '[-2.4076, -1.4076, -0.4076]', description: 'High magnitude logits (numerical stability test)' },
              { id: 'tc-3', input: 'target_index = 0 on logits above', expected: '2.4076', description: 'Cross entropy loss computation' }
            ]
          }
        ]
      },
      {
        id: 'mod-101-2',
        title: 'Module 2: Convolutional Networks & Transfer Learning',
        lessons: [
          {
            id: 'les-101-4',
            title: 'Modern CNN Architectures: ConvNeXt and ResNet-50',
            type: 'Video',
            duration: '25 min',
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            summary: 'Residual connections solve vanishing gradients by allowing signals to bypass non-linear layers via identity shortcut mappings.'
          },
          {
            id: 'les-101-5',
            title: 'Fine-tuning Pretrained Weights on Medical Imaging',
            type: 'Article',
            duration: '20 min',
            completed: true,
            summary: 'Step-by-step methodology for freezing backbone layers, adapting classifier heads, and applying differential learning rates in medical diagnostic tasks.',
            content: `### Transfer Learning in High-Stakes Vision Tasks

When fine-tuning pretrained vision backbones for domain-specific tasks such as computed tomography (CT) scans or histopathology:

1. **Backbone Feature Extraction**: Keep convolutional stem and stages frozen for the first 5 epochs to prevent catastrophic forgetting.
2. **Classifier Adaptation**: Replace the final 1000-class ImageNet linear layer with a new classification head matching the target domain.
3. **Discriminative Layer Learning Rates**: Gradually unfreeze earlier stages, training deep layers with smaller learning rates ($10^{-5}$) and classifier heads with higher rates ($10^{-3}$).
4. **Data Augmentations**: Utilize affine transforms, random perspective, and mixup regularization to prevent overfitting on limited medical samples.`
          },
          {
            id: 'les-101-6',
            title: 'CNN Architecture & Overfitting Quiz',
            type: 'Quiz',
            duration: '15 min',
            completed: true,
            quizId: 'asm-103',
            score: 95,
            totalMarks: 100
          }
        ]
      },
      {
        id: 'mod-101-3',
        title: 'Module 3: Attention Mechanisms and Transformers',
        lessons: [
          {
            id: 'les-101-7',
            title: 'Self-Attention Mathematical Derivation',
            type: 'Article',
            duration: '12 min',
            completed: false,
            summary: 'Understanding Query, Key, and Value vector projections, scaled dot-product attention formula, and multi-head representation subspace splitting.',
            content: `### Scaled Dot-Product Attention

The foundational equation powering modern transformer models is defined as:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right) V$$

Where:
- **$Q$ (Queries)**: Matrix of dimension $(N, d_k)$ representing the query tokens seeking information.
- **$K$ (Keys)**: Matrix of dimension $(M, d_k)$ representing tokens offering semantic context.
- **$V$ (Values)**: Matrix of dimension $(M, d_v)$ containing the features weighted by attention scores.
- **$\\sqrt{d_k}$**: Scaling factor to prevent large dot-product magnitudes from pushing softmax gradients into saturation regions.`
          },
          {
            id: 'les-101-8',
            title: 'Building Transformer Blocks Step by Step',
            type: 'Video',
            duration: '35 min',
            completed: false,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
            summary: 'Full implementation of pre-layer normalization transformer blocks, multi-layer perceptron (MLP) feed-forward layers with GELU, and residual projections.'
          },
          {
            id: 'les-101-9',
            title: 'Multi-Head Attention Coding Challenge',
            type: 'Coding Exercise',
            duration: '45 min',
            completed: false,
            exerciseId: 'code-ex-102',
            summary: 'Implement multi-head projection splitting, scaled attention matrix computation, and projection concatenation in pure Python.',
            starterCode: `import math

def multi_head_attention_summary(num_heads, d_model):
    """
    Verify dimension compatibility for multi-head attention.
    d_k = d_model // num_heads.
    """
    assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
    d_k = d_model // num_heads
    return {
        "num_heads": num_heads,
        "d_model": d_model,
        "d_k": d_k,
        "scale_factor": round(1.0 / math.sqrt(d_k), 4)
    }

# Test your configuration
print(multi_head_attention_summary(8, 512))
`,
            testCases: [
              { id: 'tc-201', input: 'num_heads=8, d_model=512', expected: "d_k=64, scale_factor=0.125", description: 'Standard BERT-base dimensionality' },
              { id: 'tc-202', input: 'num_heads=16, d_model=1024', expected: "d_k=64, scale_factor=0.125", description: 'Transformer large dimension check' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'crs-201',
    title: 'Kubernetes in Production: Zero to Hero',
    description: 'Master container orchestration, Helm charts, ingress controllers, and production cluster security.',
    instructor: 'Marcus Vance',
    instructorTitle: 'Principal Cloud Systems Engineer',
    category: 'Cloud Engineering',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=600&q=80',
    progressPercent: 35,
    enrolledAt: '2026-10-08',
    lastAccessedAt: '2026-10-20T11:15:00Z',
    lastLessonId: 'les-201-2',
    lastLessonTitle: 'Pod Eviction, QoS Classes, and Resource Limits',
    totalLessons: 8,
    completedLessonsCount: 3,
    modules: [
      {
        id: 'mod-201-1',
        title: 'Module 1: Production Cluster Control Planes',
        lessons: [
          {
            id: 'les-201-1',
            title: 'Control Plane Topology & etcd High Availability',
            type: 'Video',
            duration: '24 min',
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            summary: 'Architecting quorum-based etcd clusters across availability zones with TLS mutual authentication and automated raft snapshot backups.'
          },
          {
            id: 'les-201-2',
            title: 'Pod Eviction, QoS Classes, and Resource Limits',
            type: 'Video',
            duration: '28 min',
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            summary: 'Understanding Guaranteed, Burstable, and BestEffort Quality of Service classes under high node memory pressure and kernel OOM reaper scenarios.'
          },
          {
            id: 'les-201-3',
            title: 'Kubernetes Cluster Architecture Quiz',
            type: 'Quiz',
            duration: '30 min',
            completed: true,
            quizId: 'asm-101',
            score: 90,
            totalMarks: 100
          }
        ]
      },
      {
        id: 'mod-201-2',
        title: 'Module 2: Advanced Ingress & Helm Deployments',
        lessons: [
          {
            id: 'les-201-4',
            title: 'TLS Termination, Cert-Manager & Ingress Controllers',
            type: 'Video',
            duration: '32 min',
            completed: false,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
            summary: 'Automating ACME HTTP-01 challenge validations with Let\'s Encrypt and cert-manager across NGINX ingress resources.'
          },
          {
            id: 'les-201-5',
            title: 'Production Helm Chart Deployment Challenge',
            type: 'Assignment',
            duration: '90 min',
            completed: false,
            assignmentId: 'asm-102',
            summary: 'Submit a multi-environment production Helm chart supporting HPA autoscaling, readiness probes, and TLS certificates.'
          }
        ]
      }
    ]
  },
  {
    id: 'crs-205',
    title: 'Designing Accessible Systems (WCAG 2.2)',
    description: 'Inclusive design patterns, assistive technology considerations, contrast ratios, and accessible rich internet applications.',
    instructor: 'Maya Lin',
    instructorTitle: 'Design Lead & Accessibility Fellow',
    category: 'Design & Accessibility',
    level: 'All Levels',
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    progressPercent: 100,
    enrolledAt: '2026-09-15',
    completedAt: '2026-10-14T16:00:00Z',
    lastAccessedAt: '2026-10-14T16:00:00Z',
    lastLessonId: 'les-205-final',
    lastLessonTitle: 'Inclusive ARIA Widgets Certification Review',
    totalLessons: 7,
    completedLessonsCount: 7,
    certificateId: 'cert-wcag-2026',
    modules: [
      {
        id: 'mod-205-1',
        title: 'Module 1: Perceivable & Operable Web Standards',
        lessons: [
          { id: 'les-205-1', title: 'Color Contrast Ratios & Vision Impairments', type: 'Video', duration: '20 min', completed: true },
          { id: 'les-205-2', title: 'Keyboard Traps & Visible Focus Rings', type: 'Article', duration: '15 min', completed: true },
          { id: 'les-205-3', title: 'Accessible Form Validation & Errors', type: 'Video', duration: '22 min', completed: true }
        ]
      },
      {
        id: 'mod-205-2',
        title: 'Module 2: Assistive Tech & ARIA 1.2 Attributes',
        lessons: [
          { id: 'les-205-4', title: 'Screen Reader Tree & DOM Ordering', type: 'Video', duration: '25 min', completed: true },
          { id: 'les-205-5', title: 'Building Accessible Modals & Dialogs', type: 'Article', duration: '18 min', completed: true },
          { id: 'les-205-6', title: 'WCAG 2.2 Final Comprehensive Evaluation', type: 'Quiz', duration: '30 min', completed: true }
        ]
      }
    ]
  }
];

export const mockLearnerCertificates = [
  {
    id: 'cert-wcag-2026',
    certificateNumber: 'LS-2026-98142-ACC',
    courseId: 'crs-205',
    courseTitle: 'Designing Accessible Systems (WCAG 2.2)',
    instructor: 'Maya Lin',
    instructorTitle: 'Design Lead & Accessibility Fellow',
    organization: 'LearnSpace Institute of Technology',
    recipientName: 'Sarah Chen',
    recipientEmail: 'sarah.chen@stanford.edu',
    issueDate: 'October 14, 2026',
    gradeScore: 98,
    status: 'Verified',
    verificationUrl: 'https://learnspace.org/verify/LS-2026-98142-ACC',
    skills: ['WCAG 2.2', 'ARIA 1.2', 'Accessible Design', 'Assistive Technology', 'Contrast Standards'],
    description: 'Demonstrated mastery of accessible design specifications, screen reader assistive compatibility, focus management, and WCAG 2.2 compliance validation.'
  }
];

export const mockWishlistCourses = [
  {
    id: 'c-app-101',
    title: 'Advanced Microservices Architecture with Go',
    description: 'Design distributed microservices using gRPC, event-driven messaging with Kafka, and domain-driven design.',
    instructor: 'Dr. Aris Thorne',
    category: 'Software Engineering',
    level: 'Advanced',
    rating: 4.9,
    ratingCount: 42,
    enrolledCount: 180,
    modulesCount: 8,
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    savedAt: '2026-10-18'
  },
  {
    id: 'c-app-104',
    title: 'Data Structures & Algorithms in Rust',
    description: 'Memory safety, zero-cost abstractions, lifetimes, concurrency primitives, and classic algorithmic problem solving.',
    instructor: 'Devon Miller',
    category: 'Computer Science',
    level: 'Beginner',
    rating: 4.8,
    ratingCount: 31,
    enrolledCount: 115,
    modulesCount: 6,
    thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80',
    savedAt: '2026-10-19'
  }
];

export const mockUpcomingAssessments = [
  {
    id: 'asm-102',
    title: 'Production Helm Chart Deployment Challenge',
    type: 'Assignment',
    courseId: 'crs-201',
    courseTitle: 'Kubernetes in Production: Zero to Hero',
    dueDate: '2026-10-26T23:59:00Z',
    daysLeft: 4,
    points: 100,
    status: 'Submitted - Pending Grade',
    submittedAt: '2026-10-21T16:00:00Z'
  },
  {
    id: 'code-ex-102',
    title: 'Multi-Head Attention Layer Coding Challenge',
    type: 'Coding Exercise',
    courseId: 'crs-inst-101',
    courseTitle: 'Deep Learning with PyTorch 2.0',
    dueDate: '2026-10-28T23:59:00Z',
    daysLeft: 6,
    points: 50,
    status: 'Ready for Solution'
  }
];
