import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  BookUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { BOOK_CATEGORIES, CATEGORY_BADGE_STYLES } from '../utils/constants';
import EditBookModal from '../components/EditBookModal';
import IssueBookModal from '../components/IssueBookModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function DashboardPage({
  refreshSignal,
  bookAddedSignal,
  onMutationSuccess,
  onOpenAddBook,
  showToast,
}) {
  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingBook, setEditingBook] = useState(null);
  const [issuingBook, setIssuingBook] = useState(null);
  const [deletingBook, setDeletingBook] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getBooks({
        page,
        limit: 5,
        category,
        availableOnly,
        search: debouncedSearch,
      });
      const data = response.data;
      setBooks(data.books || []);
      setTotalBooks(data.totalBooks || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [page, category, availableOnly, debouncedSearch]);

  useEffect(() => {
    if (bookAddedSignal > 0) {
      setPage(1);
    }
  }, [bookAddedSignal]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks, refreshSignal]);

  const handleCategoryChange = (value) => {
    setCategory(value);
    setPage(1);
  };

  const handleAvailableOnlyChange = (checked) => {
    setAvailableOnly(checked);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCategory('All');
    setAvailableOnly(false);
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBook) return;
    setIsDeleting(true);
    try {
      const response = await api.deleteBook(deletingBook._id);
      showToast(response.message || 'Book deleted successfully', 'success');
      setDeletingBook(null);
      if (books.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchBooks();
      }
      onMutationSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to delete book', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(searchInput.trim() || category !== 'All' || availableOnly);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by book title or author..."
              aria-label="Search books by title or author"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              aria-label="Filter by category"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="All">All Categories</option>
              {BOOK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => handleAvailableOnlyChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Available only</span>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Book Catalog */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Book Catalog</h2>
            <p className="text-xs text-slate-500">
              {totalBooks} {totalBooks === 1 ? 'book' : 'books'} found
            </p>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchBooks}
              className="mt-3 rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="divide-y divide-slate-100 p-5">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex animate-pulse items-center justify-between py-4">
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-slate-200" />
                  <div className="h-3 w-32 rounded bg-slate-100" />
                </div>
                <div className="h-8 w-28 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {hasActiveFilters ? 'No matching books found' : 'No books in the library yet'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first book to the catalog.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddBook}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add First Book
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Book Code</th>
                    <th className="px-5 py-3.5">Title &amp; ISBN</th>
                    <th className="px-5 py-3.5">Author</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Available / Total</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {books.map((book) => {
                    const hasIssuedCopies = book.availableCopies < book.totalCopies;
                    const noCopiesAvailable = book.availableCopies === 0;
                    const categoryStyle =
                      CATEGORY_BADGE_STYLES[book.category] || CATEGORY_BADGE_STYLES.Other;

                    return (
                      <tr key={book._id} className="transition hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800">
                            {book.bookCode}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            to={`/books/${book._id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline"
                          >
                            {book.title}
                          </Link>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            ISBN: {book.isbn}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{book.author}</td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryStyle}`}
                          >
                            {book.category}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              noCopiesAvailable
                                ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                            }`}
                          >
                            {book.availableCopies} / {book.totalCopies}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              to={`/books/${book._id}`}
                              title="View details and loan history"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Loans</span>
                            </Link>

                            <button
                              type="button"
                              disabled={noCopiesAvailable}
                              onClick={() => setIssuingBook(book)}
                              title={
                                noCopiesAvailable
                                  ? 'No copies available to issue'
                                  : 'Issue a copy to a member'
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                            >
                              <BookUp className="h-3.5 w-3.5" />
                              <span>Issue</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingBook(book)}
                              title="Edit book"
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={hasIssuedCopies}
                              onClick={() => setDeletingBook(book)}
                              title={
                                hasIssuedCopies
                                  ? 'Cannot delete: book has unreturned copies'
                                  : 'Delete book'
                              }
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:border-slate-200 disabled:hover:bg-white cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-slate-200 md:hidden">
              {books.map((book) => {
                const hasIssuedCopies = book.availableCopies < book.totalCopies;
                const noCopiesAvailable = book.availableCopies === 0;
                const categoryStyle =
                  CATEGORY_BADGE_STYLES[book.category] || CATEGORY_BADGE_STYLES.Other;

                return (
                  <div key={book._id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                            {book.bookCode}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryStyle}`}
                          >
                            {book.category}
                          </span>
                        </div>
                        <Link
                          to={`/books/${book._id}`}
                          className="mt-1.5 block text-base font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {book.title}
                        </Link>
                        <p className="text-xs text-slate-600">by {book.author}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">
                          ISBN: {book.isbn}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          noCopiesAvailable
                            ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        }`}
                      >
                        {book.availableCopies} / {book.totalCopies}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        to={`/books/${book._id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Loans
                      </Link>
                      <button
                        type="button"
                        disabled={noCopiesAvailable}
                        onClick={() => setIssuingBook(book)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                      >
                        <BookUp className="h-3.5 w-3.5" />
                        Issue
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBook(book)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={hasIssuedCopies}
                        onClick={() => setDeletingBook(book)}
                        title={
                          hasIssuedCopies
                            ? 'Cannot delete: book has unreturned copies'
                            : 'Delete book'
                        }
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3.5 sm:flex-row">
              <p className="text-xs text-slate-600">
                Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
                <span className="font-semibold text-slate-900">{safeTotalPages}</span> ({totalBooks}{' '}
                total {totalBooks === 1 ? 'title' : 'titles'})
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                {Array.from({ length: safeTotalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      pageNum === page
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= safeTotalPages}
                  onClick={() => setPage((p) => Math.min(safeTotalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <EditBookModal
        isOpen={Boolean(editingBook)}
        book={editingBook}
        onClose={() => setEditingBook(null)}
        onSuccess={(_, message) => {
          showToast(message || 'Book updated successfully', 'success');
          fetchBooks();
          onMutationSuccess();
        }}
      />

      <IssueBookModal
        isOpen={Boolean(issuingBook)}
        book={issuingBook}
        onClose={() => setIssuingBook(null)}
        onSuccess={(_, message) => {
          showToast(message || 'Book issued successfully', 'success');
          fetchBooks();
          onMutationSuccess();
        }}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deletingBook)}
        book={deletingBook}
        deleting={isDeleting}
        onClose={() => setDeletingBook(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
