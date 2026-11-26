const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../app');
const { Book } = require('../models/Book');
const Counter = require('../models/Counter');
const Loan = require('../models/Loan');
const {
  parseDateOnly,
  addDaysUTC,
  calculateFine,
  isLoanOverdue,
  getTodayDateString,
  getTodayCalendarUTC,
} = require('../utils/dateUtils');
const {
  validateCreateBookInput,
  validateUpdateBookInput,
  escapeRegex,
} = require('../utils/validators');

test('Date utilities: due date (+14 days), fine (Rs. 5/day), and overdue detection', () => {
  const issue = parseDateOnly('2026-11-01');
  const due = addDaysUTC(issue, 14);
  assert.equal(due.toISOString().slice(0, 10), '2026-11-15');

  assert.equal(parseDateOnly('2026-02-30'), null);

  // Returned on due date -> Rs. 0
  assert.equal(calculateFine(due, parseDateOnly('2026-11-15')), 0);
  // Returned early -> Rs. 0
  assert.equal(calculateFine(due, parseDateOnly('2026-11-10')), 0);
  // Returned 3 days late -> Rs. 15
  assert.equal(calculateFine(due, parseDateOnly('2026-11-18')), 15);

  const now = new Date('2026-11-16T10:00:00');
  assert.equal(
    isLoanOverdue({ status: 'Issued', dueDate: parseDateOnly('2026-11-15') }, now),
    true
  );
  assert.equal(
    isLoanOverdue({ status: 'Issued', dueDate: parseDateOnly('2026-11-16') }, now),
    false
  );
  assert.equal(
    isLoanOverdue({ status: 'Returned', dueDate: parseDateOnly('2026-11-15') }, now),
    false
  );
});

test('Validators: ISBN (10/13 digits), totalCopies (1..20), category, regex escaping', () => {
  assert.equal(
    validateCreateBookInput({
      title: 'Clean Code',
      author: 'Robert Martin',
      isbn: '9780132350884',
      category: 'Technology',
      totalCopies: 5,
    }).valid,
    true
  );

  assert.equal(
    validateCreateBookInput({
      title: 'Old Book',
      author: 'Someone',
      isbn: '0132350882',
      category: 'Fiction',
      totalCopies: 1,
    }).valid,
    true
  );

  assert.equal(
    validateCreateBookInput({
      title: 'Bad ISBN',
      author: 'Author',
      isbn: '12345678901',
      category: 'Fiction',
      totalCopies: 2,
    }).valid,
    false
  );

  assert.equal(
    validateCreateBookInput({
      title: 'Too Many',
      author: 'Author',
      isbn: '1234567890',
      category: 'Science',
      totalCopies: 21,
    }).valid,
    false
  );

  assert.equal(
    validateUpdateBookInput({ title: 'Updated', author: 'Author', totalCopies: 0 }).valid,
    false
  );

  assert.equal(escapeRegex('C++ (2nd)'), 'C\\+\\+ \\(2nd\\)');
});

