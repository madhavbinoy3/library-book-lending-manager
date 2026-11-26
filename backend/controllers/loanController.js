const mongoose = require('mongoose');
const { Book } = require('../models/Book');
const Loan = require('../models/Loan');
const { sendResponse } = require('../utils/apiResponse');
const {
  parseDateOnly,
  getTodayCalendarUTC,
  addDaysUTC,
  isLoanOverdue,
  calculateFine,
} = require('../utils/dateUtils');

/**
 * POST /api/books/:id/issue
 * Issues a copy of the book to a member for 14 days.
 */
async function issueBook(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, false, 'Invalid book ID');
    }

    const memberName = typeof req.body.memberName === 'string' ? req.body.memberName.trim() : '';
    const memberId = typeof req.body.memberId === 'string' ? req.body.memberId.trim() : '';

    if (!memberName) {
      return sendResponse(res, 400, false, 'Member name is required');
    }
    if (!memberId) {
      return sendResponse(res, 400, false, 'Member ID is required');
    }

    const issueDate = parseDateOnly(req.body.issueDate);
    if (!issueDate) {
      return sendResponse(res, 400, false, 'Invalid issue date');
    }

    const todayUTC = getTodayCalendarUTC();
    if (issueDate.getTime() > todayUTC.getTime()) {
      return sendResponse(res, 400, false, 'Issue date cannot be a future date');
    }

    const book = await Book.findById(id);
    if (!book) {
      return sendResponse(res, 404, false, 'Book not found');
    }

    if (book.availableCopies <= 0) {
      return sendResponse(res, 400, false, 'No copies available to issue');
    }

    const existingActiveLoan = await Loan.findOne({
      book: book._id,
      memberId,
      status: 'Issued',
    }).lean();

    if (existingActiveLoan) {
      return sendResponse(
        res,
        409,
        false,
        'This member already holds an unreturned copy of this book'
      );
    }

    const updatedBook = await Book.findOneAndUpdate(
      { _id: book._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!updatedBook) {
      return sendResponse(res, 400, false, 'No copies available to issue');
    }

    const dueDate = addDaysUTC(issueDate, 14);

    let loan;
    try {
      loan = await Loan.create({
        book: book._id,
        memberName,
        memberId,
        issueDate,
        dueDate,
        returnDate: null,
        fine: 0,
        status: 'Issued',
      });
    } catch (createErr) {
      await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: 1 } });
      throw createErr;
    }

    const loanObj = loan.toObject();
    loanObj.isOverdue = isLoanOverdue(loanObj);

    return sendResponse(res, 201, true, 'Book issued successfully', {
      loan: loanObj,
      book: updatedBook,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/loans/:loanId/return
 * Marks an active loan as returned, increments availableCopies, and calculates late fine.
 */
async function returnBook(req, res, next) {
  try {
    const { loanId } = req.params;
    if (!mongoose.isValidObjectId(loanId)) {
      return sendResponse(res, 400, false, 'Invalid loan ID');
    }

    const existingLoan = await Loan.findById(loanId);
    if (!existingLoan) {
      return sendResponse(res, 404, false, 'Loan record not found');
    }

    if (existingLoan.status === 'Returned') {
      return sendResponse(res, 400, false, 'This loan has already been returned');
    }

    const returnDate = getTodayCalendarUTC();
    const fine = calculateFine(existingLoan.dueDate, returnDate);

    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: loanId, status: 'Issued' },
      {
        $set: {
          status: 'Returned',
          returnDate,
          fine,
        },
      },
      { new: true }
    ).lean();

    if (!updatedLoan) {
      return sendResponse(res, 400, false, 'This loan has already been returned');
    }

    const book = await Book.findById(existingLoan.book);
    let updatedBook = null;
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      updatedBook = await book.save();
    }

    return sendResponse(res, 200, true, 'Book returned successfully', {
      loan: {
        ...updatedLoan,
        isOverdue: false,
      },
      book: updatedBook,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/books/:id/loans
 * Lists all loans for a specific book with computed isOverdue flag.
 */
async function getBookLoans(req, res, next) {
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

    return sendResponse(res, 200, true, 'Loan history fetched successfully', {
      book,
      loans,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  issueBook,
  returnBook,
  getBookLoans,
};
