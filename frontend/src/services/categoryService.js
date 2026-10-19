import { apiClient } from './api';
import { mockCategories } from '../data/mockCategories';

export const CATEGORIES_STORAGE_KEY = 'learnspace_admin_categories';
export const CATEGORIES_UPDATED_EVENT = 'learnspace_admin_categories_updated';

/**
 * Reads local development session category overrides from localStorage.
 * Format: { added: Category[], updated: Record<string, Partial<Category>>, deleted: string[] }
 */
export function getStoredCategoriesState() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { added: [], updated: {}, deleted: [] };
    }
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return { added: [], updated: {}, deleted: [] };
    const parsed = JSON.parse(raw);
    return {
      added: Array.isArray(parsed?.added) ? parsed.added : [],
      updated: parsed?.updated && typeof parsed.updated === 'object' ? parsed.updated : {},
      deleted: Array.isArray(parsed?.deleted) ? parsed.deleted : []
    };
  } catch {
    return { added: [], updated: {}, deleted: [] };
  }
}

/**
 * Saves the current category overrides state to localStorage and dispatches an update event.
 */
function saveStoredCategoriesState(state) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(state));
      notifyCategoryUpdates();
    }
  } catch {
    // Ignore quota errors in development mode
  }
}

/**
 * Dispatches an event across the window to notify all mounted subscribers of category changes.
 */
function notifyCategoryUpdates() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATEGORIES_UPDATED_EVENT));
  }
}

/**
 * Clears all category overrides and restores the default mock taxonomy.
 */
export function clearStoredCategories() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CATEGORIES_STORAGE_KEY);
      notifyCategoryUpdates();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Subscribes a callback to category updates (both same-tab CustomEvent and cross-tab StorageEvent).
 */
export function subscribeToCategoryUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    callback(getStoredCategoriesState());
  };

  const handleStorageEvent = (event) => {
    if (!event || event.key === CATEGORIES_STORAGE_KEY) {
      callback(getStoredCategoriesState());
    }
  };

  window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Applies added, updated, and deleted category session overrides to an array of base categories.
 */
export function applyCategoryOverrides(baseCategories = mockCategories, overrides = getStoredCategoriesState()) {
  const { added = [], updated = {}, deleted = [] } = overrides || {};
  const deletedSet = new Set(deleted);

  // 1. Filter out deleted base categories and apply updates
  const modifiedBase = (baseCategories || [])
    .filter(cat => !deletedSet.has(cat.id))
    .map(cat => {
      const patch = updated[cat.id];
      if (!patch) return cat;
      return { ...cat, ...patch };
    });

  // 2. Filter out any added categories that were subsequently deleted, and apply updates
  const modifiedAdded = added
    .filter(cat => !deletedSet.has(cat.id))
    .map(cat => {
      const patch = updated[cat.id];
      if (!patch) return cat;
      return { ...cat, ...patch };
    });

  return [...modifiedBase, ...modifiedAdded];
}

/**
 * Generates a clean URL-friendly slug from a category title.
 */
export function generateCategorySlug(name = '') {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export const categoryService = {
  /**
   * Fetches category list with graceful development fallback to mockCategories.
   */
  async getCategories() {
    try {
      const data = await apiClient('/categories');
      if (Array.isArray(data) && data.length > 0) {
        return { items: data, isSample: false };
      }
      return { items: mockCategories, isSample: true };
    } catch {
      return { items: mockCategories, isSample: true };
    }
  },

  /**
   * Creates a new category with session persistence.
   */
  async createCategory(categoryData) {
    const newCategory = {
      id: `cat-${Date.now().toString(36)}`,
      name: categoryData.name.trim(),
      slug: categoryData.slug?.trim() || generateCategorySlug(categoryData.name),
      description: categoryData.description?.trim() || '',
      status: categoryData.status || 'Active',
      icon: categoryData.icon || '📁',
      subcategories: Array.isArray(categoryData.subcategories) ? categoryData.subcategories : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await apiClient('/categories', { method: 'POST', body: newCategory });
    } catch {
      // Backend placeholder: simulate successful persistence in session
    }

    const state = getStoredCategoriesState();
    state.added.push(newCategory);
    saveStoredCategoriesState(state);

    return { success: true, category: newCategory };
  },

  /**
   * Updates an existing category.
   */
  async updateCategory(id, categoryData) {
    const patch = {
      ...categoryData,
      updatedAt: new Date().toISOString()
    };

    try {
      await apiClient(`/categories/${id}`, { method: 'PUT', body: patch });
    } catch {
      // Backend placeholder: simulate successful persistence in session
    }

    const state = getStoredCategoriesState();
    state.updated[id] = { ...(state.updated[id] || {}), ...patch };
    saveStoredCategoriesState(state);

    return { success: true, patch };
  },

  /**
   * Deactivates or activates a category.
   */
  async toggleCategoryStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    return this.updateCategory(id, { status: newStatus });
  },

  /**
   * Safely deletes a category.
   * Throws an error if the category still contains active courses.
   */
  async deleteCategory(id, courseCount = 0) {
    if (courseCount > 0) {
      throw new Error(`Cannot delete category: ${courseCount} courses are currently classified under this category.`);
    }

    try {
      await apiClient(`/categories/${id}`, { method: 'DELETE' });
    } catch {
      // Backend placeholder: simulate successful persistence in session
    }

    const state = getStoredCategoriesState();
    if (!state.deleted.includes(id)) {
      state.deleted.push(id);
    }
    // Remove from added array if it was dynamically created
    state.added = state.added.filter(c => c.id !== id);
    delete state.updated[id];
    saveStoredCategoriesState(state);

    return { success: true, id };
  }
};
