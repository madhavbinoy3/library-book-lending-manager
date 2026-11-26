import { BookOpen, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar({ onOpenAddBook }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition group-hover:bg-indigo-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              LibraLedger
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Library Book Lending Manager
            </p>
          </div>
        </Link>

        {onOpenAddBook && (
          <button
            type="button"
            onClick={onOpenAddBook}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Book</span>
          </button>
        )}
      </div>
    </header>
  );
}
