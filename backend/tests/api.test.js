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

  // Invalid ISBN length
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

  // Total copies out of range
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

test('REST API endpoints: status codes, JSON envelope, and business rules', async (t) => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  t.after(() => {
    server.close();
  });

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
  const healthBody = await healthRes.json();
  assert.equal(healthBody.success, true);

  // 2. Create Book - rejects invalid ISBN (400)
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
  const badBookBody = await badBookRes.json();
  assert.equal(badBookBody.success, false);

  // 3. Create Book - duplicate ISBN returns 409
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

  // 4. Create Book - auto-generates LB-TEC-004 ignoring client bookCode
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
  assert.equal(createBody.success, true);
  assert.equal(createBody.data.bookCode, 'LB-TEC-004');
  assert.equal(createBody.data.availableCopies, 5);

  // 5. Update Book - rejects reducing totalCopies below currently issued copies
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

  // 6. Delete Book - rejects when unreturned copies exist
  const delBlockedRes = await fetch(`${baseUrl}/books/${bookId}`, { method: 'DELETE' });
  assert.equal(delBlockedRes.status, 400);

  // 7. Issue Book - rejects future date
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

  // 8. Issue Book - rejects duplicate active loan for same memberId
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

  // 9. Return Book - rejects already returned loan
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
});
