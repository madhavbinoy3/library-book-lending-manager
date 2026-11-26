import { useState, useEffect } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api/client';

export default function EditBookModal({ isOpen, book, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalCopies, setTotalCopies] = useState('1');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const issuedCopies = book ? book.totalCopies - book.availableCopies : 0;

  useEffect(() => {
    if (isOpen && book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setTotalCopies(String(book.totalCopies ?? 1));
      setFieldErrors({});
      setServerError('');
      setSubmitting(false);
    }
  }, [isOpen, book]);

  if (!book) return null;

  const validate = () => {
    const errors = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!author.trim()) errors.author = 'Author is required';

    const copies = Number(totalCopies);
    if (!Number.isInteger(copies) || copies < 1 || copies > 20) {
      errors.totalCopies = 'Total copies must be a whole number between 1 and 20';
    } else if (copies < issuedCopies) {
      errors.totalCopies = `Total copies cannot be less than currently issued copies (${issuedCopies})`;
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
      const response = await api.updateBook(book._id, {
        title: title.trim(),
        author: author.trim(),
        totalCopies: Number(totalCopies),
      });
      onSuccess(response.data, response.message);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Failed to update book');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Book"
      subtitle="Book Code, ISBN, and Category are locked and cannot be modified."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:grid-cols-3">
          <div>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Lock className="h-3 w-3" /> Book Code
            </span>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{book.bookCode}</p>
          </div>
          <div>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Lock className="h-3 w-3" /> ISBN
            </span>
            <p className="mt-0.5 font-mono text-sm text-slate-800">{book.isbn}</p>
          </div>
          <div>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Lock className="h-3 w-3" /> Category
            </span>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{book.category}</p>
          </div>
        </div>

        <div>
          <label htmlFor="edit-title" className="block text-sm font-medium text-slate-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldErrors((prev) => ({ ...prev, title: '' }));
            }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 ${
              fieldErrors.title
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
          />
          {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
        </div>

        <div>
          <label htmlFor="edit-author" className="block text-sm font-medium text-slate-700">
            Author <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-author"
            type="text"
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              setFieldErrors((prev) => ({ ...prev, author: '' }));
            }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 ${
              fieldErrors.author
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
          />
          {fieldErrors.author && <p className="mt-1 text-xs text-red-600">{fieldErrors.author}</p>}
        </div>

        <div>
          <label htmlFor="edit-copies" className="block text-sm font-medium text-slate-700">
            Total Copies <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-copies"
            type="number"
            min={Math.max(1, issuedCopies)}
            max={20}
            step={1}
            value={totalCopies}
            onChange={(e) => {
              setTotalCopies(e.target.value);
              setFieldErrors((prev) => ({ ...prev, totalCopies: '' }));
            }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 ${
              fieldErrors.totalCopies
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
          />
          {fieldErrors.totalCopies ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.totalCopies}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Currently issued: {issuedCopies} copy/copies • Range: {Math.max(1, issuedCopies)}–20
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
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
