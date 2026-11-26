import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookUp,
  History,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { api } from '../api/client';
import { CATEGORY_BADGE_STYLES, formatDisplayDate } from '../utils/constants';
import EditBookModal from '../components/EditBookModal';
import IssueBookModal from '../components/IssueBookModal';

export default function BookDetailsPage({ onMutationSuccess, showToast }) {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [returningLoanId, setReturningLoanId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  const fetchBookDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getBookById(id);
      setBook(response.data.book);
      setLoans(response.data.loans || []);
    } catch (err) {
      setError(err.message || 'Failed to load book details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  const handleReturnLoan = async (loanId) => {
    setReturningLoanId(loanId);
    try {
      const response = await api.returnLoan(loanId);
      const fine = response.data?.loan?.fine ?? 0;
      const msg =
        fine > 0
          ? `Book returned! Late fine calculated: ₹${fine}`
          : 'Book returned on time (Fine: ₹0)';
      showToast(msg, 'success');
      await fetchBookDetails();
      onMutationSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to return book', 'error');
    } finally {
      setReturningLoanId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-red-600">{error || 'Book not found'}</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Link>
      </div>
    );
  }

  const noCopiesAvailable = book.availableCopies === 0;
  const categoryStyle = CATEGORY_BADGE_STYLES[book.category] || CATEGORY_BADGE_STYLES.Other;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Book Catalog
        </Link>
      </div>

      {/* Book Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800">
                {book.bookCode}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryStyle}`}
              >
                {book.category}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  noCopiesAvailable
                    ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                }`}
              >
                {book.availableCopies} / {book.totalCopies} Available
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{book.title}</h2>
            <p className="text-sm text-slate-600">
              Author: <span className="font-medium text-slate-800">{book.author}</span> • ISBN:{' '}
              <span className="font-mono text-slate-800">{book.isbn}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={noCopiesAvailable}
              onClick={() => setIsIssueOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <BookUp className="h-4 w-4" />
              Issue Copy
            </button>
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              Edit Book
            </button>
          </div>
        </div>
      </div>

      {/* Loan History */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">Loan History</h3>
              <p className="text-xs text-slate-500">
                {loans.length} {loans.length === 1 ? 'loan record' : 'loan records'}
              </p>
            </div>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No loan history yet</p>
            <p className="mt-1 text-xs text-slate-500">
              When copies of this book are issued to members, they will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Member Name</th>
                    <th className="px-5 py-3.5">Member ID</th>
                    <th className="px-5 py-3.5">Issue Date</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Return Date</th>
                    <th className="px-5 py-3.5">Fine</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loans.map((loan) => (
                    <tr key={loan._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-medium text-slate-900">{loan.memberName}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-700">
                        {loan.memberId}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatDisplayDate(loan.issueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatDisplayDate(loan.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDisplayDate(loan.returnDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                        ₹{loan.fine ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                              loan.status === 'Returned'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : 'bg-sky-50 text-sky-700 ring-sky-600/20'
                            }`}
                          >
                            {loan.status}
                          </span>
                          {loan.isOverdue && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/25">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {loan.status === 'Issued' ? (
                          <button
                            type="button"
                            disabled={returningLoanId === loan._id}
                            onClick={() => handleReturnLoan(loan._id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {returningLoanId === loan._id ? 'Returning...' : 'Return'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-slate-200 md:hidden">
              {loans.map((loan) => (
                <div key={loan._id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{loan.memberName}</p>
                      <p className="font-mono text-xs text-slate-500">ID: {loan.memberId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          loan.status === 'Returned'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-sky-50 text-sky-700 ring-sky-600/20'
                        }`}
                      >
                        {loan.status}
                      </span>
                      {loan.isOverdue && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/25">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Issue Date:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {formatDisplayDate(loan.issueDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Due Date:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {formatDisplayDate(loan.dueDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Return Date:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {formatDisplayDate(loan.returnDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Fine:</span>{' '}
                      <span className="font-semibold text-slate-900">₹{loan.fine ?? 0}</span>
                    </div>
                  </div>

                  {loan.status === 'Issued' && (
                    <button
                      type="button"
                      disabled={returningLoanId === loan._id}
                      onClick={() => handleReturnLoan(loan._id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {returningLoanId === loan._id ? 'Returning...' : 'Return Book'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <EditBookModal
        isOpen={isEditOpen}
        book={book}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(_, message) => {
          showToast(message || 'Book updated successfully', 'success');
          fetchBookDetails();
          onMutationSuccess();
        }}
      />

      <IssueBookModal
        isOpen={isIssueOpen}
        book={book}
        onClose={() => setIsIssueOpen(false)}
        onSuccess={(_, message) => {
          showToast(message || 'Book issued successfully', 'success');
          fetchBookDetails();
          onMutationSuccess();
        }}
      />
    </div>
  );
}
