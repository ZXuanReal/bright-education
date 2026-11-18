import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileX2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import type { DocumentItem } from '../../types';
import { FileFormatBadge, FileTypeIcon } from './FileTypeIcon';

type DocumentPageResponse = {
  content: DocumentItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type TypeFilter = 'ALL' | 'PDF' | 'WORD' | 'VIDEO' | 'OTHER';
type SortMode = 'newest' | 'name';

const videoExts = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ogv', 'mpeg', 'mpg', 'ts', 'm2ts',
]);

function isVideoDoc(doc: DocumentItem): boolean {
  if (doc.mimeType?.toLowerCase().startsWith('video/')) return true;
  return Boolean(doc.extension && videoExts.has(doc.extension.toLowerCase()));
}

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getUploaderInitials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function getErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || fallback;
}

export function RecentUploadsTable() {
  const { user } = useAuth();
  const canUpload = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDocxHtml, setPreviewDocxHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const showToast = (kind: 'success' | 'error', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 3200);
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, size: pageSize };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const { data } = await api.get<DocumentPageResponse>('/documents', { params });
      setDocuments(data.content ?? []);
      setTotalElements(data.totalElements ?? data.content?.length ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load recent uploads.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDocuments();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [fetchDocuments]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (openMenuId === null) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId]);

  const visibleDocuments = useMemo(() => {
    const filtered = documents.filter((doc) => {
      if (typeFilter === 'ALL') return true;
      const ext = (doc.extension || '').toLowerCase();
      if (typeFilter === 'PDF') return ext === 'pdf';
      if (typeFilter === 'WORD') return ext === 'doc' || ext === 'docx';
      if (typeFilter === 'VIDEO') return isVideoDoc(doc);
      return ext !== 'pdf' && ext !== 'doc' && ext !== 'docx' && !isVideoDoc(doc);
    });

    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    return [...filtered].sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return tb - ta;
    });
  }, [documents, typeFilter, sortMode]);

  const handleDownload = async (doc: DocumentItem) => {
    setOpenMenuId(null);
    try {
      const response = await api.get<Blob>(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = doc.fileName || doc.title;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      showToast('success', `Downloading ${doc.fileName || doc.title}`);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not download this file.'));
    }
  };

  const handlePreview = async (doc: DocumentItem) => {
    setOpenMenuId(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setPreviewDocxHtml('');
    setPreviewDoc(doc);

    const ext = (doc.extension || '').toLowerCase();
    const isPdf = ext === 'pdf' || doc.mimeType?.toLowerCase() === 'application/pdf';
    const isDocx = ext === 'docx';
    const isTxt = ext === 'txt' || doc.mimeType?.toLowerCase() === 'text/plain';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || Boolean(doc.mimeType?.toLowerCase().startsWith('image/'));
    const isVideo = isVideoDoc(doc);

    if (!isPdf && !isDocx && !isTxt && !isImage && !isVideo) {
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    try {
      if (isDocx) {
        const response = await api.get<string>(`/documents/${doc.id}/preview-docx`, { responseType: 'text' });
        setPreviewDocxHtml(response.data);
      } else {
        const response = await api.get<Blob>(`/documents/${doc.id}/preview`, { responseType: 'blob' });
        const forcedMime = isPdf
          ? 'application/pdf'
          : isTxt
            ? 'text/plain;charset=utf-8'
            : response.data.type || doc.mimeType || 'video/mp4';
        setPreviewUrl(URL.createObjectURL(new Blob([response.data], { type: forcedMime })));
      }
    } catch (err) {
      setPreviewDoc(null);
      showToast('error', getErrorMessage(err, 'Could not preview this file.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyLink = async (doc: DocumentItem) => {
    setOpenMenuId(null);
    const link = `${window.location.origin}/documents?search=${encodeURIComponent(doc.fileName || doc.title)}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('success', 'Document link copied to clipboard.');
    } catch {
      showToast('error', 'Could not copy link to clipboard.');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewDocxHtml('');
    setPreviewDoc(null);
  };

  return (
    <section
      aria-label="Recent uploads"
      className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            Recent Uploads
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            Monitor the latest documents and files uploaded to the platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canUpload && (
            <Link
              to="/documents?upload=1"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#635bdb] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-[#5146c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb] focus-visible:ring-offset-2"
            >
              <Upload size={14} />
              Upload File
            </Link>
          )}
          <Link
            to="/documents"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--color-text-primary)] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
          >
            View All
            <ExternalLink size={13} className="text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#f7f8fc]/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setPage(0);
              setSearchTerm(event.target.value);
            }}
            placeholder="Filter by filename..."
            aria-label="Filter recent uploads by filename"
            className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-8 text-[13px] text-[var(--color-text-primary)] placeholder:text-slate-400 focus:border-[#635bdb] focus:outline-none focus:ring-2 focus:ring-[#635bdb]/15"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setPage(0);
                setSearchTerm('');
              }}
              aria-label="Clear filename filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by file type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-[13px] font-medium text-slate-700 focus:border-[#635bdb] focus:outline-none"
          >
            <option value="ALL">All types</option>
            <option value="PDF">PDF</option>
            <option value="WORD">Word (DOC/DOCX)</option>
            <option value="VIDEO">Videos</option>
            <option value="OTHER">Other files</option>
          </select>

          <button
            type="button"
            onClick={() => setSortMode((prev) => (prev === 'newest' ? 'name' : 'newest'))}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowUpDown size={13} className="text-slate-400" />
            {sortMode === 'newest' ? 'Newest first' : 'Name A–Z'}
          </button>

          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => {
              setPage(0);
              setPageSize(Number(event.target.value));
            }}
            className="h-9 rounded-xl border border-[var(--color-border)] bg-white px-2.5 text-[13px] font-medium text-slate-700 focus:border-[#635bdb] focus:outline-none"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </div>
      </div>

      {/* Inline Toast */}
      {toast && (
        <div
          role="status"
          className={`mx-5 mt-3 flex items-center justify-between rounded-xl border px-3.5 py-2 text-xs font-medium ${
            toast.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.kind === 'success' && <Check size={14} />}
            {toast.text}
          </span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss message">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchDocuments()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block" ref={menuContainerRef}>
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[#f7f8fc]/40 text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              <th scope="col" className="px-5 py-3.5">File Name</th>
              <th scope="col" className="px-4 py-3.5">Type</th>
              <th scope="col" className="px-4 py-3.5">Uploaded By</th>
              <th scope="col" className="px-4 py-3.5">Date</th>
              <th scope="col" className="px-4 py-3.5">Size</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13.5px]">
            {loading &&
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
                      <div className="space-y-1.5">
                        <div className="skeleton-shimmer h-4 w-44 rounded" />
                        <div className="skeleton-shimmer h-3 w-28 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><div className="skeleton-shimmer h-5 w-12 rounded-md" /></td>
                  <td className="px-4 py-3.5"><div className="skeleton-shimmer h-4 w-28 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="skeleton-shimmer h-4 w-24 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="skeleton-shimmer h-4 w-16 rounded" /></td>
                  <td className="px-4 py-3.5"><div className="skeleton-shimmer h-5 w-16 rounded-full" /></td>
                  <td className="px-5 py-3.5 text-right"><div className="skeleton-shimmer ml-auto h-7 w-20 rounded-lg" /></td>
                </tr>
              ))}

            {!loading &&
              visibleDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className="group transition-colors hover:bg-[#f7f8fc]/80"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileTypeIcon extension={doc.extension} mimeType={doc.mimeType} />
                      <div className="min-w-0">
                        <div className="max-w-[260px] truncate font-semibold text-[var(--color-text-primary)] lg:max-w-[340px]">
                          {doc.title}
                        </div>
                        <div className="max-w-[260px] truncate text-xs text-[var(--color-text-secondary)] lg:max-w-[340px]">
                          {doc.fileName || doc.description || 'Portal document'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <FileFormatBadge extension={doc.extension} mimeType={doc.mimeType} />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                        {getUploaderInitials(doc.uploadedByName)}
                      </span>
                      <span className="max-w-[140px] truncate text-[13px] text-slate-700">
                        {doc.uploadedByName || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-[13px] font-medium text-slate-700">{formatDate(doc.uploadedAt)}</div>
                    <div className="text-[11px] text-slate-400">{formatRelativeTime(doc.uploadedAt)}</div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-slate-600 tabular-nums">
                    {formatFileSize(doc.sizeInBytes)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16a477]" />
                      {doc.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <div className="relative inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void handlePreview(doc)}
                        title="Preview"
                        aria-label={`Preview ${doc.title}`}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#f0efff] hover:text-[#635bdb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(doc)}
                        title="Download"
                        aria-label={`Download ${doc.title}`}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((curr) => (curr === doc.id ? null : doc.id))}
                        title="More options"
                        aria-label={`More actions for ${doc.title}`}
                        aria-expanded={openMenuId === doc.id}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bdb]"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {openMenuId === doc.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-[var(--color-border)] bg-white p-1 text-left shadow-[var(--shadow-dropdown)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void handlePreview(doc)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Eye size={14} className="text-slate-400" />
                            Preview file
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void handleDownload(doc)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Download size={14} className="text-slate-400" />
                            Download file
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void handleCopyLink(doc)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Copy size={14} className="text-slate-400" />
                            Copy link
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="divide-y divide-slate-100 md:hidden">
        {loading &&
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={`m-skel-${idx}`} className="flex items-center gap-3 p-4">
              <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}

        {!loading &&
          visibleDocuments.map((doc) => (
            <div key={`mobile-${doc.id}`} className="flex items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <FileTypeIcon extension={doc.extension} mimeType={doc.mimeType} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{doc.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <FileFormatBadge extension={doc.extension} mimeType={doc.mimeType} />
                    <span>·</span>
                    <span>{formatFileSize(doc.sizeInBytes)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(doc.uploadedAt)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Uploaded by {doc.uploadedByName || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handlePreview(doc)}
                  aria-label={`Preview ${doc.title}`}
                  className="rounded-lg border border-[var(--color-border)] p-2 text-slate-600 hover:bg-slate-50"
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(doc)}
                  aria-label={`Download ${doc.title}`}
                  className="rounded-lg border border-[var(--color-border)] p-2 text-slate-600 hover:bg-slate-50"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Empty State */}
      {!loading && !error && visibleDocuments.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FileX2 size={22} />
          </div>
          <h4 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
            No matching documents found
          </h4>
          <p className="mt-1 max-w-sm text-xs text-[var(--color-text-secondary)]">
            {searchTerm || typeFilter !== 'ALL'
              ? 'Try clearing your search or changing the file type filter.'
              : 'Documents and lesson videos uploaded to the portal will appear here.'}
          </p>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && totalElements > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3.5 text-xs text-[var(--color-text-secondary)] sm:flex-row">
          <span>
            Showing <strong className="font-semibold text-slate-700">{visibleDocuments.length}</strong> of{' '}
            <strong className="font-semibold text-slate-700">{totalElements.toLocaleString()}</strong> documents
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="px-2 font-medium text-slate-600 tabular-nums">
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewDoc.title}`}
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-slate-800">{previewDoc.title}</h3>
                <p className="truncate text-xs text-slate-500">{previewDoc.fileName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(previewDoc)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#635bdb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5146c8]"
                >
                  <Download size={13} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Close preview"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 p-4">
              {previewLoading && (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  Loading preview...
                </div>
              )}
              {!previewLoading && previewDocxHtml && (
                <div
                  className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-800 shadow-xs"
                  dangerouslySetInnerHTML={{ __html: previewDocxHtml }}
                />
              )}
              {!previewLoading && previewUrl && isVideoDoc(previewDoc) && (
                <video src={previewUrl} controls autoPlay className="mx-auto max-h-[68vh] w-full rounded-xl bg-black" />
              )}
              {!previewLoading && previewUrl && !isVideoDoc(previewDoc) && (
                <iframe
                  title={previewDoc.title}
                  src={previewUrl}
                  className="h-[68vh] w-full rounded-xl border border-slate-200 bg-white"
                />
              )}
              {!previewLoading && !previewDocxHtml && !previewUrl && (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-sm text-slate-600">
                  <p>In-browser preview is available for PDF, DOCX, TXT, image, and video files.</p>
                  <button
                    type="button"
                    onClick={() => void handleDownload(previewDoc)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#635bdb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5146c8]"
                  >
                    <Download size={13} />
                    Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
