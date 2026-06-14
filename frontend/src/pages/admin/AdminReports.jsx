import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  BarChart2, Search, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown,
} from 'lucide-react';
import {
  ADMIN_REPORTS,
  REPORT_CATEGORIES,
  getAllReportLastViewed,
} from '../../data/adminReports';

const PAGE_SIZE = 50;
const CREATED_BY = 'The Boutique Line';

function formatLastViewed(iso, ar) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(ar ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminReports() {
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [page, setPage] = useState(1);
  const [sortLastViewed, setSortLastViewed] = useState(null);

  const lastViewedMap = useMemo(() => getAllReportLastViewed(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = ADMIN_REPORTS.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (category && r.category !== category) return false;
      if (createdBy && createdBy !== CREATED_BY) return false;
      return true;
    });

    if (sortLastViewed) {
      rows = [...rows].sort((a, b) => {
        const ta = lastViewedMap[a.slug] ? new Date(lastViewedMap[a.slug]).getTime() : 0;
        const tb = lastViewedMap[b.slug] ? new Date(lastViewedMap[b.slug]).getTime() : 0;
        return sortLastViewed === 'asc' ? ta - tb : tb - ta;
      });
    }

    return rows;
  }, [search, category, createdBy, sortLastViewed, lastViewedMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const toggleLastViewedSort = () => {
    setSortLastViewed((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  };

  return (
    <div className="-m-6 min-h-full bg-[#f6f6f7]" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white border-b border-[#e3e3e3]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart2 size={20} className="text-[#303030] flex-shrink-0" strokeWidth={1.75} />
            <h1 className="text-[1.25rem] font-semibold text-[#303030] tracking-tight truncate">
              {ar ? 'التقارير' : 'Reports'}
            </h1>
          </div>
          <Link
            to="/admin/analytics"
            className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#303030] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            {ar ? 'استكشاف جديد' : 'New exploration'}
          </Link>
        </div>

        {/* Search + filters */}
        <div className="px-5 sm:px-6 pb-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={ar ? 'بحث في التقارير' : 'Search reports'}
              className="w-full h-9 ps-9 pe-10 text-sm border border-[#c9cccf] rounded-lg bg-white text-[#303030] placeholder:text-[#8a8a8a] focus:outline-none focus:border-[#005bd3] focus:ring-1 focus:ring-[#005bd3]"
            />
            <button
              type="button"
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-[#8a8a8a] hover:text-[#303030]"
              aria-label={ar ? 'ترتيب' : 'Sort'}
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={createdBy}
                onChange={(e) => { setCreatedBy(e.target.value); setPage(1); }}
                className="appearance-none h-8 pl-3 pr-8 text-sm border border-[#c9cccf] rounded-lg bg-white text-[#303030] cursor-pointer hover:bg-[#f6f6f7] focus:outline-none focus:border-[#005bd3]"
              >
                <option value="">{ar ? 'أنشئ بواسطة' : 'Created by'}</option>
                <option value={CREATED_BY}>{CREATED_BY}</option>
              </select>
              <ChevronDown size={14} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="appearance-none h-8 pl-3 pr-8 text-sm border border-[#c9cccf] rounded-lg bg-white text-[#303030] cursor-pointer hover:bg-[#f6f6f7] focus:outline-none focus:border-[#005bd3]"
              >
                <option value="">{ar ? 'الفئة' : 'Category'}</option>
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#8a8a8a] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e3e3e3]">
              <th className="text-start font-medium text-[#616161] px-5 sm:px-6 py-3 w-[38%]">
                {ar ? 'الاسم' : 'Name'}
              </th>
              <th className="text-start font-medium text-[#616161] px-4 py-3 w-[18%]">
                {ar ? 'الفئة' : 'Category'}
              </th>
              <th className="text-start font-medium text-[#616161] px-4 py-3 w-[22%]">
                <button
                  type="button"
                  onClick={toggleLastViewedSort}
                  className="inline-flex items-center gap-1 hover:text-[#303030] transition-colors"
                >
                  {ar ? 'آخر مشاهدة' : 'Last viewed'}
                  <ArrowUpDown size={14} className={sortLastViewed ? 'text-[#303030]' : 'text-[#8a8a8a]'} />
                </button>
              </th>
              <th className="text-start font-medium text-[#616161] px-5 sm:px-6 py-3 w-[22%]">
                {ar ? 'أنشئ بواسطة' : 'Created by'}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((report) => {
              const lastViewed = lastViewedMap[report.slug];
              return (
                <tr
                  key={report.slug}
                  className="border-b border-[#ebebeb] hover:bg-[#f6f6f7] transition-colors"
                >
                  <td className="px-5 sm:px-6 py-3.5">
                    <Link
                      to={report.liveView ? '/admin/analytics/live' : `/admin/analytics/reports/${report.slug}`}
                      className="text-[#303030] hover:text-[#005bd3] hover:underline font-normal"
                    >
                      {report.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[#616161]">{report.category}</td>
                  <td className="px-4 py-3.5 text-[#616161] whitespace-nowrap">
                    {formatLastViewed(lastViewed, ar)}
                  </td>
                  <td className="px-5 sm:px-6 py-3.5">
                    <div className="flex items-center gap-2 text-[#303030]">
                      <img
                        src="/logo-circle.png"
                        alt=""
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                      <span>{CREATED_BY}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!pageRows.length && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-[#8a8a8a]">
                  {ar ? 'لا توجد تقارير مطابقة' : 'No matching reports'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t border-[#e3e3e3] px-5 sm:px-6 py-3 flex items-center gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="p-1.5 rounded-md border border-[#c9cccf] text-[#303030] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f6f6f7]"
          aria-label={ar ? 'السابق' : 'Previous'}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="p-1.5 rounded-md border border-[#c9cccf] text-[#303030] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f6f6f7]"
          aria-label={ar ? 'التالي' : 'Next'}
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-sm text-[#616161] ms-1">
          {filtered.length ? `${rangeStart}-${rangeEnd}` : '0'}
        </span>
      </div>
    </div>
  );
}
