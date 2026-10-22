import React, { useState, useEffect, useMemo } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useDebounce } from '../../hooks/useDebounce';
import {
  organizationService,
  getStoredOrganizationsState,
  clearStoredOrganizations,
  applyOrganizationOverrides,
  subscribeToOrganizationUpdates,
  generateOrganizationSlug
} from '../../services/organizationService';
import { mockOrganizations } from '../../data/mockOrganizations';

/**
 * Semantic StatusBadge for organization standing
 * - Active: Emerald
 * - Pending Verification: Amber
 * - Suspended: Rose / Danger
 * - Inactive: Warm Neutral Taupe / Stone
 */
function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        Active
      </span>
    );
  }

  if (normalized.includes('pending')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        Pending Verification
      </span>
    );
  }

  if (normalized === 'suspended') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        Suspended
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      Inactive
    </span>
  );
}

/**
 * TypeBadge distinguishing institutional categories
 */
function TypeBadge({ type }) {
  const normalized = (type || '').toLowerCase();

  let style = 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]';
  if (normalized === 'university') {
    style = 'bg-blue-100/80 text-blue-900 border-blue-300 font-semibold';
  } else if (normalized === 'corporate') {
    style = 'bg-purple-100/80 text-purple-900 border-purple-300 font-semibold';
  } else if (normalized === 'college') {
    style = 'bg-teal-100/80 text-teal-900 border-teal-300 font-medium';
  } else if (normalized === 'bootcamp') {
    style = 'bg-amber-100/80 text-amber-900 border-amber-300 font-medium';
  } else if (normalized === 'non-profit') {
    style = 'bg-emerald-100/80 text-emerald-900 border-emerald-300 font-medium';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border shrink-0 ${style}`}>
      {type || 'Institution'}
    </span>
  );
}

const PRESET_ICONS = ['🏛️', '🎓', '🏢', '☁️', '🤖', '📚', '💳', '🛡️', '⚙️', '⚡', '🔬', '🌐'];
const ORG_TYPES = ['University', 'Corporate', 'College', 'Bootcamp', 'Non-Profit'];
const STATUS_OPTIONS = ['Active', 'Pending Verification', 'Inactive', 'Suspended'];
const SUBSCRIPTION_TIERS = ['Academic Partner', 'Enterprise Partner', 'Standard'];

export default function Organizations() {
  const [rawOrganizations, setRawOrganizations] = useState(mockOrganizations);
  const [sessionOverrides, setSessionOverrides] = useState(getStoredOrganizationsState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [statusNotice, setStatusNotice] = useState(null);

  // Search, filter, and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 150);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('members-desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals state
  // modalState: null | { type: 'create' | 'edit' | 'inspect' | 'status' | 'delete', organization?: Object }
  const [modalState, setModalState] = useState(null);

  // Create / Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    orgType: 'University',
    status: 'Active',
    domain: '',
    contactEmail: '',
    contactPhone: '',
    adminName: '',
    icon: '🏛️',
    description: '',
    memberCount: '',
    courseCount: '',
    subscriptionTier: 'Academic Partner',
    location: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to live organization session updates
  useEffect(() => {
    const unsubscribe = subscribeToOrganizationUpdates(setSessionOverrides);
    return unsubscribe;
  }, []);

  // Fetch organizations with API fallback to mock data
  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setIsLoading(true);
      try {
        const res = await organizationService.getOrganizations();
        if (isMounted) {
          if (Array.isArray(res.items) && res.items.length > 0) {
            setRawOrganizations(res.items);
            setIsSampleData(res.isSample);
          } else {
            setRawOrganizations(mockOrganizations);
            setIsSampleData(true);
          }
        }
      } catch {
        if (isMounted) {
          setRawOrganizations(mockOrganizations);
          setIsSampleData(true);
        }
      } finally {
        if (isMounted) {
          setSessionOverrides(getStoredOrganizationsState());
          setIsLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Resolved organizations list with session overrides applied
  const organizations = useMemo(() => {
    return applyOrganizationOverrides(rawOrganizations, sessionOverrides);
  }, [rawOrganizations, sessionOverrides]);

  // Total session modifications count
  const sessionChangeCount = useMemo(() => {
    const { added = [], updated = {}, deleted = [] } = sessionOverrides || {};
    return added.length + Object.keys(updated).length + deleted.length;
  }, [sessionOverrides]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = organizations.length;
    const activeInstitutions = organizations.filter(
      o => (o.orgType === 'University' || o.orgType === 'College') && o.status === 'Active'
    ).length;
    const corporatePartners = organizations.filter(
      o => o.orgType === 'Corporate' && o.status === 'Active'
    ).length;
    const totalMembers = organizations.reduce((sum, o) => sum + (Number(o.memberCount) || 0), 0);
    const totalCourses = organizations.reduce((sum, o) => sum + (Number(o.courseCount) || 0), 0);
    return { total, activeInstitutions, corporatePartners, totalMembers, totalCourses };
  }, [organizations]);

  // Reset to first page when dropdown filters, sorting, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, sortBy, pageSize]);

  // Filter and sort pipeline
  const filteredAndSortedOrganizations = useMemo(() => {
    let result = [...organizations];

    // Search query matching name, slug, domain, contactEmail, adminName, or location
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(o => {
        const nameMatch = (o.name || '').toLowerCase().includes(q);
        const slugMatch = (o.slug || '').toLowerCase().includes(q);
        const domainMatch = (o.domain || '').toLowerCase().includes(q);
        const emailMatch = (o.contactEmail || '').toLowerCase().includes(q);
        const adminMatch = (o.adminName || '').toLowerCase().includes(q);
        const locationMatch = (o.location || '').toLowerCase().includes(q);
        return nameMatch || slugMatch || domainMatch || emailMatch || adminMatch || locationMatch;
      });
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      result = result.filter(o => o.orgType === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'members-desc':
          return (Number(b.memberCount) || 0) - (Number(a.memberCount) || 0);
        case 'courses-desc':
          return (Number(b.courseCount) || 0) - (Number(a.courseCount) || 0);
        case 'date-desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [organizations, debouncedSearch, typeFilter, statusFilter, sortBy]);

  // Pagination calculation
  const totalFilteredItems = filteredAndSortedOrganizations.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedOrganizations = filteredAndSortedOrganizations.slice(startIndex, startIndex + pageSize);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      slug: '',
      orgType: 'University',
      status: 'Active',
      domain: '',
      contactEmail: '',
      contactPhone: '',
      adminName: '',
      icon: '🏛️',
      description: '',
      memberCount: '0',
      courseCount: '0',
      subscriptionTier: 'Academic Partner',
      location: ''
    });
    setFormErrors({});
    setModalState({ type: 'create' });
  };

  // Open Edit Modal
  const handleOpenEditModal = (org) => {
    setFormData({
      name: org.name || '',
      slug: org.slug || '',
      orgType: org.orgType || 'University',
      status: org.status || 'Active',
      domain: org.domain || '',
      contactEmail: org.contactEmail || '',
      contactPhone: org.contactPhone || '',
      adminName: org.adminName || '',
      icon: org.icon || '🏛️',
      description: org.description || '',
      memberCount: String(org.memberCount || 0),
      courseCount: String(org.courseCount || 0),
      subscriptionTier: org.subscriptionTier || 'Standard',
      location: org.location || ''
    });
    setFormErrors({});
    setModalState({ type: 'edit', organization: org });
  };

  // Form field change with auto-slug generation
  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && modalState?.type === 'create') {
        updated.slug = generateOrganizationSlug(value);
      }
      return updated;
    });

    // Clear field-specific error if corrected
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Validate form inputs
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Organization name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!formData.slug.trim()) {
      errors.slug = 'Slug identifier is required.';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug.trim())) {
      errors.slug = 'Slug must only contain lowercase alphanumeric characters and hyphens.';
    }

    if (formData.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      errors.contactEmail = 'Please provide a valid email address.';
    }

    if (formData.domain.trim() && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain.trim())) {
      errors.domain = 'Please enter a valid domain format (e.g., stanford.edu).';
    }

    return errors;
  };

  // Submit Create or Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalState.type === 'create') {
        await organizationService.createOrganization({
          ...formData,
          memberCount: Number(formData.memberCount) || 0,
          courseCount: Number(formData.courseCount) || 0
        });
        setStatusNotice({
          type: 'success',
          message: `Organization "${formData.name}" has been successfully added to the platform directory.`
        });
      } else if (modalState.type === 'edit') {
        await organizationService.updateOrganization(modalState.organization.id, {
          ...formData,
          memberCount: Number(formData.memberCount) || 0,
          courseCount: Number(formData.courseCount) || 0
        });
        setStatusNotice({
          type: 'success',
          message: `Organization "${formData.name}" details have been updated successfully.`
        });
      }
      setModalState(null);
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'An error occurred while saving organization changes. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Status Change
  const handleConfirmStatusChange = async (newStatus) => {
    if (!modalState?.organization) return;
    setIsSubmitting(true);
    try {
      await organizationService.updateOrganization(modalState.organization.id, { status: newStatus });
      setStatusNotice({
        type: 'success',
        message: `Organization "${modalState.organization.name}" status updated to ${newStatus}.`
      });
      setModalState(null);
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'Failed to update organization status.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!modalState?.organization) return;
    setIsSubmitting(true);
    try {
      await organizationService.deleteOrganization(modalState.organization.id);
      setStatusNotice({
        type: 'success',
        message: `Organization "${modalState.organization.name}" removed from platform directory.`
      });
      setModalState(null);
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'Failed to remove organization.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset to Default Mock Dataset
  const handleResetDefaults = () => {
    clearStoredOrganizations();
    setStatusNotice({
      type: 'info',
      message: 'All development session modifications cleared. Restored default institutional dataset.'
    });
  };

  return (
    <PageContainer>
      {/* Breadcrumb Navigation */}
      <nav className="flex text-xs text-[#514940] mb-3" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <span className="text-[#514940]">Super Admin</span>
          </li>
          <li className="text-[#71675D]">/</li>
          <li className="font-semibold text-[#211E1A]" aria-current="page">
            Organizations
          </li>
        </ol>
      </nav>

      {/* Header & Primary Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#B6AA9A]">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] leading-tight tracking-tight">
            Organization Management
          </h1>
          <p className="mt-1 text-sm text-[#514940]">
            Manage registered universities, colleges, and corporate enterprises partnered with LearnSpace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {sessionChangeCount > 0 && (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#EAE3DA] hover:bg-[#BFB09D] text-[#514940] border border-[#B6AA9A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              title="Reverts all added, edited, and deleted organizations in this session"
            >
              Reset to Defaults ({sessionChangeCount})
            </button>
          )}

          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 text-sm shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Organization</span>
          </Button>
        </div>
      </div>

      {/* Status / Feedback Banner */}
      {statusNotice && (
        <div
          className={`mt-4 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${
            statusNotice.type === 'error'
              ? 'bg-rose-100/90 text-rose-950 border-rose-300'
              : statusNotice.type === 'info'
              ? 'bg-[#EAE3DA] text-[#211E1A] border-[#B6AA9A]'
              : 'bg-emerald-100/90 text-emerald-950 border-emerald-300'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              {statusNotice.type === 'error' ? '⚠️' : statusNotice.type === 'info' ? 'ℹ️' : '✓'}
            </span>
            <span className="font-medium">{statusNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/10 focus:outline-none"
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Total Organizations</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{summaryMetrics.total}</span>
            <span className="text-xs font-medium text-[#71675D]">Partners</span>
          </div>
        </div>

        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Active Academic</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#15803D]">{summaryMetrics.activeInstitutions}</span>
            <span className="text-xs font-medium text-[#71675D]">Uni & Colleges</span>
          </div>
        </div>

        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Enterprise Partners</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{summaryMetrics.corporatePartners}</span>
            <span className="text-xs font-medium text-[#71675D]">Corporate</span>
          </div>
        </div>

        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Enrolled Learners</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{summaryMetrics.totalMembers.toLocaleString()}</span>
            <span className="text-xs font-medium text-[#71675D]">Active seats</span>
          </div>
        </div>

        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Sponsored Courses</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#D92D2D]">{summaryMetrics.totalCourses}</span>
            <span className="text-xs font-medium text-[#71675D]">Catalog links</span>
          </div>
        </div>
      </div>

      {/* Data Source Transparency Badge */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#514940] bg-[#EAE3DA]/60 border border-[#B6AA9A] px-3 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>
            Data Source:{' '}
            <strong className="text-[#211E1A]">
              {isSampleData ? 'Development Mock Provider (Offline / Session)' : 'Live Platform Database (/api/v1/organizations)'}
            </strong>
          </span>
          {sessionChangeCount > 0 && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
              {sessionChangeCount} local modification{sessionChangeCount !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#71675D]">Instant local synchronization</span>
      </div>

      {/* Control Toolbar (Search, Filter, Sort, Page Size) */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71675D]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentPage !== 1) setCurrentPage(1);
            }}
            placeholder="Search organizations by name, code, domain, or admin..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (currentPage !== 1) setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
              aria-label="Clear search query"
            >
              &times;
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
            aria-label="Filter by organization type"
          >
            <option value="ALL">All Types</option>
            {ORG_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
            aria-label="Filter by organization status"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Sort Control */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
            aria-label="Sort organizations"
          >
            <option value="members-desc">Most Members</option>
            <option value="courses-desc">Most Courses</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="date-desc">Newest Added</option>
          </select>

          {/* Clear Filters Button */}
          {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                if (currentPage !== 1) setCurrentPage(1);
              }}
              className="py-2 px-2.5 text-xs font-semibold rounded-lg text-[#D92D2D] hover:bg-[#EAE3DA] transition-colors focus:outline-none"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Directory Table / Content View */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader text="Loading organization directory..." />
          </div>
        ) : paginatedOrganizations.length === 0 ? (
          <div className="py-16 px-4">
            <EmptyState
              title="No Organizations Found"
              description={
                searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No organizations match your current search and filter criteria. Try adjusting your query or resetting filters.'
                  : 'No organizations currently exist in this directory. Click "Add Organization" to register your first partner institution.'
              }
            />
            {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <div className="mt-4 text-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                    if (currentPage !== 1) setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  Reset Search & Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#B6AA9A] text-left text-xs sm:text-sm">
              <thead className="bg-[#EAE3DA]/70 text-[#514940] font-semibold">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 sm:pl-6 pr-3">
                    Organization & Domain
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Learner Seats
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Courses
                  </th>
                  <th scope="col" className="px-3 py-3.5 hidden md:table-cell">
                    Coordinator & Tier
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B6AA9A]/60 bg-[#C8BBAA]/40 text-[#211E1A]">
                {paginatedOrganizations.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-[#EAE3DA]/50 transition-colors"
                  >
                    {/* Organization details */}
                    <td className="py-3.5 pl-4 sm:pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-1.5 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] shrink-0" aria-hidden="true">
                          {org.icon || '🏛️'}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setModalState({ type: 'inspect', organization: org })}
                            className="font-bold text-[#211E1A] hover:text-[#D92D2D] transition-colors text-left truncate block focus:outline-none focus-visible:underline"
                          >
                            {org.name}
                          </button>
                          <div className="flex items-center gap-2 text-xs text-[#514940] mt-0.5">
                            <span className="font-mono text-[11px] text-[#71675D]">{org.slug}</span>
                            {org.domain && (
                              <>
                                <span>•</span>
                                <a
                                  href={`https://${org.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#514940] hover:text-[#D92D2D] hover:underline flex items-center gap-0.5 truncate max-w-[160px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>{org.domain}</span>
                                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <TypeBadge type={org.orgType} />
                    </td>

                    {/* Status badge */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <StatusBadge status={org.status} />
                    </td>

                    {/* Learner Seats Count */}
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <span className="font-semibold text-[#211E1A]">
                        {(Number(org.memberCount) || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Courses Count */}
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                        {org.courseCount || 0}
                      </span>
                    </td>

                    {/* Coordinator & Tier */}
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <div className="text-xs">
                        <div className="font-medium text-[#211E1A] truncate max-w-[180px]">
                          {org.adminName || 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-[#71675D] mt-0.5">
                          {org.subscriptionTier || 'Standard'}
                        </div>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModalState({ type: 'inspect', organization: org })}
                          className="p-1.5 rounded-lg text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                          title="View Details"
                          aria-label={`View details for ${org.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(org)}
                          className="p-1.5 rounded-lg text-[#514940] hover:text-[#D92D2D] hover:bg-[#EAE3DA] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                          title="Edit Organization"
                          aria-label={`Edit ${org.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalState({ type: 'delete', organization: org })}
                          className="p-1.5 rounded-lg text-[#71675D] hover:text-[#B91C1C] hover:bg-rose-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                          title="Delete Organization"
                          aria-label={`Delete ${org.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalFilteredItems > 0 && (
          <div className="bg-[#EAE3DA]/80 px-4 sm:px-6 py-3 border-t border-[#B6AA9A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#514940]">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{startIndex + 1}</strong> to{' '}
                <strong>{Math.min(startIndex + pageSize, totalFilteredItems)}</strong> of{' '}
                <strong>{totalFilteredItems}</strong> organizations
              </span>
              <div className="ml-3 hidden sm:flex items-center gap-1">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-[#C8BBAA] border border-[#B6AA9A] rounded px-1.5 py-0.5 text-xs text-[#211E1A] focus:outline-none"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#B6AA9A] bg-[#C8BBAA] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[#211E1A] transition-colors focus:outline-none"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                // Show reasonable range around current page
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= safeCurrentPage - 1 && pageNumber <= safeCurrentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${
                        safeCurrentPage === pageNumber
                          ? 'bg-[#D92D2D] text-white border-[#D92D2D]'
                          : 'bg-[#C8BBAA] border-[#B6AA9A] text-[#211E1A] hover:bg-[#BFB09D]'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                }
                if (pageNumber === 2 || pageNumber === totalPages - 1) {
                  return <span key={pageNumber} className="px-1 text-[#71675D]">...</span>;
                }
                return null;
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-[#B6AA9A] bg-[#C8BBAA] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[#211E1A] transition-colors focus:outline-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Create or Edit Organization */}
      {(modalState?.type === 'create' || modalState?.type === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setModalState(null)}
          title={modalState.type === 'create' ? 'Add New Organization' : `Edit Organization: ${modalState.organization?.name}`}
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                Organization Name <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="e.g. Stanford University or Google Cloud Enterprise"
                className={`w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] ${
                  formErrors.name ? 'border-[#B91C1C]' : 'border-[#B6AA9A]'
                }`}
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-[#B91C1C]">{formErrors.name}</p>
              )}
            </div>

            {/* Slug Code & Icon Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Unique Slug Identifier <span className="text-[#D92D2D]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleFormChange('slug', e.target.value)}
                  placeholder="stanford-university"
                  className={`w-full px-3 py-2 text-sm font-mono rounded-lg bg-[#EAE3DA] border text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] ${
                    formErrors.slug ? 'border-[#B91C1C]' : 'border-[#B6AA9A]'
                  }`}
                />
                {formErrors.slug && (
                  <p className="mt-1 text-xs text-[#B91C1C]">{formErrors.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Symbol Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => handleFormChange('icon', e.target.value)}
                  className="w-full px-3 py-2 text-base rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                >
                  {PRESET_ICONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Organization Type
                </label>
                <select
                  value={formData.orgType}
                  onChange={(e) => handleFormChange('orgType', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                >
                  {ORG_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Operational Standing
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Domain & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Primary Domain / Website
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => handleFormChange('domain', e.target.value)}
                  placeholder="e.g. stanford.edu"
                  className={`w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] ${
                    formErrors.domain ? 'border-[#B91C1C]' : 'border-[#B6AA9A]'
                  }`}
                />
                {formErrors.domain && (
                  <p className="mt-1 text-xs text-[#B91C1C]">{formErrors.domain}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Location / Headquarters
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  placeholder="e.g. Stanford, CA, USA"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                />
              </div>
            </div>

            {/* Admin Coordinator & Contact Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Admin Coordinator Name
                </label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => handleFormChange('adminName', e.target.value)}
                  placeholder="e.g. Dr. Eleanor Vance"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleFormChange('contactEmail', e.target.value)}
                  placeholder="admin@institution.edu"
                  className={`w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] ${
                    formErrors.contactEmail ? 'border-[#B91C1C]' : 'border-[#B6AA9A]'
                  }`}
                />
                {formErrors.contactEmail && (
                  <p className="mt-1 text-xs text-[#B91C1C]">{formErrors.contactEmail}</p>
                )}
              </div>
            </div>

            {/* Initial Counts & Subscription Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Learner Seats
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.memberCount}
                  onChange={(e) => handleFormChange('memberCount', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Linked Courses
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.courseCount}
                  onChange={(e) => handleFormChange('courseCount', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                  Partnership Tier
                </label>
                <select
                  value={formData.subscriptionTier}
                  onChange={(e) => handleFormChange('subscriptionTier', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                >
                  {SUBSCRIPTION_TIERS.map(tier => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#211E1A] mb-1">
                Description & Academic Scope
              </label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Institutional background, curriculum focus, and platform objectives..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#B6AA9A] flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setModalState(null)}
                disabled={isSubmitting}
                className="text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                className="text-xs sm:text-sm"
              >
                {isSubmitting
                  ? 'Saving Changes...'
                  : modalState.type === 'create'
                  ? 'Create Organization'
                  : 'Save Updates'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: View / Inspect Organization Details */}
      {modalState?.type === 'inspect' && modalState.organization && (
        <Modal
          isOpen={true}
          onClose={() => setModalState(null)}
          title="Organization Profile"
        >
          <div className="space-y-5 text-sm text-[#211E1A] max-h-[75vh] overflow-y-auto pr-1">
            {/* Header with Icon, Name, and Badges */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#B6AA9A]">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-[#C8BBAA] border border-[#B6AA9A] shrink-0">
                  {modalState.organization.icon || '🏛️'}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#211E1A] leading-snug">
                    {modalState.organization.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-[#71675D]">
                      ID: {modalState.organization.id}
                    </span>
                    <span>•</span>
                    <TypeBadge type={modalState.organization.orgType} />
                    <StatusBadge status={modalState.organization.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#C8BBAA]/50 border border-[#B6AA9A] rounded-lg p-2.5 text-center">
                <span className="text-[11px] font-medium text-[#514940] block">Enrolled Seats</span>
                <span className="text-lg font-bold text-[#211E1A]">
                  {(Number(modalState.organization.memberCount) || 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-[#C8BBAA]/50 border border-[#B6AA9A] rounded-lg p-2.5 text-center">
                <span className="text-[11px] font-medium text-[#514940] block">Sponsored Courses</span>
                <span className="text-lg font-bold text-[#D92D2D]">
                  {modalState.organization.courseCount || 0}
                </span>
              </div>
              <div className="bg-[#C8BBAA]/50 border border-[#B6AA9A] rounded-lg p-2.5 text-center">
                <span className="text-[11px] font-medium text-[#514940] block">Partnership Tier</span>
                <span className="text-xs font-bold text-[#211E1A] block truncate mt-1">
                  {modalState.organization.subscriptionTier || 'Standard'}
                </span>
              </div>
              <div className="bg-[#C8BBAA]/50 border border-[#B6AA9A] rounded-lg p-2.5 text-center">
                <span className="text-[11px] font-medium text-[#514940] block">Partner Since</span>
                <span className="text-xs font-semibold text-[#514940] block mt-1">
                  {modalState.organization.createdAt
                    ? new Date(modalState.organization.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                    : '2026'}
                </span>
              </div>
            </div>

            {/* Contact & Administrative Details */}
            <div className="bg-[#C8BBAA]/30 border border-[#B6AA9A] rounded-lg p-3.5 space-y-2 text-xs">
              <h4 className="font-bold text-[#211E1A] text-xs uppercase tracking-wider mb-2">
                Administration & Contacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[#71675D] block">Admin Coordinator:</span>
                  <span className="font-semibold text-[#211E1A]">
                    {modalState.organization.adminName || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71675D] block">Contact Email:</span>
                  <span className="font-semibold text-[#211E1A]">
                    {modalState.organization.contactEmail || 'None provided'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71675D] block">Location:</span>
                  <span className="font-medium text-[#211E1A]">
                    {modalState.organization.location || 'Global / Online'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71675D] block">Website Domain:</span>
                  {modalState.organization.domain ? (
                    <a
                      href={`https://${modalState.organization.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#D92D2D] hover:underline"
                    >
                      {modalState.organization.domain}
                    </a>
                  ) : (
                    <span className="text-[#71675D]">Not configured</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#514940] mb-1">
                About Institution
              </h4>
              <p className="text-xs sm:text-sm text-[#514940] leading-relaxed bg-[#EAE3DA] p-3 rounded-lg border border-[#B6AA9A]">
                {modalState.organization.description || 'No detailed background provided.'}
              </p>
            </div>

            {/* Quick Status Control */}
            <div className="p-3 bg-[#C8BBAA]/40 rounded-lg border border-[#B6AA9A] flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[#211E1A] block">Current Status</span>
                <span className="text-[11px] text-[#71675D]">Toggle operational standing</span>
              </div>
              <div className="flex items-center gap-1.5">
                {modalState.organization.status !== 'Active' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmStatusChange('Active')}
                    className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold hover:bg-emerald-200"
                  >
                    Activate
                  </button>
                )}
                {modalState.organization.status !== 'Suspended' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmStatusChange('Suspended')}
                    className="px-2.5 py-1 rounded bg-rose-100 text-rose-900 border border-rose-300 font-semibold hover:bg-rose-200"
                  >
                    Suspend
                  </button>
                )}
                {modalState.organization.status !== 'Inactive' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmStatusChange('Inactive')}
                    className="px-2.5 py-1 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] font-semibold hover:bg-[#BFB09D]"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-3 border-t border-[#B6AA9A] flex items-center justify-between">
              <Button
                variant="danger"
                onClick={() => setModalState({ type: 'delete', organization: modalState.organization })}
                className="text-xs"
              >
                Delete Organization
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setModalState(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleOpenEditModal(modalState.organization)}
                  className="text-xs"
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Delete Confirmation Dialog */}
      {modalState?.type === 'delete' && modalState.organization && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Organization"
          message={`Are you sure you want to permanently delete "${modalState.organization.name}"? This action will unlink associated learner seats and remove institutional sponsorship from courses in this session.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setModalState(null)}
        />
      )}
    </PageContainer>
  );
}
