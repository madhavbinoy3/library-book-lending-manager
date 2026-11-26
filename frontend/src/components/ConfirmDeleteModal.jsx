import { Trash2 } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDeleteModal({ isOpen, book, deleting, onClose, onConfirm }) {
  if (!book) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Book">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/70 p-4">
          <div className="rounded-lg bg-red-100 p-2 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              Are you sure you want to delete{' '}
              <span className="font-semibold">"{book.title}"</span>?
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Code: <span className="font-mono font-medium">{book.bookCode}</span> • ISBN:{' '}
              <span className="font-mono">{book.isbn}</span>. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-60 cursor-pointer"
          >
            {deleting ? 'Deleting...' : 'Delete Book'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
