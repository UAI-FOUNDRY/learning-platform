
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiClient(endpoint, { body, params, ...customConfig } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let url = `${BASE_URL}${endpoint}`;

  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });

    const queryString = searchParams.toString();

    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let message = '';

    if (
      typeof errorData.message === 'string' &&
      errorData.message.trim()
    ) {
      message = errorData.message.trim();
    } else if (
      typeof errorData.detail === 'string' &&
      errorData.detail.trim()
    ) {
      message = errorData.detail.trim();
    } else if (
      errorData.detail !== null &&
      typeof errorData.detail === 'object'
    ) {
      try {
        message = JSON.stringify(errorData.detail);
      } catch {
        message = `API request failed (${response.status})`;
      }
    } else {
      message = `API request failed (${response.status})`;
    }

    const error = new Error(message);
    error.status = response.status;
    error.data = errorData;

    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
