package com.brightenglish.portal.service;

import com.brightenglish.portal.dto.DocumentResponse;
import com.brightenglish.portal.dto.DocumentFileResponse;
import com.brightenglish.portal.dto.PermissionGrantRequest;
import com.brightenglish.portal.entity.Document;
import com.brightenglish.portal.entity.DocumentPermission;
import com.brightenglish.portal.entity.Folder;
import com.brightenglish.portal.entity.Program;
import com.brightenglish.portal.entity.Role;
import com.brightenglish.portal.entity.User;
import com.brightenglish.portal.repository.DocumentRepository;
import com.brightenglish.portal.repository.DocumentPermissionRepository;
import com.brightenglish.portal.repository.FolderRepository;
import com.brightenglish.portal.repository.ProgramRepository;
import com.brightenglish.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository documentPermissionRepository;
    private final FolderRepository folderRepository;
    private final ProgramRepository programRepository;
    private final UserRepository userRepository;

    @Value("${app.uploadDir:./uploads}")
    private String uploadDir;

    public Page<DocumentResponse> getDocuments(Long folderId, String search, int page, int size, String email) {
        User requester = getUser(email);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<Document> result = documentRepository.searchDocuments(
                folderId,
                search == null || search.isBlank() ? null : search.trim(),
                requester.getId(),
                requester.getRole() == Role.ADMIN,
                DocumentPermission.PermissionType.VIEW,
                pageable
        );
        return result.map(this::toResponse);
    }

    public DocumentResponse createDocument(String title, String description, Long folderId, Long programId, String uploaderEmail,
                                          String fileName, String mimeType, String extension, long sizeInBytes, String filePath,
                                          String thumbnailPath) {
        return createDocument(title, description, folderId, programId, uploaderEmail, fileName, mimeType, extension, sizeInBytes, filePath, thumbnailPath, null);
    }

    public DocumentResponse createDocument(String title, String description, Long folderId, Long programId, String uploaderEmail,
                                          String fileName, String mimeType, String extension, long sizeInBytes, String filePath,
                                          String thumbnailPath, Double durationSeconds) {
        Folder folder = folderId != null ? folderRepository.findById(folderId).orElseThrow(() -> new RuntimeException("Folder not found.")) : null;
        Program program = programId != null ? programRepository.findById(programId).orElseThrow(() -> new RuntimeException("Program not found.")) : null;
        User uploadedBy = getUser(uploaderEmail);

        Document document = Document.builder()
                .title(title)
                .description(description)
                .fileName(fileName)
                .filePath(filePath)
                .mimeType(resolveMimeType(mimeType, extension))
                .extension(extension)
                .sizeInBytes(sizeInBytes)
                .thumbnailPath(thumbnailPath)
                .folder(folder)
                .program(program)
                .uploadedBy(uploadedBy)
                .status(Document.DocumentStatus.ACTIVE)
                .deleted(false)
                .build();

        DocumentResponse response = toResponse(documentRepository.save(document));
        if (durationSeconds != null) {
            response.setDurationSeconds(durationSeconds);
        }
        return response;
    }

    public DocumentResponse getDocument(Long id, String email) {
        Document document = documentRepository.findById(id).orElseThrow(() -> new RuntimeException("Document not found."));
        User requester = getUser(email);
        requirePermission(document, requester, DocumentPermission.PermissionType.VIEW);
        document.setViewCount(document.getViewCount() + 1);
        documentRepository.save(document);
        return toResponse(document);
    }

    public DocumentFileResponse getDocumentFile(Long id, String email, boolean download) {
        return getDocumentFile(id, email, download, true);
    }

    public DocumentFileResponse getDocumentFile(Long id, String email, boolean download, boolean trackView) {
        Document document = documentRepository.findById(id).orElseThrow(() -> new RuntimeException("Document not found."));
        User requester = getUser(email);
        requirePermission(document, requester, download ? DocumentPermission.PermissionType.DOWNLOAD : DocumentPermission.PermissionType.VIEW);
        Path filePath = resolveExistingFilePath(document.getFilePath());
        if (filePath == null) {
            throw new RuntimeException("Document file is missing from storage.");
        }
        if (download) {
            document.setDownloadCount(document.getDownloadCount() + 1);
            documentRepository.save(document);
        } else if (trackView) {
            document.setViewCount(document.getViewCount() + 1);
            documentRepository.save(document);
        }
        try {
            String resolvedMime = resolveMimeType(document.getMimeType(), document.getExtension());
            return new DocumentFileResponse(new UrlResource(filePath.toUri()), document.getFileName(), resolvedMime);
        } catch (java.net.MalformedURLException exception) {
            throw new RuntimeException("Document file cannot be opened.", exception);
        }
    }

    public String getDocxPreviewHtml(Long id, String email) {
        return getDocxPreviewHtml(id, email, true);
    }

    public String getDocxPreviewHtml(Long id, String email, boolean trackView) {
        Document document = documentRepository.findById(id).orElseThrow(() -> new RuntimeException("Document not found."));
        User requester = getUser(email);
        requirePermission(document, requester, DocumentPermission.PermissionType.VIEW);
        Path filePath = resolveExistingFilePath(document.getFilePath());
        if (filePath == null) {
            throw new RuntimeException("Document file is missing from storage.");
        }
        if (trackView) {
            document.setViewCount(document.getViewCount() + 1);
            documentRepository.save(document);
        }
        return convertDocxToHtml(filePath, document.getTitle());
    }

    @Transactional
    public void grantPermission(Long documentId, String actorEmail, PermissionGrantRequest request) {
        Document document = documentRepository.findById(documentId).orElseThrow(() -> new RuntimeException("Document not found."));
        User actor = getUser(actorEmail);
        boolean isAdmin = actor.getRole() == Role.ADMIN;
        // The uploader may share only while they still hold the TEACHER role; a revoked teacher loses this ability.
        boolean isTeacherUploader = actor.getRole() == Role.TEACHER
                && document.getUploadedBy() != null
                && document.getUploadedBy().getId().equals(actor.getId());
        if (!isAdmin && !isTeacherUploader) {
            throw new AccessDeniedException("Only an administrator or the teacher who uploaded this document can manage its permissions.");
        }
        User target = getUser(request.getEmail());
        DocumentPermission permission = documentPermissionRepository
                .findByDocument_IdAndUser_IdAndPermissionType(documentId, target.getId(), request.getPermissionType())
                .orElseGet(() -> DocumentPermission.builder()
                        .document(document)
                        .user(target)
                        .permissionType(request.getPermissionType())
                        .build());
        documentPermissionRepository.save(permission);
    }

    private void requirePermission(Document document, User requester, DocumentPermission.PermissionType permission) {
        boolean isActivePortalDocument = !document.isDeleted()
                && document.getStatus() == Document.DocumentStatus.ACTIVE;
        boolean allowed = isActivePortalDocument
                || requester.getRole() == Role.ADMIN
                || (document.getUploadedBy() != null && document.getUploadedBy().getId().equals(requester.getId()))
                || documentPermissionRepository.existsByDocument_IdAndUser_IdAndPermissionType(
                        document.getId(), requester.getId(), permission);
        if (!allowed) {
            throw new AccessDeniedException("You do not have permission to access this document.");
        }
    }

    private Path resolveExistingFilePath(String rawPath) {
        return resolveExistingFilePath(rawPath, "documents");
    }

    private Path resolveExistingFilePath(String rawPath, String subDir) {
        if (rawPath == null || rawPath.isBlank()) {
            return null;
        }
        Path direct = Paths.get(rawPath).normalize();
        if (Files.isRegularFile(direct)) {
            return direct;
        }
        Path fileName = direct.getFileName();
        if (fileName != null) {
            Path[] fallbacks = new Path[] {
                Paths.get(uploadDir, subDir).resolve(fileName).normalize(),
                Paths.get("uploads", subDir).resolve(fileName).normalize(),
                Paths.get("backend", "uploads", subDir).resolve(fileName).normalize()
            };
            for (Path candidate : fallbacks) {
                if (Files.isRegularFile(candidate)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private String resolveMimeType(String mimeType, String extension) {
        String ext = extension == null ? "" : extension.trim().toLowerCase(Locale.ROOT);
        if ("pdf".equals(ext)) {
            return "application/pdf";
        }
        if ("docx".equals(ext)) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        if ("doc".equals(ext)) {
            return "application/msword";
        }
        if (mimeType != null && !mimeType.isBlank() && !"application/octet-stream".equalsIgnoreCase(mimeType)) {
            return mimeType;
        }
        if (!ext.isBlank()) {
            return switch (ext) {
                case "mp4" -> "video/mp4";
                case "webm" -> "video/webm";
                case "mov" -> "video/quicktime";
                case "avi" -> "video/x-msvideo";
                case "mkv" -> "video/x-matroska";
                default -> mimeType != null ? mimeType : "application/octet-stream";
            };
        }
        return "application/octet-stream";
    }

    private String convertDocxToHtml(Path docxPath, String title) {
        byte[] documentXmlBytes = null;
        try (InputStream fis = Files.newInputStream(docxPath);
             ZipInputStream zis = new ZipInputStream(fis)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    documentXmlBytes = zis.readAllBytes();
                    break;
                }
            }
        } catch (IOException ex) {
            throw new RuntimeException("Could not read DOCX file content.", ex);
        }

        if (documentXmlBytes == null) {
            return "<div style='padding:24px;color:#475569;font-family:sans-serif;'>Unable to preview this Word document directly. Please download the file to view it.</div>";
        }

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            org.w3c.dom.Document xmlDoc = builder.parse(new ByteArrayInputStream(documentXmlBytes));

            StringBuilder html = new StringBuilder();
            html.append("<article style=\"max-width:820px;margin:0 auto;padding:32px;background:#ffffff;color:#1e293b;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;line-height:1.7;\">");
            NodeList bodyList = xmlDoc.getElementsByTagName("w:body");
            if (bodyList.getLength() > 0) {
                Node body = bodyList.item(0);
                NodeList children = body.getChildNodes();
                for (int i = 0; i < children.getLength(); i++) {
                    Node child = children.item(i);
                    if ("w:p".equals(child.getNodeName())) {
                        String paragraphHtml = renderDocxParagraph(child);
                        if (!paragraphHtml.isBlank()) {
                            html.append(paragraphHtml);
                        }
                    } else if ("w:tbl".equals(child.getNodeName())) {
                        html.append(renderDocxTable(child));
                    }
                }
            }
            if (html.indexOf("<p") < 0 && html.indexOf("<h") < 0 && html.indexOf("<table") < 0) {
                html.append("<p style=\"color:#64748b;\">").append(escapeHtml(title != null ? title : "Empty document")).append("</p>");
            }
            html.append("</article>");
            return html.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Could not parse DOCX preview.", ex);
        }
    }

    private String renderDocxParagraph(Node paragraphNode) {
        String styleId = "";
        StringBuilder runsHtml = new StringBuilder();
        NodeList children = paragraphNode.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if ("w:pPr".equals(child.getNodeName())) {
                NodeList pPrChildren = child.getChildNodes();
                for (int j = 0; j < pPrChildren.getLength(); j++) {
                    Node pPrChild = pPrChildren.item(j);
                    if ("w:pStyle".equals(pPrChild.getNodeName()) && pPrChild instanceof Element el) {
                        styleId = el.getAttribute("w:val");
                    }
                }
            } else if ("w:r".equals(child.getNodeName())) {
                runsHtml.append(renderDocxRun(child));
            } else if ("w:hyperlink".equals(child.getNodeName())) {
                NodeList linkChildren = child.getChildNodes();
                for (int j = 0; j < linkChildren.getLength(); j++) {
                    if ("w:r".equals(linkChildren.item(j).getNodeName())) {
                        runsHtml.append(renderDocxRun(linkChildren.item(j)));
                    }
                }
            }
        }

        String content = runsHtml.toString().trim();
        if (content.isEmpty()) {
            return "";
        }
        String lowerStyle = styleId == null ? "" : styleId.toLowerCase(Locale.ROOT);
        if (lowerStyle.contains("heading1") || lowerStyle.contains("title")) {
            return "<h2 style=\"font-size:1.4rem;font-weight:700;margin:1.25rem 0 0.6rem;color:#0f172a;\">" + content + "</h2>";
        }
        if (lowerStyle.contains("heading2") || lowerStyle.contains("heading3")) {
            return "<h3 style=\"font-size:1.15rem;font-weight:600;margin:1rem 0 0.5rem;color:#1e293b;\">" + content + "</h3>";
        }
        return "<p style=\"margin:0 0 0.75rem;\">" + content + "</p>";
    }

    private String renderDocxRun(Node runNode) {
        boolean bold = false;
        boolean italic = false;
        StringBuilder text = new StringBuilder();
        NodeList children = runNode.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            String name = child.getNodeName();
            if ("w:rPr".equals(name)) {
                NodeList rPrChildren = child.getChildNodes();
                for (int j = 0; j < rPrChildren.getLength(); j++) {
                    String propName = rPrChildren.item(j).getNodeName();
                    if ("w:b".equals(propName)) bold = true;
                    if ("w:i".equals(propName)) italic = true;
                }
            } else if ("w:t".equals(name)) {
                text.append(escapeHtml(child.getTextContent()));
            } else if ("w:tab".equals(name)) {
                text.append("&emsp;");
            } else if ("w:br".equals(name) || "w:cr".equals(name)) {
                text.append("<br/>");
            }
        }
        String result = text.toString();
        if (result.isEmpty()) return "";
        if (bold) result = "<strong>" + result + "</strong>";
        if (italic) result = "<em>" + result + "</em>";
        return result;
    }

    private String renderDocxTable(Node tableNode) {
        StringBuilder table = new StringBuilder("<table style=\"width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.92rem;\"><tbody>");
        NodeList rows = tableNode.getChildNodes();
        for (int i = 0; i < rows.getLength(); i++) {
            Node row = rows.item(i);
            if ("w:tr".equals(row.getNodeName())) {
                table.append("<tr>");
                NodeList cells = row.getChildNodes();
                for (int j = 0; j < cells.getLength(); j++) {
                    Node cell = cells.item(j);
                    if ("w:tc".equals(cell.getNodeName())) {
                        table.append("<td style=\"border:1px solid #cbd5e1;padding:8px 12px;vertical-align:top;\">");
                        NodeList cellChildren = cell.getChildNodes();
                        for (int k = 0; k < cellChildren.getLength(); k++) {
                            if ("w:p".equals(cellChildren.item(k).getNodeName())) {
                                table.append(renderDocxParagraph(cellChildren.item(k)));
                            }
                        }
                        table.append("</td>");
                    }
                }
                table.append("</tr>");
            }
        }
        table.append("</tbody></table>");
        return table.toString();
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new RuntimeException("User not found."));
    }

    private String resolveThumbnailUrl(String thumbnailPath) {
        if (thumbnailPath == null || thumbnailPath.isBlank()) {
            return null;
        }
        if (thumbnailPath.startsWith("data:") || thumbnailPath.startsWith("http://") || thumbnailPath.startsWith("https://")) {
            return thumbnailPath;
        }
        try {
            Path path = resolveExistingFilePath(thumbnailPath, "thumbnails");
            if (path != null && Files.isRegularFile(path)) {
                byte[] bytes = Files.readAllBytes(path);
                String mime = thumbnailPath.toLowerCase(Locale.ROOT).endsWith(".png") ? "image/png" : "image/jpeg";
                return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
            }
        } catch (IOException ignored) {
        }
        return null;
    }

    private DocumentResponse toResponse(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .description(document.getDescription())
                .fileName(document.getFileName())
                .mimeType(resolveMimeType(document.getMimeType(), document.getExtension()))
                .extension(document.getExtension())
                .sizeInBytes(document.getSizeInBytes())
                .thumbnailUrl(resolveThumbnailUrl(document.getThumbnailPath()))
                .folderId(document.getFolder() != null ? document.getFolder().getId() : null)
                .folderName(document.getFolder() != null ? document.getFolder().getName() : "Root")
                .programId(document.getProgram() != null ? document.getProgram().getId() : null)
                .programName(document.getProgram() != null ? document.getProgram().getName() : null)
                .uploadedByName(document.getUploadedBy() != null ? document.getUploadedBy().getFullName() : "System")
                .uploadedAt(document.getUploadedAt())
                .viewCount(document.getViewCount())
                .downloadCount(document.getDownloadCount())
                .status(document.getStatus().name())
                .build();
    }
}
