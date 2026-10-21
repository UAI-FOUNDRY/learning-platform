/**
 * Stable, deterministic simulated audit records for LearnSpace Super Admin.
 *
 * NOTE: As per prototype readiness requirements, these records represent
 * deterministic sample platform events across course approvals, user governance,
 * assessment publishing, organization verifications, and system settings.
 * They do not contain live security credentials, API keys, or private user data.
 */

export const mockActivityLogs = [
  {
    id: 'log_act_20261021_001',
    timestamp: '2026-10-21T16:20:12Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'course.approved',
    category: 'courses',
    target: {
      type: 'Course',
      id: 'crs_adv_ai_101',
      name: 'Advanced Generative AI & LLM Systems'
    },
    description: 'Reviewed curriculum materials and approved course for public platform publication.',
    status: 'success',
    changes: {
      before: { status: 'pending_review', isPublished: false, qualityScore: null },
      after: { status: 'published', isPublished: true, qualityScore: 98 },
      rationale: 'Comprehensive hands-on coding labs and thorough ethical AI safety modules.'
    }
  },
  {
    id: 'log_act_20261021_002',
    timestamp: '2026-10-21T15:05:44Z',
    actor: {
      id: 'usr_admin_sec_02',
      name: 'Sarah Jenkins',
      role: 'Compliance Lead',
      ip: '10.0.4.21',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    },
    action: 'user.status_changed',
    category: 'users',
    target: {
      type: 'User',
      id: 'usr_lrn_904',
      name: 'David Wilson (david.w@tempmail.com)'
    },
    description: 'Suspended learner account pending investigation into automated quiz scraping.',
    status: 'warning',
    changes: {
      before: { isActive: true, status: 'active', lockReason: null },
      after: { isActive: false, status: 'suspended', lockReason: 'Automated rate limit violations and API abuse' },
      incidentTicket: 'SEC-INC-2026-881'
    }
  },
  {
    id: 'log_act_20261021_003',
    timestamp: '2026-10-21T13:42:19Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'assessment.published',
    category: 'assessments',
    target: {
      type: 'Assessment',
      id: 'asm_cloud_sec_q1',
      name: 'Cloud Security Architecture - Midterm Benchmark'
    },
    description: 'Approved and published 15-question quiz blueprint with 75% passing threshold.',
    status: 'success',
    changes: {
      before: { status: 'Draft', totalMarks: 100, isLocked: false },
      after: { status: 'Published', totalMarks: 100, isLocked: true },
      composition: '15 questions (Single-choice, Multi-select, Scenario analysis)'
    }
  },
  {
    id: 'log_act_20261021_004',
    timestamp: '2026-10-21T11:15:30Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'platform_settings.updated',
    category: 'settings',
    target: {
      type: 'Platform Settings',
      id: 'cfg_notifications_smtp',
      name: 'Platform Notification & Email Configuration'
    },
    description: 'Updated system notification policies and verified support contact email routing.',
    status: 'success',
    changes: {
      before: {
        'general.support_email': 'support@learnspace.org',
        'notifications.email_enabled': false
      },
      after: {
        'general.support_email': 'ops-support@learnspace.org',
        'notifications.email_enabled': true
      },
      comment: 'Routine infrastructure contact routing update'
    }
  },
  {
    id: 'log_act_20261021_005',
    timestamp: '2026-10-21T09:30:00Z',
    actor: {
      id: 'usr_system_daemon',
      name: 'System Automation',
      role: 'Automated Job',
      ip: '127.0.0.1',
      userAgent: 'LearnSpace-Backend-Worker/2.4'
    },
    action: 'auth.mfa_enforced',
    category: 'security',
    target: {
      type: 'Security Policy',
      id: 'pol_admin_mfa',
      name: 'Super Admin Portal Multi-Factor Authentication'
    },
    description: 'Completed automated verification scan of 2FA enrollment across all admin roles.',
    status: 'success',
    changes: {
      enrolledAccounts: 6,
      pendingGracePeriod: 0,
      complianceRate: '100%'
    }
  },
  {
    id: 'log_act_20261020_006',
    timestamp: '2026-10-20T18:45:22Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'course.changes_requested',
    category: 'courses',
    target: {
      type: 'Course',
      id: 'crs_web3_dapps',
      name: 'Decentralized Apps & Solidity Smart Contracts'
    },
    description: 'Requested revisions on module 4 regarding secure gas optimization testing.',
    status: 'warning',
    changes: {
      before: { status: 'pending_review' },
      after: { status: 'changes_requested' },
      feedback: 'Please provide automated unit tests with Foundry or Hardhat for the reentrancy attack exercise.'
    }
  },
  {
    id: 'log_act_20261020_007',
    timestamp: '2026-10-20T14:10:05Z',
    actor: {
      id: 'usr_admin_sec_02',
      name: 'Sarah Jenkins',
      role: 'Compliance Lead',
      ip: '10.0.4.21',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    },
    action: 'organization.verified',
    category: 'organizations',
    target: {
      type: 'Organization',
      id: 'org_eth_zurich',
      name: 'ETH Zurich - Department of Computer Science'
    },
    description: 'Verified academic accreditation credentials and provisioned university SSO integration.',
    status: 'success',
    changes: {
      before: { status: 'pending_verification', ssoEnabled: false },
      after: { status: 'verified', ssoEnabled: true, partnerTier: 'Academic Enterprise' }
    }
  },
  {
    id: 'log_act_20261020_008',
    timestamp: '2026-10-20T10:22:40Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'user.role_updated',
    category: 'users',
    target: {
      type: 'User',
      id: 'usr_inst_elena',
      name: 'Dr. Elena Rostova'
    },
    description: 'Promoted instructor to Academic Advisory Board with category moderation permissions.',
    status: 'success',
    changes: {
      before: { role: 'instructor', permissions: ['course.create', 'course.edit'] },
      after: { role: 'lead_instructor', permissions: ['course.create', 'course.edit', 'course.peer_review'] }
    }
  },
  {
    id: 'log_act_20261019_009',
    timestamp: '2026-10-19T17:50:11Z',
    actor: {
      id: 'usr_admin_sec_02',
      name: 'Sarah Jenkins',
      role: 'Compliance Lead',
      ip: '10.0.4.21',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    },
    action: 'certificate.revoked',
    category: 'security',
    target: {
      type: 'Certificate',
      id: 'cert_ls_2026_00481',
      name: 'Verified Certificate: Full-Stack React & Node'
    },
    description: 'Revoked certificate issuance due to confirmed unauthorized proxy assessment completion.',
    status: 'failed',
    changes: {
      before: { status: 'valid', revokedAt: null },
      after: { status: 'revoked', revokedAt: '2026-10-19T17:50:11Z', justification: 'Honor Code Section 4.2 violation' }
    }
  },
  {
    id: 'log_act_20261019_010',
    timestamp: '2026-10-19T12:05:33Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'category.created',
    category: 'categories',
    target: {
      type: 'Category',
      id: 'cat_agentic_ai',
      name: 'Autonomous Agents & LLMs'
    },
    description: 'Added new platform taxonomy classification under Computer Science & Engineering.',
    status: 'success',
    changes: {
      slug: 'autonomous-agents-llms',
      parentCategory: 'Artificial Intelligence',
      isActive: true
    }
  },
  {
    id: 'log_act_20261018_011',
    timestamp: '2026-10-18T16:30:00Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'assessment.archived',
    category: 'assessments',
    target: {
      type: 'Assessment',
      id: 'asm_legacy_es5_q2',
      name: 'Legacy ECMAScript 5 Prototype Fundamentals'
    },
    description: 'Archived deprecated evaluation rubric and replaced with modern ES2024 standards.',
    status: 'info',
    changes: {
      before: { status: 'Published' },
      after: { status: 'Archived', deprecationNotice: 'Superseded by Modern JavaScript 2026 Suite' }
    }
  },
  {
    id: 'log_act_20261018_012',
    timestamp: '2026-10-18T11:14:02Z',
    actor: {
      id: 'usr_unknown_external',
      name: 'Security Gate (WAF)',
      role: 'Automated Defense',
      ip: '198.51.100.74',
      userAgent: 'python-requests/2.31.0'
    },
    action: 'auth.login_failed',
    category: 'security',
    target: {
      type: 'Authentication',
      id: 'auth_attempt_9921',
      name: 'Admin Login Endpoint (/api/v1/auth/login)'
    },
    description: 'Blocked repeated credential stuffing attempt from untrusted CIDR block.',
    status: 'failed',
    changes: {
      attemptCount: 5,
      targetUsername: 'admin@learnspace.org',
      actionTaken: 'IP temporarily blacklisted for 30 minutes'
    }
  },
  {
    id: 'log_act_20261017_013',
    timestamp: '2026-10-17T15:20:45Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'course.rejected',
    category: 'courses',
    target: {
      type: 'Course',
      id: 'crs_intro_crypto_trading',
      name: 'Guaranteed 10x Crypto Momentum Trading'
    },
    description: 'Rejected course submission due to violation of platform academic quality & financial claims policy.',
    status: 'failed',
    changes: {
      before: { status: 'pending_review' },
      after: { status: 'rejected' },
      reason: 'Violates LearnSpace Quality Guidelines Section 3.1: Speculative financial advice without accredited curriculum.'
    }
  },
  {
    id: 'log_act_20261017_014',
    timestamp: '2026-10-17T09:40:18Z',
    actor: {
      id: 'usr_admin_sec_02',
      name: 'Sarah Jenkins',
      role: 'Compliance Lead',
      ip: '10.0.4.21',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'
    },
    action: 'organization.tier_updated',
    category: 'organizations',
    target: {
      type: 'Organization',
      id: 'org_mit_open',
      name: 'MIT Open Learning Institute'
    },
    description: 'Upgraded partner tier to Global University Partner with custom branding entitlements.',
    status: 'success',
    changes: {
      before: { tier: 'Standard Academic', maxSeats: 500 },
      after: { tier: 'Global University Partner', maxSeats: 5000, whiteLabelBadges: true }
    }
  },
  {
    id: 'log_act_20261016_015',
    timestamp: '2026-10-16T14:00:25Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'platform_settings.maintenance_toggled',
    category: 'settings',
    target: {
      type: 'Platform Settings',
      id: 'cfg_maintenance_mode',
      name: 'System Maintenance State'
    },
    description: 'Disabled maintenance window following database migration and cache reindexing.',
    status: 'success',
    changes: {
      before: { 'system.maintenance_mode': true },
      after: { 'system.maintenance_mode': false },
      downtimeMinutes: 12
    }
  },
  {
    id: 'log_act_20261015_016',
    timestamp: '2026-10-15T16:55:10Z',
    actor: {
      id: 'usr_admin_super_01',
      name: 'Rohan Mehta',
      role: 'Super Admin',
      ip: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0'
    },
    action: 'user.created',
    category: 'users',
    target: {
      type: 'User',
      id: 'usr_auditor_pwc',
      name: 'Markus Lindqvist (External Compliance Auditor)'
    },
    description: 'Provisioned time-limited read-only auditor role for annual ISO/IEC 27001 assessment.',
    status: 'info',
    changes: {
      assignedRole: 'external_auditor',
      expiryDate: '2026-11-15T23:59:59Z',
      scope: 'read_only_reports_and_logs'
    }
  }
];
