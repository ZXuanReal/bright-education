import { AlertCircle, CheckCircle2, Clock, Film, FileText, Trash2, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type UploadMode = 'video' | 'document';

export type UploadPayload = {
  file: File;
  mode: UploadMode;
  durationSeconds?: number;
  thumbnailDataUrl?: string;
  onProgress?: (percent: number) => void;
};

type UploadDocumentModalProps = {
  open: boolean;
  initialMode?: UploadMode;
  onClose: () => void;
  onUpload: (payload: UploadPayload) => Promise<void>;
};

const MAX_VIDEO_DURATION_SECONDS = 300; // Strict 5-minute (300s) limit
const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200MB matching backend multipart limit
const MAX_DOC_SIZE_BYTES = 100 * 1024 * 1024; // 100MB for documents

const allowedDocExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'];
const knownVideoExtensions = [
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv', '.3gp', '.ogv', '.mpeg', '.mpg', '.ts', '.m2ts',
];

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadDocumentModal({
  open,
  initialMode = 'video',
  onClose,
  onUpload,
}: UploadDocumentModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  const [mode, setMode] = useState<UploadMode>(initialMode);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [probingMetadata, setProbingMetadata] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetSelection = useCallback(() => {
    setObjectUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return '';
    });
    setSelectedFile(null);
    setThumbnailDataUrl('');
    setVideoDuration(null);
    setProbingMetadata(false);
    setError('');
    setUploading(false);
    setUploadProgress(0);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    } else {
      resetSelection();
    }
  }, [open, initialMode, resetSelection]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  if (!open) return null;

  const switchMode = (nextMode: UploadMode) => {
    if (uploading) return;
    resetSelection();
    setMode(nextMode);
  };

  const isVideoCandidate = (file: File): boolean => {
    if (file.type && file.type.toLowerCase().startsWith('video/')) {
      return true;
    }
    const lowerName = file.name.toLowerCase();
    return knownVideoExtensions.some((ext) => lowerName.endsWith(ext));
  };

  /**
   * Uses the HTML5 File API and hidden <video> element to inspect video duration
   * and capture a preview thumbnail frame before initiating upload.
   */
  const inspectVideoFile = (file: File) => {
    if (!isVideoCandidate(file)) {
      setError('Định dạng video không hợp lệ. Vui lòng chọn file video (MP4, MOV, AVI, MKV, WebM...).');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError('File video vượt quá dung lượng tối đa cho phép là 200MB.');
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setObjectUrl(nextObjectUrl);
    setThumbnailDataUrl('');
    setVideoDuration(null);
    setError('');
    setProbingMetadata(true);

    const videoEl = hiddenVideoRef.current;
    if (!videoEl) {
      setProbingMetadata(false);
      return;
    }

    let timeoutId: number | null = window.setTimeout(() => {
      setProbingMetadata(false);
    }, 2500);

    const cleanupListeners = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      videoEl.onloadedmetadata = null;
      videoEl.onseeked = null;
      videoEl.onerror = null;
    };

    videoEl.onloadedmetadata = () => {
      const duration = videoEl.duration;
      setProbingMetadata(false);

      if (!Number.isFinite(duration) || duration <= 0) {
        cleanupListeners();
        return;
      }

      setVideoDuration(duration);

      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(
          `Thời lượng video vượt quá giới hạn 5 phút (300 giây). Video đã chọn dài ${formatDuration(duration)} (${Math.round(duration)}s).`
        );
      }

      const targetTime = Math.min(1.0, Math.max(0.1, duration * 0.25));
      try {
        videoEl.currentTime = targetTime;
      } catch {
        cleanupListeners();
      }
    };

    videoEl.onseeked = () => {
      try {
        const width = videoEl.videoWidth || 640;
        const height = videoEl.videoHeight || 360;
        const scale = Math.min(1, 640 / width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          setThumbnailDataUrl(canvas.toDataURL('image/jpeg', 0.82));
        }
      } catch {
      } finally {
        cleanupListeners();
      }
    };

    videoEl.onerror = () => {
      cleanupListeners();
      setProbingMetadata(false);
    };

    videoEl.src = nextObjectUrl;
    videoEl.load();
  };

  const inspectDocumentFile = (file: File) => {
    const name = file.name.toLowerCase();
    const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
    if (!allowedDocExtensions.includes(extension)) {
      setError('Chỉ hỗ trợ file tài liệu PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT.');
      return;
    }
    if (file.size > MAX_DOC_SIZE_BYTES) {
      setError('Tài liệu quá lớn. Vui lòng chọn file nhỏ hơn 100MB.');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleFilePicked = (file?: File) => {
    if (!file || uploading) return;
    const isVideo = isVideoCandidate(file);
    if (isVideo) {
      if (mode !== 'video') setMode('video');
      inspectVideoFile(file);
    } else {
      if (mode !== 'document') setMode('document');
      inspectDocumentFile(file);
    }
  };

  const isDurationExceeded =
    mode === 'video' && videoDuration !== null && videoDuration > MAX_VIDEO_DURATION_SECONDS;

  const handleStartUpload = async () => {
    if (!selectedFile || uploading || probingMetadata) return;

    if (mode === 'video' && videoDuration !== null && videoDuration > MAX_VIDEO_DURATION_SECONDS) {
      setError('Thời lượng video vượt quá giới hạn 5 phút (300 giây).');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      await onUpload({
        file: selectedFile,
        mode,
        durationSeconds: videoDuration ?? undefined,
        thumbnailDataUrl: thumbnailDataUrl || undefined,
        onProgress: (percent) => setUploadProgress(percent),
      });
      resetSelection();
      onClose();
    } catch (requestError) {
      const response = (requestError as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message || 'Tải lên thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      {/* Hidden off-screen HTML5 <video> element for local duration inspection */}
      <video
        ref={hiddenVideoRef}
        preload="metadata"
        muted
        playsInline
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
              Media & Document Center
            </div>
            <h3 className="mt-1 text-2xl font-bold text-slate-800">
              {mode === 'video' ? 'Tải video lên' : 'Tải tài liệu lên'}
            </h3>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              resetSelection();
              onClose();
            }}
            className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => switchMode('video')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
              mode === 'video'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Film size={16} />
            Video (Tối đa 5 phút)
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => switchMode('document')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
              mode === 'document'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={16} />
            Tài liệu (PDF, Word, Slide...)
          </button>
        </div>

        {!selectedFile ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              handleFilePicked(file);
            }}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragging ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              {mode === 'video' ? <Film size={28} /> : <FileText size={28} />}
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-700">
              {mode === 'video'
                ? 'Kéo thả video vào đây hoặc chọn từ máy'
                : 'Kéo thả tài liệu vào đây hoặc chọn từ máy'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'video'
                ? 'Hỗ trợ mọi định dạng (MP4, MOV, AVI, MKV, WebM...) • Giới hạn dưới 5 phút (300s)'
                : 'Hỗ trợ PDF, Word, PowerPoint, Excel • Tối đa 100MB'}
            </p>

            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-violet-700"
            >
              <UploadCloud size={18} />
              {mode === 'video' ? 'Chọn file Video' : 'Chọn file Tài liệu'}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept={
                mode === 'video'
                  ? 'video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.flv,.wmv,.3gp'
                  : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
              }
              className="hidden"
              onChange={(event) => {
                handleFilePicked(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {/* Preview Thumbnail & File Details */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {mode === 'video' ? (
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-slate-900 sm:w-44">
                  {thumbnailDataUrl ? (
                    <img
                      src={thumbnailDataUrl}
                      alt={selectedFile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : objectUrl ? (
                    <video
                      src={objectUrl}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Film size={28} />
                    </div>
                  )}
                  {videoDuration !== null && (
                    <span
                      className={`absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white ${
                        isDurationExceeded ? 'bg-red-600/95' : 'bg-slate-900/85'
                      }`}
                    >
                      <Clock size={12} />
                      {formatDuration(videoDuration)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <FileText size={32} />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-base font-semibold text-slate-800" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={resetSelection}
                      title="Xóa chọn lại"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase">
                    {selectedFile.name.split('.').pop() || selectedFile.type || 'FILE'}
                  </span>
                </div>

                {mode === 'video' && (
                  <div className="pt-1">
                    {probingMetadata ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600">
                        Đang đọc thông tin thời lượng video...
                      </span>
                    ) : videoDuration !== null ? (
                      isDurationExceeded ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          <AlertCircle size={14} />
                          Vượt quá giới hạn 5 phút ({formatDuration(videoDuration)} / tối đa 05:00)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={14} />
                          Thời lượng hợp lệ: {formatDuration(videoDuration)} (dưới 5 phút)
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        Thời lượng sẽ được máy chủ kiểm tra (tối đa 5 phút)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    {uploadProgress < 100
                      ? 'Đang tải file lên...'
                      : 'Đang xác thực & lưu trữ trên máy chủ...'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-violet-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={uploading}
                onClick={resetSelection}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Chọn file khác
              </button>
              <button
                type="button"
                disabled={uploading || isDurationExceeded}
                onClick={() => void handleStartUpload()}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud size={16} />
                {uploading
                  ? `Đang tải lên (${uploadProgress}%)`
                  : mode === 'video'
                  ? 'Bắt đầu tải Video'
                  : 'Bắt đầu tải Tài liệu'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
