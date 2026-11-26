import { AlertTriangle, BookCopy, BookMarked, IndianRupee, Library } from 'lucide-react';

export default function StatsBar({ stats, loading }) {
  const cards = [
    {
      label: 'Collection',
      value: loading ? '...' : `${stats.totalTitles} Titles`,
      subtext: loading ? 'Loading...' : `${stats.totalCopies} Total Copies`,
      icon: Library,
      iconBg: 'bg-indigo-50 text-indigo-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Total Copies',
      value: loading ? '...' : stats.totalCopies,
      subtext: loading ? 'Loading...' : `${Math.max(0, stats.totalCopies - stats.copiesIssued)} Available`,
      icon: BookCopy,
      iconBg: 'bg-sky-50 text-sky-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Currently Issued',
      value: loading ? '...' : stats.copiesIssued,
      subtext: 'Active member loans',
      icon: BookMarked,
      iconBg: 'bg-amber-50 text-amber-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Overdue Loans',
      value: loading ? '...' : stats.overdueLoans,
      subtext: stats.overdueLoans > 0 ? 'Past 14-day due date' : 'All loans on schedule',
      icon: AlertTriangle,
      iconBg: stats.overdueLoans > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
      valueColor: stats.overdueLoans > 0 ? 'text-red-600' : 'text-slate-900',
    },
    {
      label: 'Total Fine Collected',
      value: loading ? '...' : `₹${stats.totalFineCollected}`,
      subtext: 'From returned loans (₹5/day)',
      icon: IndianRupee,
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueColor: 'text-emerald-700',
    },
  ];

  return (
    <section aria-label="Library statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <p className={`mt-1.5 text-2xl font-bold tracking-tight ${card.valueColor}`}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 truncate">{card.subtext}</p>
            </div>
            <div className={`rounded-lg p-2.5 ${card.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </section>
  );
}