test('REST API endpoints: books CRUD, issue/return, loan history, search/filters, stats', async (t) => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  t.after(() => {
    t.mock.restoreAll();
    server.close();
  });

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
  const healthBody = await healthRes.json();
  assert.equal(healthBody.success, true);

  // 2. GET /api/books with category, availableOnly, search, page=2, limit=5
  let capturedFilter = null;
  let capturedSkip = null;
  let capturedLimit = null;
  t.mock.method(Book, 'countDocuments', async (filter) => {
    capturedFilter = filter;
    return 7;
  });
  t.mock.method(Book, 'find', () => ({
    sort: () => ({
      skip: (s) => {
        capturedSkip = s;
        return {
          limit: (l) => {
            capturedLimit = l;
            return {
              lean: async () => [{ _id: '1', bookCode: 'LB-TEC-001', title: 'Clean Code' }],
            };
          },
        };
      },
    }),
  }));

  const listRes = await fetch(
    `${baseUrl}/books?category=Technology&availableOnly=true&search=Clean&page=2`
  );
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.equal(listBody.data.totalBooks, 7);
  assert.equal(listBody.data.totalPages, 2);
  assert.equal(listBody.data.currentPage, 2);
  assert.equal(listBody.data.limit, 5);
  assert.equal(capturedFilter.category, 'Technology');
  assert.deepEqual(capturedFilter.availableCopies, { $gt: 0 });
  assert.equal(Array.isArray(capturedFilter.$or), true);
  assert.equal(capturedSkip, 5);
  assert.equal(capturedLimit, 5);

  // 3. Create Book - rejects invalid ISBN (400)
  t.mock.restoreAll();
  const badBookRes = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test',
      author: 'Tester',
      isbn: '12345',
      category: 'Technology',
      totalCopies: 3,
    }),
  });
  assert.equal(badBookRes.status, 400);

  // 4. Create Book - duplicate ISBN returns 409
  t.mock.method(Book, 'findOne', () => ({
    lean: async () => ({ _id: new mongoose.Types.ObjectId(), isbn: '9780132350884' }),
  }));
  const dupRes = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Clean Code',
      author: 'Robert Martin',
      isbn: '9780132350884',
      category: 'Technology',
      totalCopies: 4,
    }),
  });
  assert.equal(dupRes.status, 409);

  // 5. Create Book - auto-generates LB-TEC-004 ignoring client bookCode
  t.mock.restoreAll();
  t.mock.method(Book, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Counter, 'findOneAndUpdate', async () => ({ _id: 'bookCode_Technology', seq: 4 }));
  t.mock.method(Book, 'create', async (doc) => ({
    _id: new mongoose.Types.ObjectId(),
    ...doc,
  }));

  const createRes = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookCode: 'HACK-999',
      title: 'Clean Code',
      author: 'Robert Martin',
      isbn: '9780132350884',
      category: 'Technology',
      totalCopies: 5,
      availableCopies: 1,
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.equal(createBody.data.bookCode, 'LB-TEC-004');
  assert.equal(createBody.data.availableCopies, 5);

  // 6. Update Book - rejects reducing totalCopies below currently issued copies & updates otherwise
  t.mock.restoreAll();
  const bookId = new mongoose.Types.ObjectId().toString();
  t.mock.method(Book, 'findById', async () => ({
    _id: bookId,
    bookCode: 'LB-TEC-004',
    isbn: '9780132350884',
    category: 'Technology',
    title: 'Clean Code',
    author: 'Robert Martin',
    totalCopies: 5,
    availableCopies: 2,
    save: async function () {
      return this;
    },
    deleteOne: async () => ({ deletedCount: 1 }),
  }));
  t.mock.method(Loan, 'countDocuments', async () => 3);

  const badUpdateRes = await fetch(`${baseUrl}/books/${bookId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Clean Code 2nd Ed',
      author: 'Robert Martin',
      totalCopies: 2,
    }),
  });
  assert.equal(badUpdateRes.status, 400);

  const okUpdateRes = await fetch(`${baseUrl}/books/${bookId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Clean Code 2nd Ed',
      author: 'Robert Martin',
      totalCopies: 6,
    }),
  });
  assert.equal(okUpdateRes.status, 200);
  const okUpdateBody = await okUpdateRes.json();
  assert.equal(okUpdateBody.data.availableCopies, 3);

  // 7. Delete Book - rejects when unreturned copies exist, succeeds when 0 issued
  const delBlockedRes = await fetch(`${baseUrl}/books/${bookId}`, { method: 'DELETE' });
  assert.equal(delBlockedRes.status, 400);

  t.mock.restoreAll();
  t.mock.method(Book, 'findById', async () => ({
    _id: bookId,
    totalCopies: 5,
    availableCopies: 5,
    deleteOne: async () => ({ deletedCount: 1 }),
  }));
  t.mock.method(Loan, 'countDocuments', async () => 0);
  t.mock.method(Loan, 'deleteMany', async () => ({ deletedCount: 1 }));
  const delOkRes = await fetch(`${baseUrl}/books/${bookId}`, { method: 'DELETE' });
  assert.equal(delOkRes.status, 200);

  // 8. Issue Book - rejects future date, rejects duplicate member, succeeds with +14d dueDate
  t.mock.restoreAll();
  const futureDate = addDaysUTC(parseDateOnly(getTodayDateString()), 2)
    .toISOString()
    .slice(0, 10);
  const futureIssueRes = await fetch(`${baseUrl}/books/${bookId}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberName: 'Alice',
      memberId: 'MEM-001',
      issueDate: futureDate,
    }),
  });
  assert.equal(futureIssueRes.status, 400);

  t.mock.method(Book, 'findById', async () => ({
    _id: bookId,
    totalCopies: 5,
    availableCopies: 2,
  }));
  t.mock.method(Loan, 'findOne', () => ({
    lean: async () => ({ _id: new mongoose.Types.ObjectId(), memberId: 'MEM-001' }),
  }));
  const dupLoanRes = await fetch(`${baseUrl}/books/${bookId}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberName: 'Alice',
      memberId: 'MEM-001',
      issueDate: getTodayDateString(),
    }),
  });
  assert.equal(dupLoanRes.status, 409);

  t.mock.restoreAll();
  const todayStr = getTodayDateString();
  const expectedDueStr = addDaysUTC(parseDateOnly(todayStr), 14).toISOString().slice(0, 10);
  t.mock.method(Book, 'findById', async () => ({
    _id: bookId,
    totalCopies: 5,
    availableCopies: 2,
  }));
  t.mock.method(Loan, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Book, 'findOneAndUpdate', async () => ({
    _id: bookId,
    totalCopies: 5,
    availableCopies: 1,
  }));
  t.mock.method(Loan, 'create', async (doc) => ({
    _id: new mongoose.Types.ObjectId(),
    ...doc,
    toObject() {
      return { ...this };
    },
  }));
  const issueOkRes = await fetch(`${baseUrl}/books/${bookId}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberName: 'Alice',
      memberId: 'MEM-001',
      issueDate: todayStr,
    }),
  });
  assert.equal(issueOkRes.status, 201);
  const issueOkBody = await issueOkRes.json();
  assert.equal(issueOkBody.data.loan.dueDate.slice(0, 10), expectedDueStr);
  assert.equal(issueOkBody.data.book.availableCopies, 1);

  // 9. Return Book - rejects already returned, and calculates Rs. 5/day fine when overdue
  t.mock.restoreAll();
  const loanId = new mongoose.Types.ObjectId().toString();
  t.mock.method(Loan, 'findById', async () => ({
    _id: loanId,
    status: 'Returned',
  }));
  const alreadyReturnedRes = await fetch(`${baseUrl}/loans/${loanId}/return`, {
    method: 'POST',
  });
  assert.equal(alreadyReturnedRes.status, 400);

  t.mock.restoreAll();
  const pastDueDate = addDaysUTC(getTodayCalendarUTC(), -4);
  t.mock.method(Loan, 'findById', async () => ({
    _id: loanId,
    book: bookId,
    dueDate: pastDueDate,
    status: 'Issued',
  }));
  t.mock.method(Loan, 'findOneAndUpdate', () => ({
    lean: async () => ({
      _id: loanId,
      book: bookId,
      dueDate: pastDueDate,
      returnDate: getTodayCalendarUTC(),
      fine: 20,
      status: 'Returned',
    }),
  }));
  t.mock.method(Book, 'findById', async () => ({
    _id: bookId,
    totalCopies: 5,
    availableCopies: 1,
    save: async function () {
      return this;
    },
  }));
  const returnOkRes = await fetch(`${baseUrl}/loans/${loanId}/return`, { method: 'POST' });
  assert.equal(returnOkRes.status, 200);
  const returnOkBody = await returnOkRes.json();
  assert.equal(returnOkBody.data.loan.fine, 20);
  assert.equal(returnOkBody.data.book.availableCopies, 2);

  // 10. GET /api/books/:id returns loan history with isOverdue computed
  t.mock.restoreAll();
  t.mock.method(Book, 'findById', () => ({
    lean: async () => ({ _id: bookId, bookCode: 'LB-TEC-004', title: 'Clean Code' }),
  }));
  t.mock.method(Loan, 'find', () => ({
    sort: () => ({
      lean: async () => [
        {
          _id: loanId,
          memberName: 'Bob',
          memberId: 'MEM-002',
          dueDate: addDaysUTC(getTodayCalendarUTC(), -2),
          status: 'Issued',
        },
      ],
    }),
  }));
  const detailsRes = await fetch(`${baseUrl}/books/${bookId}`);
  assert.equal(detailsRes.status, 200);
  const detailsBody = await detailsRes.json();
  assert.equal(detailsBody.data.loans[0].isOverdue, true);

  // 11. GET /api/stats returns aggregated metrics
  t.mock.restoreAll();
  t.mock.method(Book, 'aggregate', async () => [{ totalTitles: 4, totalCopies: 18 }]);
  t.mock.method(Loan, 'countDocuments', async (q) => (q.dueDate ? 1 : 3));
  t.mock.method(Loan, 'aggregate', async () => [{ totalFineCollected: 35 }]);
  const statsRes = await fetch(`${baseUrl}/stats`);
  assert.equal(statsRes.status, 200);
  const statsBody = await statsRes.json();
  assert.deepEqual(statsBody.data, {
    totalTitles: 4,
    totalCopies: 18,
    copiesIssued: 3,
    overdueLoans: 1,
    totalFineCollected: 35,
  });
});
