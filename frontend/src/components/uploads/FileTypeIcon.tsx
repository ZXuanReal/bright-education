import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

type FileVisual = {
  label: string;
  iconBg: string;
  iconText: string;
  badgeClass: string;
  Icon: LucideIcon;
};

const videoExts = new Set([
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ogv', 'mpeg', 'mpg', 'ts', 'm2ts',
]);
const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']);
const archiveExts = new Set(['zip', 'rar', '7z', 'tar', 'gz']);

export function getFileVisual(extension?: string, mimeType?: string): FileVisual {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  const mime = (mimeType || '').toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') {
    return {
      label: 'PDF',
      iconBg: 'bg-rose-50 ring-rose-200/70',
      iconText: 'text-rose-600',
      badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200/80',
      Icon: FileText,
    };
  }
  if (ext === 'doc' || ext === 'docx' || mime.includes('wordprocessingml') || mime === 'application/msword') {
    return {
      label: ext ? ext.toUpperCase() : 'DOCX',
      iconBg: 'bg-blue-50 ring-blue-200/70',
      iconText: 'text-blue-600',
      badgeClass: 'bg-blue-50 text-blue-700 ring-blue-200/80',
      Icon: FileText,
    };
  }
  if (ext === 'xls' || ext === 'xlsx' || mime.includes('spreadsheetml') || mime.includes('ms-excel')) {
    return {
      label: ext ? ext.toUpperCase() : 'XLSX',
      iconBg: 'bg-emerald-50 ring-emerald-200/70',
      iconText: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
      Icon: FileSpreadsheet,
    };
  }
  if (ext === 'ppt' || ext === 'pptx' || mime.includes('presentationml') || mime.includes('powerpoint')) {
    return {
      label: ext ? ext.toUpperCase() : 'PPTX',
      iconBg: 'bg-orange-50 ring-orange-200/70',
      iconText: 'text-orange-600',
      badgeClass: 'bg-orange-50 text-orange-700 ring-orange-200/80',
      Icon: Presentation,
    };
  }
  if (videoExts.has(ext) || mime.startsWith('video/')) {
    return {
      label: ext ? ext.toUpperCase() : 'VIDEO',
      iconBg: 'bg-[#f0efff] ring-[#ddd6fe]',
      iconText: 'text-[#635bdb]',
      badgeClass: 'bg-[#f0efff] text-[#5146c8] ring-[#ddd6fe]',
      Icon: Film,
    };
  }
  if (imageExts.has(ext) || mime.startsWith('image/')) {
    return {
      label: ext ? ext.toUpperCase() : 'IMAGE',
      iconBg: 'bg-fuchsia-50 ring-fuchsia-200/70',
      iconText: 'text-fuchsia-600',
      badgeClass: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200/80',
      Icon: FileImage,
    };
  }
  if (archiveExts.has(ext)) {
    return {
      label: ext.toUpperCase(),
      iconBg: 'bg-amber-50 ring-amber-200/70',
      iconText: 'text-amber-600',
      badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200/80',
      Icon: FileArchive,
    };
  }
  if (ext === 'txt' || mime.startsWith('text/')) {
    return {
      label: 'TXT',
      iconBg: 'bg-slate-100 ring-slate-200',
      iconText: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
      Icon: FileText,
    };
  }

  return {
    label: ext ? ext.toUpperCase() : 'FILE',
    iconBg: 'bg-slate-100 ring-slate-200',
    iconText: 'text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
    Icon: File,
  };
}

export function FileTypeIcon({ extension, mimeType }: { extension?: string; mimeType?: string }) {
  const { iconBg, iconText, Icon } = getFileVisual(extension, mimeType);
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${iconBg} ${iconText}`}
      aria-hidden="true"
    >
      <Icon size={17} strokeWidth={1.9} />
    </div>
  );
}

export function FileFormatBadge({ extension, mimeType }: { extension?: string; mimeType?: string }) {
  const { label, badgeClass } = getFileVisual(extension, mimeType);
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${badgeClass}`}>
      {label}
    </span>
  );
}
