const mongoose = require('mongoose');
const { Book, BOOK_CATEGORIES } = require('../models/Book');
const Counter = require('../models/Counter');
const Loan = require('../models/Loan');
const { sendResponse } = require('../utils/apiResponse');
const { isLoanOverdue } = require('../utils/dateUtils');
const {
  escapeRegex,
  validateCreateBookInput,
  validateUpdateBookInput,
} = require('../utils/validators');

/**
 * Generates an atomic, monotonically increasing book code per category:
 * LB-<FIRST_3_LETTERS_OF_CATEGORY>-<3_DIGIT_SEQUENCE>
 */
async function generateBookCode(category) {
  const prefix = category.slice(0, 3).toUpperCase();
  const counter = await Counter.findOneAndUpdate(
    { _id: `bookCode_${category}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `LB-${prefix}-${String(counter.seq).padStart(3, '0')}`;
}

/**
 * GET /api/books
 * Query params: category, availableOnly, search, page, limit
 */
async function getBooks(req, res, next) {
  try {
    const { category, availableOnly, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 && parsedLimit <= 50 ? parsedLimit : 5;

    const filter = {};

    if (category && category !== 'All') {
      if (!BOOK_CATEGORIES.includes(category)) {
        return sendResponse(res, 400, false, 'Invalid category filter');
      }
      filter.category = category;
    }

    if (availableOnly === 'true') {
      filter.availableCopies = { $gt: 0 };
    }

    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: regex }, { author: regex }];
    }

    const totalBooks = await Book.countDocuments(filter);
    const totalPages = Math.ceil(totalBooks / limit);
    const books = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return sendResponse(res, 200, true, 'Books fetched successfully', {
      books,
      totalBooks,
      totalPages,
      currentPage: page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/books/:id
 * Returns book details along with its loan history.
 */
async function getBookById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, false, 'Invalid book ID');
    }

    const book = await Book.findById(id).lean();
    if (!book) {
      return sendResponse(res, 404, false, 'Book not found');
    }

    const loansRaw = await Loan.find({ book: book._id })
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();

    const loans = loansRaw.map((loan) => ({
      ...loan,
      isOverdue: isLoanOverdue(loan),
    }));

    return sendResponse(res, 200, true, 'Book details fetched successfully', {
      book,
      loans,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/books
 * Creates a new book with auto-generated bookCode and availableCopies === totalCopies.
 */
async function createBook(req, res, next) {
  try {
    const validation = validateCreateBookInput(req.body);
    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.error);
    }

    const { title, author, isbn, category, totalCopies } = validation.data;

    const existingIsbn = await Book.findOne({ isbn }).lean();
    if (existingIsbn) {
      return sendResponse(res, 409, false, 'A book with this ISBN already exists');
    }

    const bookCode = await generateBookCode(category);

    const book = await Book.create({
      bookCode,
      title,
      author,
      isbn,
      category,
      totalCopies,
      availableCopies: totalCopies,
    });

    return sendResponse(res, 201, true, 'Book added successfully', book);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.isbn) {
      return sendResponse(res, 409, false, 'A book with this ISBN already exists');
    }
    return next(err);
  }
}

/**
 * PUT /api/books/:id
 * Updates only title, author, and totalCopies; recalculates availableCopies.
 */
async function updateBook(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, false, 'Invalid book ID');
    }

    const validation = validateUpdateBookInput(req.body);
    if (!validation.valid) {
      return sendResponse(res, 400, false, validation.error);
    }

    const book = await Book.findById(id);
    if (!book) {
      return sendResponse(res, 404, false, 'Book not found');
    }

    const issuedCopies = await Loan.countDocuments({ book: book._id, status: 'Issued' });
    const { title, author, totalCopies } = validation.data;

    if (totalCopies < issuedCopies) {
      return sendResponse(
        res,
        400,
        false,
        `Total copies (${totalCopies}) cannot be reduced below currently issued copies (${issuedCopies})`
      );
    }

    book.title = title;
    book.author = author;
    book.totalCopies = totalCopies;
    book.availableCopies = totalCopies - issuedCopies;

    await book.save();

    return sendResponse(res, 200, true, 'Book updated successfully', book);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/books/:id
 * Rejects deletion if the book has any unreturned copies.
 */
async function deleteBook(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, false, 'Invalid book ID');
    }

    const book = await Book.findById(id);
    if (!book) {
      return sendResponse(res, 404, false, 'Book not found');
    }

    const activeLoansCount = await Loan.countDocuments({ book: book._id, status: 'Issued' });
    if (activeLoansCount > 0 || book.availableCopies < book.totalCopies) {
      return sendResponse(
        res,
        400,
        false,
        'Cannot delete book because one or more copies are currently issued'
      );
    }

    await Loan.deleteMany({ book: book._id });
    await book.deleteOne();

    return sendResponse(res, 200, true, 'Book deleted successfully', { id });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
};
