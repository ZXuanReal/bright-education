import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Download, FilePlus2, Film, Folder, Search, Upload, X } from 'lucide-react';
import { DocumentCard } from '../components/DocumentCard';
import { UploadDocumentModal, type UploadMode, type UploadPayload } from '../components/UploadDocumentModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { DocumentItem, Folder as FolderItem } from '../types';

type DocumentPageResponse = {
  content: DocumentItem[];
  totalElements: number;
};

const videoExtensions = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ogv', 'mpeg', 'mpg', 'ts', 'm2ts',
]);

function isVideoDocument(document: DocumentItem | null): boolean {
  if (!document) return false;
  if (document.mimeType?.toLowerCase().startsWith('video/')) return true;
  return Boolean(document.extension && videoExtensions.has(document.extension.toLowerCase()));
}

function getRequestErrorMessage(requestError: unknown, fallback: string) {
  const response = (requestError as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || fallback;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [totalResults, setTotalResults] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('video');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [shareDocument, setShareDocument] = useState<DocumentItem | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'DOWNLOAD'>('VIEW');
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDocxHtml, setPreviewDocxHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null;
  const canUpload = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch !== null) setSearchTerm(querySearch);
    if (searchParams.get('upload') === '1' && canUpload) {
      setUploadMode('document');
      setUploadOpen(true);
    }
  }, [searchParams, canUpload]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const params: Record<string, string | number> = { page: 0, size: 100 };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      else if (currentFolderId !== null) params.folderId = currentFolderId;

      api.get<DocumentPageResponse>('/documents', { params })
        .then(({ data }) => {
          if (!active) return;
          setDocuments(data.content);
          setTotalResults(data.totalElements);
          setError('');
        })
        .catch((requestError: unknown) => {
          if (active) setError(getRequestErrorMessage(requestError, 'Could not load documents.'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [currentFolderId, refreshKey, searchTerm]);

  useEffect(() => {
    let active = true;
    const params = currentFolderId === null ? {} : { parentId: currentFolderId };
    api.get<FolderItem[]>('/folders', { params })
      .then(({ data }) => {
        if (active) setFolders(data);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getRequestErrorMessage(requestError, 'Could not load folders.'));
      });
    return () => {
      active = false;
    };
  }, [currentFolderId, refreshKey]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleUpload = async ({ file, mode, durationSeconds, thumbnailDataUrl, onProgress }: UploadPayload) => {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId !== null) formData.append('folderId', String(currentFolderId));
    if (thumbnailDataUrl) formData.append('thumbnailDataUrl', thumbnailDataUrl);
    if (durationSeconds !== undefined && durationSeconds !== null && !Number.isNaN(durationSeconds)) {
      formData.append('durationSeconds', String(durationSeconds));
    }

    const endpoint = mode === 'video' ? '/videos/upload' : '/documents';

    await api.post(endpoint, formData, {
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total));
          onProgress(percent);
        }
      },
    });

    setNotice(`${file.name} uploaded successfully.`);
    setRefreshKey((value) => value + 1);
  };

  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingFolder(true);
    setError('');
    try {
      await api.post('/folders', null, {
        params: { name: newFolderName.trim(), ...(currentFolderId === null ? {} : { parentId: currentFolderId }) },
      });
      setNewFolderName('');
      setNotice('Folder created.');
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not create folder.'));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDownload = async (document: DocumentItem) => {
    setError('');
    try {
      const response = await api.get<Blob>(`/documents/${document.id}/download`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.fileName || document.title;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not download this document.'));
    }
  };

  const handlePreview = async (document: DocumentItem) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDocument(document);
    setPreviewUrl('');
    setPreviewDocxHtml('');

    const ext = document.extension?.toLowerCase() || '';
    const isPdf = ext === 'pdf' || document.mimeType?.toLowerCase() === 'application/pdf';
    const isDocx = ext === 'docx';
    const isTxt = ext === 'txt' || document.mimeType?.toLowerCase() === 'text/plain';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || Boolean(document.mimeType?.toLowerCase().startsWith('image/'));
    const isVideo = isVideoDocument(document);

    if (!isPdf && !isDocx && !isTxt && !isImage && !isVideo) return;

    setPreviewLoading(true);
    try {
      if (isDocx) {
        const response = await api.get<string>(`/documents/${document.id}/preview-docx`, {
          responseType: 'text',
        });
        setPreviewDocxHtml(response.data);
      } else {
        const response = await api.get<Blob>(`/documents/${document.id}/preview`, {
          responseType: 'blob',
        });
        const forcedMime = isPdf
          ? 'application/pdf'
          : isTxt
            ? 'text/plain;charset=utf-8'
            : response.data.type || document.mimeType || 'video/mp4';
        const typedBlob = new Blob([response.data], { type: forcedMime });
        setPreviewUrl(URL.createObjectURL(typedBlob));
      }
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setPreviewDocument(null);
      setError(getRequestErrorMessage(requestError, 'Could not preview this file.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGrantPermission = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shareDocument) return;
    setError('');
    try {
      await api.put(`/documents/${shareDocument.id}/permissions`, {
        email: shareEmail.trim().toLowerCase(),
        permissionType: sharePermission,
      });
      setNotice(`${sharePermission} access granted to ${shareEmail}.`);
      setShareDocument(null);
      setShareEmail('');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not change document permissions.'));
    }
  };

  const navigateToFolder = (folder: FolderItem) => {
    setFolderPath((path) => [...path, folder]);
    setSearchTerm('');
    setNotice('');
  };

  const navigateToBreadcrumb = (index: number) => {
    setFolderPath((path) => path.slice(0, index + 1));
    setSearchTerm('');
    setNotice('');
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDocument(null);
    setPreviewUrl('');
    setPreviewDocxHtml('');
    setPreviewLoading(false);
  };

  return (
    <div className="space-y-6">
      <UploadDocumentModal
        open={uploadOpen}
        initialMode={uploadMode}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Portal</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <button type="button" onClick={() => { setFolderPath([]); setSearchTerm(''); }} className="hover:text-slate-900">Documents</button>
            {folderPath.map((folder, index) => (
              <span key={folder.id} className="inline-flex items-center gap-2">
                <ChevronRight size={14} />
                <button type="button" onClick={() => navigateToBreadcrumb(index)} className="hover:text-slate-900">{folder.name}</button>
              </span>
            ))}
          </div>
        </div>
        {canUpload && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setUploadMode('video');
                setUploadOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-violet-700"
            >
              <Film size={16} />
              Upload Video
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('document');
                setUploadOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <Upload size={16} />
              Upload Document
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search in all documents & videos..." className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {!searchTerm.trim() && (
        <section aria-label="Folders" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Folders</h2>
            {canUpload && (
              <form onSubmit={handleCreateFolder} className="flex gap-2">
                <input aria-label="New folder name" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="New folder name" required maxLength={120} className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <button type="submit" disabled={creatingFolder} title="Create folder" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"><FilePlus2 size={16} />Create</button>
              </form>
            )}
          </div>
          {folders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {folders.map((folder) => (
                <button key={folder.id} type="button" onClick={() => navigateToFolder(folder)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Folder size={20} className="shrink-0 text-violet-600" />
                      <span className="truncate font-semibold text-slate-800">{folder.name}</span>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{folder.documentCount ?? 0} documents</div>
                </button>
              ))}
            </div>
          ) : !loading && <p className="text-sm text-slate-500">No folders in this location.</p>}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Documents & Videos</h2>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${totalResults} results`}</div>
          </div>
        </div>
        {documents.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onPreview={() => void handlePreview(document)}
                onDownload={() => void handleDownload(document)}
                onShare={() => setShareDocument(document)}
                canShare={user?.role === 'ADMIN' || (user?.role === 'TEACHER' && document.uploadedByName === user?.fullName)}
              />
            ))}
          </div>
        ) : !loading && <p className="py-8 text-center text-sm text-slate-500">No documents found.</p>}
      </section>

      {shareDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleGrantPermission} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Share {shareDocument.title}</h2>
              <button type="button" onClick={() => setShareDocument(null)} aria-label="Close share dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700">Account email
              <input type="email" value={shareEmail} onChange={(event) => setShareEmail(event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Permission
              <select value={sharePermission} onChange={(event) => setSharePermission(event.target.value as 'VIEW' | 'DOWNLOAD')} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="VIEW">View</option>
                <option value="DOWNLOAD">Download</option>
              </select>
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white">Save permission</button>
          </form>
        </div>
      )}

      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="truncate font-semibold text-slate-800">{previewDocument.title}</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void handleDownload(previewDocument)} title="Download file" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Download size={18} /></button>
                <button type="button" onClick={closePreview} aria-label="Close preview" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={18} /></button>
              </div>
            </div>
            {previewLoading ? (
              <div className="flex min-h-[50vh] items-center justify-center p-8 text-sm font-medium text-slate-500">
                Loading preview...
              </div>
            ) : previewDocxHtml ? (
              <iframe
                title={`Preview ${previewDocument.title}`}
                srcDoc={previewDocxHtml}
                className="min-h-[75vh] w-full flex-1 bg-slate-100"
              />
            ) : previewUrl ? (
              isVideoDocument(previewDocument) ? (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-full bg-slate-950"
                />
              ) : (
                <iframe title={`Preview ${previewDocument.title}`} src={previewUrl} className="min-h-[75vh] w-full flex-1" />
              )
            ) : (
              <p className="p-8 text-center text-sm text-slate-600">
                In-browser preview is available for PDF, DOCX, TXT, image, and video files. Download this file to open it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
