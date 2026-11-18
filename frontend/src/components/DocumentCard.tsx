import { useEffect, useRef, useState } from 'react';
import { Download, Eye, Film, Play, Share2 } from 'lucide-react';
import api from '../services/api';
import type { DocumentItem } from '../types';

const fileColors: Record<string, string> = {
  pdf: 'bg-red-100 text-red-600',
  doc: 'bg-blue-100 text-blue-600',
  docx: 'bg-blue-100 text-blue-600',
  xlsx: 'bg-emerald-100 text-emerald-600',
  mp3: 'bg-amber-100 text-amber-600',
  mp4: 'bg-violet-100 text-violet-700',
  mov: 'bg-violet-100 text-violet-700',
  avi: 'bg-violet-100 text-violet-700',
  mkv: 'bg-violet-100 text-violet-700',
  webm: 'bg-violet-100 text-violet-700',
  default: 'bg-slate-100 text-slate-600',
};

const videoExtensions = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ogv', 'mpeg', 'mpg', 'ts', 'm2ts',
]);

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

type DocumentCardProps = {
  document: DocumentItem;
  onPreview: () => void;
  onDownload: () => void;
  onShare: () => void;
  canShare: boolean;
};

type CardPreviewState =
  | { kind: 'none' }
  | { kind: 'video'; url: string }
  | { kind: 'image'; url: string }
  | { kind: 'pdf'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'html'; html: string };

export function DocumentCard({ document, onPreview, onDownload, onShare, canShare }: DocumentCardProps) {
  const lowerExt = (document.extension || 'pdf').toLowerCase();
  const ext = lowerExt.toUpperCase();
  const isVideo = Boolean(document.mimeType?.toLowerCase().startsWith('video/')) || videoExtensions.has(lowerExt);
  const isImage = Boolean(document.mimeType?.toLowerCase().startsWith('image/')) || imageExtensions.has(lowerExt);
  const isPdf = lowerExt === 'pdf';
  const isTxt = lowerExt === 'txt';
  const isDocx = lowerExt === 'docx';
  const badgeClass = fileColors[lowerExt] || (isVideo ? 'bg-violet-100 text-violet-700' : fileColors.default);

  const coverRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [cardPreview, setCardPreview] = useState<CardPreviewState>({ kind: 'none' });

  const hasDirectThumb = Boolean(document.thumbnailUrl) && !thumbFailed;
  const canAutoPreview = isVideo || isImage || isPdf || isTxt || isDocx;

  useEffect(() => {
    setThumbFailed(false);
  }, [document.id, document.thumbnailUrl]);

  useEffect(() => {
    if (hasDirectThumb || !canAutoPreview || inView) return;
    const el = coverRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasDirectThumb, canAutoPreview, inView]);

  useEffect(() => {
    if (hasDirectThumb || !canAutoPreview || !inView) {
      return;
    }

    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    const loadPreview = async () => {
      try {
        if (isDocx) {
          const response = await api.get<string>(`/documents/${document.id}/preview-docx`, {
            params: { trackView: false },
            responseType: 'text',
          });
          if (!cancelled) {
            setCardPreview({ kind: 'html', html: response.data });
          }
          return;
        }

        if (isTxt) {
          const response = await api.get<string>(`/documents/${document.id}/preview`, {
            params: { trackView: false },
            responseType: 'text',
          });
          if (!cancelled) {
            const snippet = String(response.data || '').slice(0, 600);
            setCardPreview({ kind: 'text', text: snippet });
          }
          return;
        }

        const response = await api.get(`/documents/${document.id}/preview`, {
          params: { trackView: false },
          responseType: 'blob',
        });
        const rawType = response.headers['content-type'];
        const contentType = typeof rawType === 'string' ? rawType : (document.mimeType || 'application/octet-stream');
        const blob = new Blob([response.data], { type: contentType });
        const url = URL.createObjectURL(blob);
        objectUrlToRevoke = url;

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        if (isVideo) {
          setCardPreview({ kind: 'video', url });
        } else if (isImage) {
          setCardPreview({ kind: 'image', url });
        } else if (isPdf) {
          setCardPreview({ kind: 'pdf', url });
        }
      } catch {
        if (!cancelled) {
          setCardPreview({ kind: 'none' });
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [document.id, document.mimeType, hasDirectThumb, canAutoPreview, inView, isVideo, isImage, isPdf, isTxt, isDocx]);

  const showOverlayBadge = hasDirectThumb || cardPreview.kind !== 'none';

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-soft">
      <div
        ref={coverRef}
        onClick={onPreview}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview();
          }
        }}
        className="relative flex h-44 cursor-pointer items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-sky-50"
      >
        {hasDirectThumb ? (
          <img
            src={document.thumbnailUrl}
            alt={document.title}
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : cardPreview.kind === 'video' ? (
          <video
            src={`${cardPreview.url}#t=0.5`}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : cardPreview.kind === 'image' ? (
          <img
            src={cardPreview.url}
            alt={document.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : cardPreview.kind === 'pdf' ? (
          <div className="relative h-full w-full overflow-hidden bg-white">
            <iframe
              src={`${cardPreview.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              title={document.title}
              tabIndex={-1}
              className="pointer-events-none h-[260%] w-[260%] origin-top-left scale-[0.385] border-0 bg-white"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/15 to-transparent" />
          </div>
        ) : cardPreview.kind === 'text' ? (
          <div className="relative h-full w-full overflow-hidden bg-white p-3.5 text-left">
            <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-slate-600">
              {cardPreview.text || '(Empty file)'}
            </pre>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent" />
          </div>
        ) : cardPreview.kind === 'html' ? (
          <div className="relative h-full w-full overflow-hidden bg-white">
            <div
              className="pointer-events-none w-[238%] origin-top-left scale-[0.42] bg-white p-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: cardPreview.html }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent" />
          </div>
        ) : (
          <div className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold ${badgeClass}`}>
            {isVideo && <Film size={14} />}
            {ext}
          </div>
        )}

        {showOverlayBadge && isVideo && (
          <span className="pointer-events-none absolute flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-md backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-violet-600/90">
            <Play size={16} className="ml-0.5 fill-current" />
          </span>
        )}

        {showOverlayBadge && (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            {isVideo && <Film size={12} />}
            {ext}
          </span>
        )}

        {canShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            title="Manage access"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm hover:text-violet-700"
          >
            <Share2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-800">{document.title}</h3>
            <div className="mt-1 text-xs text-slate-500">
              {document.folderName || 'Root'} • {document.uploadedByName || 'Unknown uploader'}
            </div>
            {document.description && (
              <div className="mt-0.5 truncate text-xs text-violet-600">{document.description}</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{document.sizeInBytes ? `${(document.sizeInBytes / 1024 / 1024).toFixed(1)} MB` : '0 MB'}</span>
          <span>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : '—'}</span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Eye size={12} />
              {document.viewCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download size={12} />
              {document.downloadCount ?? 0}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPreview}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
