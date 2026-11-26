import { useState, useEffect } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api/client';
import { addDaysToDateString, getTodayInputDate } from '../utils/constants';

export default function IssueBookModal({ isOpen, book, onClose, onSuccess }) {
  const today = getTodayInputDate();
  const [memberName, setMemberName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMemberName('');
      setMemberId('');
      setIssueDate(getTodayInputDate());
      setFieldErrors({});
      setServerError('');
      setSubmitting(false);
    }
  }, [isOpen, book]);

  if (!book) return null;

  const dueDatePreview = addDaysToDateString(issueDate, 14);

  const validate = () => {
    const errors = {};
    if (!memberName.trim()) errors.memberName = 'Member name is required';
    if (!memberId.trim()) errors.memberId = 'Member ID is required';
    if (!issueDate) {
      errors.issueDate = 'Issue date is required';
    } else if (issueDate > getTodayInputDate()) {
      errors.issueDate = 'Issue date cannot be a future date';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await api.issueBook(book._id, {
        memberName: memberName.trim(),
        memberId: memberId.trim(),
        issueDate,
      });
      onSuccess(response.data, response.message);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Failed to issue book');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Book"
      subtitle={`${book.bookCode} — ${book.title} (${book.availableCopies} available)`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{serverError}</span>
          </div>
        )}

        <div>
          <label htmlFor="issue-member-name" className="block text-sm font-medium text-slate-700">
            Member Name <span className="text-red-500">*</span>
          </label>
          <input
            id="issue-member-name"
            type="text"
            value={memberName}
            onChange={(e) => {
              setMemberName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, memberName: '' }));
              setServerError('');
            }}
            placeholder="e.g. Aarav Sharma"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 ${
              fieldErrors.memberName
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
          />
          {fieldErrors.memberName && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.memberName}</p>
          )}
        </div>

        <div>
          <label htmlFor="issue-member-id" className="block text-sm font-medium text-slate-700">
            Member ID <span className="text-red-500">*</span>
          </label>
          <input
            id="issue-member-id"
            type="text"
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, memberId: '' }));
              setServerError('');
            }}
            placeholder="e.g. MEM-104"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 ${
              fieldErrors.memberId
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
          />
          {fieldErrors.memberId && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.memberId}</p>
          )}
        </div>

        <div>
          <label htmlFor="issue-date" className="block text-sm font-medium text-slate-700">
            Issue Date <span className="text-red-500">*</span>
          </label>
          <input
            id="issue-date"
            type="date"
            max={today}
            value={issueDate}
            onChange={(e) => {
              setIssueDate(e.target.value);
              setFieldErrors((prev) => ({ ...prev, issueDate: '' }));
              setServerError('');
            }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 ${
              fieldErrors.issueDate
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
          />
          {fieldErrors.issueDate ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.issueDate}</p>
          ) : (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                Automatic Due Date (14 days):{' '}
                <strong className="text-slate-700">{dueDatePreview || '—'}</strong>
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || book.availableCopies <= 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Issuing...' : 'Confirm Issue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
