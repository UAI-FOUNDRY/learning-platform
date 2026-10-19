import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  categoryService,
  getStoredCategoriesState,
  clearStoredCategories,
  applyCategoryOverrides,
  subscribeToCategoryUpdates,
  generateCategorySlug
} from '../../services/categoryService';
import { mockCategories } from '../../data/mockCategories';
import { mockCourses } from '../../data/mockCourses';
import {
  getStoredReviews,
  applyCourseReviews,
  subscribeToReviewUpdates
} from '../../utils/courseReviews';

/**
 * Semantic StatusBadge for category state
 * - Active: Emerald
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

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      Inactive
    </span>
  );
}

/**
 * Preset category icons for taxonomy creation
 */
const PRESET_ICONS = ['📁', '💻', '⚙️', '🤖', '☁️', '🛡️', '🎨', '📱', '📊', '💼', '🔬', '🌐', '📚', '🎯'];

export default function Categories() {
  const [rawCategories, setRawCategories] = useState(mockCategories);
  const [sessionOverrides, setSessionOverrides] = useState(getStoredCategoriesState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [statusNotice, setStatusNotice] = useState(null);

  // Synchronized courses state to ensure live course counts
  const [courseReviews, setCourseReviews] = useState(getStoredReviews);

  // Search, filter, and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals state
  // modalState: null | { type: 'create' | 'edit' | 'inspect' | 'toggle-status' | 'delete', category?: Object }
  const [modalState, setModalState] = useState(null);

  // Create / Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'Active',
    icon: '📁',
    subcategories: []
  });
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to live category session updates
  useEffect(() => {
    const unsubCategories = subscribeToCategoryUpdates(setSessionOverrides);
    const unsubReviews = subscribeToReviewUpdates(setCourseReviews);
    return () => {
      unsubCategories();
      unsubReviews();
    };
  }, []);

  // Fetch categories with fallback
  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoading(true);
      try {
        const res = await categoryService.getCategories();
        if (isMounted) {
          if (Array.isArray(res.items) && res.items.length > 0) {
            setRawCategories(res.items);
            setIsSampleData(res.isSample);
          } else {
            setRawCategories(mockCategories);
            setIsSampleData(true);
          }
        }
      } catch {
        if (isMounted) {
          setRawCategories(mockCategories);
          setIsSampleData(true);
        }
      } finally {
        if (isMounted) {
          setSessionOverrides(getStoredCategoriesState());
          setIsLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Resolved categories list with session overrides applied
  const categories = useMemo(() => {
    return applyCategoryOverrides(rawCategories, sessionOverrides);
  }, [rawCategories, sessionOverrides]);

  // Synchronized resolved courses dataset
  const resolvedCourses = useMemo(() => {
    return applyCourseReviews(mockCourses, courseReviews);
  }, [courseReviews]);

  // Map courses by category name
  const coursesByCategory = useMemo(() => {
    const map = {};
    resolvedCourses.forEach(c => {
      if (c.category) {
        if (!map[c.category]) {
          map[c.category] = [];
        }
        map[c.category].push(c);
      }
    });
    return map;
  }, [resolvedCourses]);

  // Total session modifications count
  const sessionChangeCount = useMemo(() => {
    const { added = [], updated = {}, deleted = [] } = sessionOverrides || {};
    return added.length + Object.keys(updated).length + deleted.length;
  }, [sessionOverrides]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.status === 'Active').length;
    const inactive = categories.filter(c => c.status === 'Inactive').length;
    const totalAssignedCourses = Object.values(coursesByCategory).reduce((sum, list) => sum + list.length, 0);
    const withCourses = categories.filter(c => (coursesByCategory[c.name] || []).length > 0).length;
    return { total, active, inactive, totalAssignedCourses, withCourses };
  }, [categories, coursesByCategory]);

  // Reset to first page when search, filters, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, pageSize]);

  // Filter and sort pipeline
  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];

    // Search query matching name, slug, description, or subcategory
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const slugMatch = (c.slug || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);
        const subcatMatch = Array.isArray(c.subcategories) && c.subcategories.some(s => s.toLowerCase().includes(q));
        return nameMatch || slugMatch || descMatch || subcatMatch;
      });
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      const countA = (coursesByCategory[a.name] || []).length;
      const countB = (coursesByCategory[b.name] || []).length;

      switch (sortBy) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'courses-desc':
          return countB - countA;
        case 'date-desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [categories, searchQuery, statusFilter, sortBy, coursesByCategory]);

  // Pagination calculation
  const totalFilteredItems = filteredAndSortedCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedCategories = filteredAndSortedCategories.slice(startIndex, startIndex + pageSize);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      status: 'Active',
      icon: '📁',
      subcategories: []
    });
    setNewSubcategoryInput('');
    setFormErrors({});
    setModalState({ type: 'create' });
  };

  // Open Edit Modal
  const handleOpenEditModal = (category) => {
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      status: category.status || 'Active',
      icon: category.icon || '📁',
      subcategories: Array.isArray(category.subcategories) ? [...category.subcategories] : []
    });
    setNewSubcategoryInput('');
    setFormErrors({});
    setModalState({ type: 'edit', category });
  };

  // Handle Form Name Change (auto-update slug if in create mode or slug matches previous slug)
  const handleNameChange = (e) => {
    const newName = e.target.value;
    const previousAutoSlug = generateCategorySlug(formData.name);
    const shouldAutoUpdateSlug = modalState?.type === 'create' || formData.slug === previousAutoSlug || !formData.slug;

    setFormData(prev => ({
      ...prev,
      name: newName,
      slug: shouldAutoUpdateSlug ? generateCategorySlug(newName) : prev.slug
    }));

    if (formErrors.name) {
      setFormErrors(prev => ({ ...prev, name: null }));
    }
  };

  // Subcategory management in form
  const handleAddSubcategory = () => {
    const trimmed = newSubcategoryInput.trim();
    if (!trimmed) return;
    if (formData.subcategories.includes(trimmed)) {
      setFormErrors(prev => ({ ...prev, subcategory: 'This subcategory is already added.' }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, trimmed]
    }));
    setNewSubcategoryInput('');
    setFormErrors(prev => ({ ...prev, subcategory: null }));
  };

  const handleRemoveSubcategory = (subcatToRemove) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter(s => s !== subcatToRemove)
    }));
  };

  // Form Submission (Create or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Category name is required.';
    } else {
      // Check for duplicate name among other categories
      const normalizedNewName = formData.name.trim().toLowerCase();
      const existingDuplicate = categories.find(c =>
        c.name.toLowerCase() === normalizedNewName &&
        (modalState.type === 'create' || c.id !== modalState.category?.id)
      );
      if (existingDuplicate) {
        errors.name = `A category named "${existingDuplicate.name}" already exists.`;
      }
    }

    if (!formData.slug.trim()) {
      errors.slug = 'Category slug is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalState.type === 'create') {
        await categoryService.createCategory(formData);
        setStatusNotice(`Category "${formData.name.trim()}" created successfully (development session).`);
      } else if (modalState.type === 'edit') {
        await categoryService.updateCategory(modalState.category.id, formData);
        setStatusNotice(`Category "${formData.name.trim()}" updated successfully.`);
      }
      setModalState(null);
    } catch (err) {
      setStatusNotice(err.message || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setStatusNotice(null);
      }, 5000);
    }
  };

  // Toggle Category Status (Activate / Deactivate)
  const handleConfirmToggleStatus = async () => {
    if (!modalState?.category) return;
    const cat = modalState.category;
    setIsSubmitting(true);
    try {
      const result = await categoryService.toggleCategoryStatus(cat.id, cat.status);
      const newStatus = result.patch.status;
      setStatusNotice(`Category "${cat.name}" is now ${newStatus.toLowerCase()}.`);
      setModalState(null);
    } catch {
      setStatusNotice(`Failed to update status for "${cat.name}".`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setStatusNotice(null);
      }, 5000);
    }
  };

  // Safe Deletion Execution
  const handleConfirmDelete = async () => {
    if (!modalState?.category) return;
    const cat = modalState.category;
    const assignedCoursesCount = (coursesByCategory[cat.name] || []).length;

    if (assignedCoursesCount > 0) {
      setStatusNotice(`Action blocked: Cannot delete "${cat.name}" because it contains ${assignedCoursesCount} course(s).`);
      setModalState(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await categoryService.deleteCategory(cat.id, assignedCoursesCount);
      setStatusNotice(`Category "${cat.name}" has been deleted.`);
      setModalState(null);
    } catch (err) {
      setStatusNotice(err.message || `Failed to delete category "${cat.name}".`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setStatusNotice(null);
      }, 5000);
    }
  };

  // Reset Session Overrides
  const handleResetSessionOverrides = () => {
    clearStoredCategories();
    setStatusNotice('Restored original mock category taxonomy.');
    setTimeout(() => {
      setStatusNotice(null);
    }, 4500);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSortBy('name-asc');
  };

  return (
    <PageContainer>
      {/* Page Heading & Header Controls */}
      <div className="pb-6 border-b border-[#B6AA9A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
                Category Management
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
                {summaryMetrics.total} Total Categories
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940]">
              Curate platform taxonomies, configure course classifications, manage subcategories, and monitor course assignments.
            </p>
          </div>

          {/* Quick Header Actions & Navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              onClick={handleOpenCreateModal}
              className="text-xs sm:text-sm py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Category</span>
            </Button>
            <Link
              to="/admin/courses"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>Course Catalog</span>
            </Link>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>User Directory</span>
            </Link>
          </div>
        </div>

        {/* Development Mode Notice Banner with Responsive Wrapping */}
        {isSampleData && (
          <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[13px] min-w-0">
            <div className="flex items-start sm:items-center gap-2.5 text-[#211E1A] min-w-0 flex-1">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white mt-0.5 sm:mt-0">
                Dev Mode
              </span>
              <div className="min-w-0 break-words leading-relaxed">
                <strong>Sample Category Taxonomy Active:</strong> Backend category taxonomy APIs are currently in development. New categories, subcategories, status changes, and safe deletions are simulated locally in this browser session.
                {sessionChangeCount > 0 && (
                  <span className="inline-block sm:inline sm:ml-2 text-emerald-950 font-medium">
                    ({sessionChangeCount} taxonomy {sessionChangeCount === 1 ? 'change' : 'changes'} saved)
                  </span>
                )}
              </div>
            </div>

            {(statusNotice || sessionChangeCount > 0) && (
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 sm:gap-3 min-w-0 max-w-full md:max-w-[48%] shrink-0">
                {statusNotice && (
                  <span className="text-emerald-950 font-medium animate-fade-in text-[12px] break-words min-w-0">
                    {statusNotice}
                  </span>
                )}
                {sessionChangeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetSessionOverrides}
                    className="text-xs font-semibold text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded shrink-0 whitespace-nowrap"
                  >
                    Reset session changes
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-6">
        {/* Category Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Categories */}
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'ALL'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Total Categories
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-[#211E1A] mt-1 block leading-none font-sans">
              {summaryMetrics.total}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Curated platform classifications
            </span>
          </button>

          {/* Card 2: Active Categories */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'Active' ? 'ALL' : 'Active')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'Active'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Active Taxonomies
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-emerald-900 mt-1 block leading-none font-sans">
              {summaryMetrics.active}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Available for course discovery
            </span>
          </button>

          {/* Card 3: Inactive Categories */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'Inactive' ? 'ALL' : 'Inactive')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'Inactive'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Inactive Categories
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-[#514940] mt-1 block leading-none font-sans">
              {summaryMetrics.inactive}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Hidden from catalog browsing
            </span>
          </button>

          {/* Card 4: Assigned Courses */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#B6AA9A] bg-[#C8BBAA] text-left">
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
                Assigned Courses
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                {summaryMetrics.withCourses} active categories
              </span>
            </div>
            <span className="text-[26px] sm:text-[30px] font-bold text-[#211E1A] mt-1 block leading-none font-sans">
              {summaryMetrics.totalAssignedCourses}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Total courses classified
            </span>
          </div>
        </div>

        {/* Filter and Search Controls Bar */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71675D]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search categories by name, slug, description, or subcategory..."
                aria-label="Search categories by name, slug, description, or subcategory"
                className="w-full pl-9 pr-8 py-2 text-[13px] bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:bg-[#F3ECE4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
                  aria-label="Clear search input"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="category-status-filter" className="text-[#514940] font-medium shrink-0">
                  Status:
                </label>
                <select
                  id="category-status-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="ALL">All Statuses ({categories.length})</option>
                  <option value="Active">Active ({summaryMetrics.active})</option>
                  <option value="Inactive">Inactive ({summaryMetrics.inactive})</option>
                </select>
              </div>

              {/* Sort By Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="category-sort-filter" className="text-[#514940] font-medium shrink-0">
                  Sort:
                </label>
                <select
                  id="category-sort-filter"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="name-asc">Name: A → Z</option>
                  <option value="name-desc">Name: Z → A</option>
                  <option value="courses-desc">Most Courses</option>
                  <option value="date-desc">Newest First</option>
                </select>
              </div>

              {/* Clear Filters Reset Button */}
              {(searchQuery || statusFilter !== 'ALL' || sortBy !== 'name-asc') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Records Table Section */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader size="medium" />
              <p className="mt-3 text-sm text-[#71675D]">Loading category taxonomy records...</p>
            </div>
          ) : paginatedCategories.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                title="No matching categories found"
                description={
                  searchQuery || statusFilter !== 'ALL'
                    ? searchQuery
                      ? `No category records match "${searchQuery}" with the current status filter.`
                      : 'No category records match the current status filter.'
                    : 'No categories are currently configured on the platform.'
                }
                action={
                  (searchQuery || statusFilter !== 'ALL') ? (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] hover:bg-[#D6D0C8]"
                    >
                      Clear Search & Filters
                    </button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleOpenCreateModal}
                      className="mt-3 text-xs"
                    >
                      Add First Category
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <caption className="sr-only">Course categories and taxonomy management records list</caption>
                <thead>
                  <tr className="border-b border-[#B6AA9A] bg-[#C1B3A0]/60 text-[#514940] uppercase tracking-wider text-[11px] font-bold">
                    <th scope="col" className="py-3 px-3 sm:px-4 min-w-[180px]">
                      Category & Description
                    </th>
                    <th scope="col" className="py-3 px-2 sm:px-3">
                      Subcategories
                    </th>
                    <th scope="col" className="py-3 px-2 text-center whitespace-nowrap">
                      Courses
                    </th>
                    <th scope="col" className="py-3 px-2 text-center whitespace-nowrap">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A] bg-[#C8BBAA]">
                  {paginatedCategories.map(category => {
                    const assignedCourses = coursesByCategory[category.name] || [];
                    const courseCount = assignedCourses.length;
                    const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];

                    return (
                      <tr key={category.id} className="hover:bg-[#EAE3DA]/50 transition-colors">
                        {/* Category Name, Icon, Slug & Description */}
                        <td className="py-3 px-3 sm:px-4 max-w-[240px] sm:max-w-[280px]">
                          <div className="flex items-start gap-3">
                            <span className="text-xl sm:text-2xl shrink-0 p-1 bg-[#EAE3DA] rounded-lg border border-[#B6AA9A]" aria-hidden="true">
                              {category.icon || '📁'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-semibold text-[14px] text-[#211E1A] line-clamp-1 cursor-pointer hover:text-[#D92D2D] transition-colors"
                                  onClick={() => setModalState({ type: 'inspect', category })}
                                  title={`Inspect ${category.name}`}
                                >
                                  {category.name}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-[#71675D] mt-0.5">
                                /{category.slug}
                              </p>
                              <p className="text-[12px] text-[#514940] mt-1 line-clamp-2 leading-relaxed">
                                {category.description || 'No description provided.'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Subcategories Chips */}
                        <td className="py-3.5 px-3 max-w-[240px]">
                          {subcategories.length === 0 ? (
                            <span className="text-xs text-[#71675D] italic">None configured</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {subcategories.slice(0, 3).map((sub, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] truncate max-w-[150px]"
                                  title={sub}
                                >
                                  {sub}
                                </span>
                              ))}
                              {subcategories.length > 3 && (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#B6AA9A]/50 text-[#211E1A] cursor-pointer hover:bg-[#B6AA9A]"
                                  onClick={() => setModalState({ type: 'inspect', category })}
                                  title={`View all ${subcategories.length} subcategories`}
                                >
                                  +{subcategories.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Assigned Course Count Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => setModalState({ type: 'inspect', category })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                              courseCount > 0
                                ? 'bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8]'
                                : 'bg-[#C1B3A0]/50 text-[#71675D] border border-transparent'
                            }`}
                            title={`Inspect ${courseCount} courses in ${category.name}`}
                          >
                            <span className="font-mono">{courseCount}</span>
                            <span className="text-[11px] font-normal text-[#514940]">
                              {courseCount === 1 ? 'course' : 'courses'}
                            </span>
                          </button>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                          <StatusBadge status={category.status} />
                        </td>

                        {/* Administrative Actions */}
                        <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Inspect Details Button */}
                            <button
                              type="button"
                              onClick={() => setModalState({ type: 'inspect', category })}
                              className="px-2.5 py-1 text-[12px] font-medium text-[#211E1A] bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                              aria-label={`Inspect ${category.name}`}
                            >
                              Inspect
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(category)}
                              className="px-2.5 py-1 text-[12px] font-medium text-[#211E1A] bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                              aria-label={`Edit ${category.name}`}
                            >
                              Edit
                            </button>

                            {/* Activate / Deactivate Toggle */}
                            <button
                              type="button"
                              onClick={() => setModalState({ type: 'toggle-status', category })}
                              className={`px-2 py-1 text-[12px] font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                                category.status === 'Active'
                                  ? 'text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300'
                                  : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                              }`}
                              title={category.status === 'Active' ? 'Deactivate category' : 'Activate category'}
                            >
                              {category.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>

                            {/* Delete Button with Safe Deletion Enforcement */}
                            <button
                              type="button"
                              onClick={() => setModalState({ type: 'delete', category })}
                              className="px-2 py-1 text-[12px] font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                              title={
                                courseCount > 0
                                  ? `Category contains ${courseCount} courses; cannot be deleted`
                                  : `Delete ${category.name}`
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer */}
          {!isLoading && paginatedCategories.length > 0 && (
            <div className="p-3.5 sm:p-4 border-t border-[#B6AA9A] bg-[#C1B3A0]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#514940]">
              {/* Range indicator */}
              <div>
                Showing <strong className="text-[#211E1A]">{startIndex + 1}</strong> to{' '}
                <strong className="text-[#211E1A]">
                  {Math.min(startIndex + pageSize, totalFilteredItems)}
                </strong>{' '}
                of <strong className="text-[#211E1A]">{totalFilteredItems}</strong> categories
                {(searchQuery || statusFilter !== 'ALL') && (
                  <span className="text-[#71675D] ml-1">(filtered from {categories.length})</span>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[#71675D] text-[11px]">Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    aria-label="Categories per page"
                    className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded px-2 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  >
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  >
                    Prev
                  </button>
                  <span className="px-2 text-xs font-medium text-[#211E1A]">
                    {safeCurrentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create or Edit Category Modal */}
      <Modal
        isOpen={modalState?.type === 'create' || modalState?.type === 'edit'}
        onClose={() => !isSubmitting && setModalState(null)}
        title={modalState?.type === 'create' ? 'Create New Category' : `Edit Category: ${modalState?.category?.name}`}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs sm:text-sm text-[#514940]">
          {/* Category Name */}
          <div>
            <label htmlFor="cat-name-input" className="block text-xs font-semibold text-[#211E1A] mb-1">
              Category Name <span className="text-[#D92D2D]">*</span>
            </label>
            <input
              id="cat-name-input"
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Artificial Intelligence, Data Science..."
              className={`w-full p-2 text-xs sm:text-sm bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                formErrors.name ? 'border-[#D92D2D] bg-rose-50/50' : 'border-[#B6AA9A]'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-[11px] text-[#D92D2D] font-medium">{formErrors.name}</p>
            )}
          </div>

          {/* Slug and Icon Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Slug input */}
            <div className="sm:col-span-2">
              <label htmlFor="cat-slug-input" className="block text-xs font-semibold text-[#211E1A] mb-1">
                URL Slug <span className="text-[#D92D2D]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[#71675D] font-mono text-xs">
                  /
                </span>
                <input
                  id="cat-slug-input"
                  type="text"
                  value={formData.slug}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }));
                    if (formErrors.slug) setFormErrors(prev => ({ ...prev, slug: null }));
                  }}
                  placeholder="category-slug"
                  className={`w-full pl-6 p-2 font-mono text-xs bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                    formErrors.slug ? 'border-[#D92D2D] bg-rose-50/50' : 'border-[#B6AA9A]'
                  }`}
                />
              </div>
              {formErrors.slug && (
                <p className="mt-1 text-[11px] text-[#D92D2D] font-medium">{formErrors.slug}</p>
              )}
            </div>

            {/* Icon picker */}
            <div>
              <label htmlFor="cat-icon-select" className="block text-xs font-semibold text-[#211E1A] mb-1">
                Icon
              </label>
              <select
                id="cat-icon-select"
                value={formData.icon}
                onChange={e => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full p-2 text-sm bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              >
                {PRESET_ICONS.map(ic => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="cat-desc-input" className="block text-xs font-semibold text-[#211E1A] mb-1">
              Description
            </label>
            <textarea
              id="cat-desc-input"
              rows="3"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Outline the curriculum scope and focus of this classification..."
              className="w-full p-2 text-xs bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            />
          </div>

          {/* Status Radio Choice */}
          <div>
            <span className="block text-xs font-semibold text-[#211E1A] mb-1">
              Category Status
            </span>
            <div className="flex items-center gap-4 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="category-status"
                  value="Active"
                  checked={formData.status === 'Active'}
                  onChange={() => setFormData(prev => ({ ...prev, status: 'Active' }))}
                  className="accent-[#D92D2D]"
                />
                <span className="font-medium text-[#211E1A]">Active (Published in Catalog)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="category-status"
                  value="Inactive"
                  checked={formData.status === 'Inactive'}
                  onChange={() => setFormData(prev => ({ ...prev, status: 'Inactive' }))}
                  className="accent-[#D92D2D]"
                />
                <span className="font-medium text-[#514940]">Inactive (Hidden)</span>
              </label>
            </div>
          </div>

          {/* Subcategories Editor */}
          <div className="pt-2 border-t border-[#B6AA9A]/60">
            <label className="block text-xs font-semibold text-[#211E1A] mb-1">
              Subcategories ({formData.subcategories.length})
            </label>
            <p className="text-[11px] text-[#71675D] mb-2">
              Add sub-topics or specialized branches to organize curriculum tracks under this category.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubcategoryInput}
                onChange={e => {
                  setNewSubcategoryInput(e.target.value);
                  if (formErrors.subcategory) setFormErrors(prev => ({ ...prev, subcategory: null }));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcategory();
                  }
                }}
                placeholder="Type subcategory name and press Add..."
                className="flex-1 p-2 text-xs bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              />
              <button
                type="button"
                onClick={handleAddSubcategory}
                className="px-3 py-2 text-xs font-semibold bg-[#C8BBAA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#B6AA9A] rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {formErrors.subcategory && (
              <p className="mt-1 text-[11px] text-[#D92D2D] font-medium">{formErrors.subcategory}</p>
            )}

            {/* Added Subcategories Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-28 overflow-y-auto p-1 bg-[#EAE3DA]/50 border border-[#B6AA9A]/50 rounded-lg">
              {formData.subcategories.length === 0 ? (
                <span className="text-xs text-[#71675D] italic p-1">No subcategories added yet.</span>
              ) : (
                formData.subcategories.map((sub, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]"
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubcategory(sub)}
                      className="text-[#71675D] hover:text-[#D92D2D] font-bold text-xs"
                      aria-label={`Remove ${sub}`}
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#B6AA9A]">
            <Button
              variant="secondary"
              onClick={() => setModalState(null)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting
                ? 'Saving...'
                : modalState?.type === 'create'
                ? 'Create Category'
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Inspect Category Details & Assigned Courses */}
      <Modal
        isOpen={modalState?.type === 'inspect'}
        onClose={() => setModalState(null)}
        title={modalState?.category ? `${modalState.category.icon || '📁'} ${modalState.category.name}` : 'Category Details'}
      >
        {modalState?.category && (() => {
          const cat = modalState.category;
          const assignedCourses = coursesByCategory[cat.name] || [];
          const subcategories = Array.isArray(cat.subcategories) ? cat.subcategories : [];

          return (
            <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
              {/* Header profile */}
              <div className="flex items-center justify-between pb-3 border-b border-[#B6AA9A]">
                <div>
                  <h4 className="text-[17px] font-bold text-[#211E1A]">{cat.name}</h4>
                  <p className="font-mono text-xs text-[#71675D]">/{cat.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={cat.status} />
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A]">
                    {assignedCourses.length} {assignedCourses.length === 1 ? 'Course' : 'Courses'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block">
                  Description
                </span>
                <p className="mt-1 text-xs text-[#211E1A] leading-relaxed bg-[#EAE3DA] p-2.5 rounded-lg border border-[#B6AA9A]">
                  {cat.description || 'No detailed description available.'}
                </p>
              </div>

              {/* Subcategories list */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block mb-1">
                  Subcategories ({subcategories.length})
                </span>
                {subcategories.length === 0 ? (
                  <p className="text-xs text-[#71675D] italic">None configured for this category.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {subcategories.map((sub, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded text-xs bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned courses list */}
              <div className="pt-2 border-t border-[#B6AA9A]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block">
                    Assigned Courses ({assignedCourses.length})
                  </span>
                  <Link
                    to="/admin/courses"
                    className="text-xs font-semibold text-[#D92D2D] hover:underline"
                  >
                    View in Course Management →
                  </Link>
                </div>

                {assignedCourses.length === 0 ? (
                  <div className="p-3 bg-[#EAE3DA] border border-[#B6AA9A] rounded-lg text-center text-xs text-[#71675D]">
                    No courses are currently assigned to this category.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {assignedCourses.map(course => (
                      <div
                        key={course.id}
                        className="p-2.5 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#211E1A] truncate">{course.title}</p>
                          <p className="text-[11px] text-[#71675D]">
                            Instructor: {course.instructor || 'Unassigned'} • Level: {course.level || 'All'}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] px-2 py-0.5 rounded bg-[#C8BBAA] text-[#211E1A] border border-[#B6AA9A]">
                          {course.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-[#B6AA9A]">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const currentCat = cat;
                    setModalState(null);
                    handleOpenEditModal(currentCat);
                  }}
                  className="text-xs"
                >
                  Edit Category
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setModalState(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 3: Safe Deletion Modal (Blocks deletion if category contains courses) */}
      <Modal
        isOpen={modalState?.type === 'delete'}
        onClose={() => !isSubmitting && setModalState(null)}
        title={
          (coursesByCategory[modalState?.category?.name] || []).length > 0
            ? 'Cannot Delete Category'
            : 'Confirm Category Deletion'
        }
      >
        {modalState?.category && (() => {
          const cat = modalState.category;
          const assignedCourses = coursesByCategory[cat.name] || [];
          const hasCourses = assignedCourses.length > 0;

          if (hasCourses) {
            return (
              <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
                {/* Block alert banner */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs space-y-1.5">
                  <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Deletion Blocked: Assigned Courses Found
                  </p>
                  <p>
                    Category <strong className="text-[#211E1A]">"{cat.name}"</strong> cannot be deleted because it currently has{' '}
                    <strong className="text-amber-900">{assignedCourses.length} course(s)</strong> classified under it.
                  </p>
                  <p>
                    Deleting this category would leave existing course records without an authoritative taxonomy category.
                  </p>
                </div>

                {/* List of conflicting courses */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#71675D] block mb-1.5">
                    Assigned Courses to Reassign ({assignedCourses.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#EAE3DA] rounded-lg border border-[#B6AA9A]">
                    {assignedCourses.map(course => (
                      <div key={course.id} className="text-xs flex items-center justify-between text-[#211E1A]">
                        <span className="truncate pr-2">• {course.title}</span>
                        <span className="font-mono text-[10px] text-[#71675D] shrink-0">ID: {course.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#514940]">
                  Please reassign or archive these courses in <strong>Course Management</strong> before deleting this category.
                </p>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#B6AA9A]">
                  <Link
                    to="/admin/courses"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8]"
                  >
                    Go to Course Management →
                  </Link>
                  <Button
                    variant="primary"
                    onClick={() => setModalState(null)}
                    className="text-xs"
                  >
                    Understood
                  </Button>
                </div>
              </div>
            );
          }

          // Safe deletion confirmed path (0 courses assigned)
          return (
            <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
              <p>
                Are you sure you want to delete <strong className="text-[#211E1A]">"{cat.name}"</strong>?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs space-y-1 text-rose-950">
                <p>• <strong>Safe Operation:</strong> This category has 0 courses assigned.</p>
                <p>• <strong>Permanent:</strong> This category and its subcategories will be permanently removed from taxonomy records.</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#B6AA9A]">
                <Button
                  variant="secondary"
                  onClick={() => setModalState(null)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  {isSubmitting ? 'Deleting...' : 'Confirm Deletion'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 4: Toggle Status Confirmation Modal */}
      <Modal
        isOpen={modalState?.type === 'toggle-status'}
        onClose={() => !isSubmitting && setModalState(null)}
        title={modalState?.category?.status === 'Active' ? 'Deactivate Category' : 'Activate Category'}
      >
        {modalState?.category && (() => {
          const cat = modalState.category;
          const isDeactivating = cat.status === 'Active';
          const courseCount = (coursesByCategory[cat.name] || []).length;

          return (
            <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
              <p>
                Are you sure you want to {isDeactivating ? 'deactivate' : 'activate'}{' '}
                <strong className="text-[#211E1A]">"{cat.name}"</strong>?
              </p>

              {isDeactivating ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-1.5 text-amber-950">
                  <p>
                    • <strong>Catalog Visibility:</strong> Inactive categories are hidden from learner catalog browsing and exploration filters.
                  </p>
                  {courseCount > 0 && (
                    <p>
                      • <strong>Existing Courses:</strong> The {courseCount} assigned course(s) will remain active, but this category tag will be marked inactive.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1.5 text-emerald-950">
                  <p>
                    • <strong>Catalog Visibility:</strong> Active categories are immediately visible to instructors when authoring courses and learners when browsing.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#B6AA9A]">
                <Button
                  variant="secondary"
                  onClick={() => setModalState(null)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant={isDeactivating ? 'primary' : 'primary'}
                  onClick={handleConfirmToggleStatus}
                  disabled={isSubmitting}
                  className={`text-xs ${isDeactivating ? 'bg-amber-700 hover:bg-amber-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}
                >
                  {isSubmitting
                    ? 'Updating...'
                    : isDeactivating
                    ? 'Confirm Deactivation'
                    : 'Confirm Activation'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </PageContainer>
  );
}
