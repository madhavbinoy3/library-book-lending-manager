const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload?.data || null
    );
  }

  return payload;
}

export const api = {
  getStats() {
    return request('/stats');
  },

  getBooks({ page = 1, limit = 5, category = '', availableOnly = false, search = '' } = {}) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (category && category !== 'All') params.set('category', category);
    if (availableOnly) params.set('availableOnly', 'true');
    if (search.trim()) params.set('search', search.trim());
    return request(`/books?${params.toString()}`);
  },

  getBookById(id) {
    return request(`/books/${id}`);
  },

  createBook(bookData) {
    return request('/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    });
  },

  updateBook(id, bookData) {
    return request(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData),
    });
  },

  deleteBook(id) {
    return request(`/books/${id}`, {
      method: 'DELETE',
    });
  },

  issueBook(bookId, issueData) {
    return request(`/books/${bookId}/issue`, {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  },

  returnLoan(loanId) {
    return request(`/loans/${loanId}/return`, {
      method: 'POST',
    });
  },
};
