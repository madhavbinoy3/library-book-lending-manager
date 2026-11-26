const { BOOK_CATEGORIES } = require('../models/Book');

const ISBN_REGEX = /^(\d{10}|\d{13})$/;

/**
 * Escape special regex characters in user-provided search strings.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate totalCopies as an integer between 1 and 20.
 */
function parseAndValidateTotalCopies(value) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 20) {
    return { valid: false, error: 'Total copies must be a whole number between 1 and 20' };
  }
  return { valid: true, value: num };
}

/**
 * Validate book payload for creation.
 */
function validateCreateBookInput(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const author = typeof body.author === 'string' ? body.author.trim() : '';
  const isbn = typeof body.isbn === 'string' ? body.isbn.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';

  if (!title) return { valid: false, error: 'Title is required' };
  if (!author) return { valid: false, error: 'Author is required' };
  if (!ISBN_REGEX.test(isbn)) {
    return { valid: false, error: 'ISBN must contain exactly 10 or 13 digits' };
  }
  if (!BOOK_CATEGORIES.includes(category)) {
    return {
      valid: false,
      error: `Category must be one of: ${BOOK_CATEGORIES.join(', ')}`,
    };
  }

  const copiesCheck = parseAndValidateTotalCopies(body.totalCopies);
  if (!copiesCheck.valid) {
    return { valid: false, error: copiesCheck.error };
  }

  return {
    valid: true,
    data: {
      title,
      author,
      isbn,
      category,
      totalCopies: copiesCheck.value,
    },
  };
}

/**
 * Validate book payload for editing (only title, author, totalCopies are editable).
 */
function validateUpdateBookInput(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const author = typeof body.author === 'string' ? body.author.trim() : '';

  if (!title) return { valid: false, error: 'Title is required' };
  if (!author) return { valid: false, error: 'Author is required' };

  const copiesCheck = parseAndValidateTotalCopies(body.totalCopies);
  if (!copiesCheck.valid) {
    return { valid: false, error: copiesCheck.error };
  }

  return {
    valid: true,
    data: {
      title,
      author,
      totalCopies: copiesCheck.value,
    },
  };
}

module.exports = {
  ISBN_REGEX,
  escapeRegex,
  parseAndValidateTotalCopies,
  validateCreateBookInput,
  validateUpdateBookInput,
};
