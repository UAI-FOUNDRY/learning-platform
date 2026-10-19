const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiClient(endpoint, { body, ...customConfig } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
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

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // The API sends { message, detail, error_type }; "message" is always readable text.
    const error = new Error(
      errorData.message ||
        (typeof errorData.detail === 'string' ? errorData.detail : '') ||
        'API request failed'
    );
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}
