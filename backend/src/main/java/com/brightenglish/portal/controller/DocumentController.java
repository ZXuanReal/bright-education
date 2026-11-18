package com.brightenglish.portal.controller;

import com.brightenglish.portal.dto.DocumentResponse;
import com.brightenglish.portal.dto.DocumentFileResponse;
import com.brightenglish.portal.dto.PermissionGrantRequest;
import com.brightenglish.portal.service.DocumentService;
import com.brightenglish.portal.service.VideoMetadataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {
    private final DocumentService documentService;
    private final VideoMetadataService videoMetadataService;

    @Value("${app.uploadDir}")
    private String uploadDir;

    @GetMapping("/documents")
    public ResponseEntity<Page<DocumentResponse>> getDocuments(@RequestParam(required = false) Long folderId,
                                                               @RequestParam(required = false) String search,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "20") int size,
                                                               Authentication authentication) {
        return ResponseEntity.ok(documentService.getDocuments(folderId, search, page, size, authentication.getName()));
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<DocumentResponse> getDocument(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(documentService.getDocument(id, authentication.getName()));
    }

    @GetMapping("/documents/{id}/preview")
    public ResponseEntity<Resource> previewDocument(@PathVariable Long id,
                                                    @RequestParam(defaultValue = "true") boolean trackView,
                                                    Authentication authentication) {
        return documentFileResponse(id, authentication.getName(), false, trackView);
    }

    @GetMapping(value = "/documents/{id}/preview-docx", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> previewDocxDocument(@PathVariable Long id,
                                                      @RequestParam(defaultValue = "true") boolean trackView,
                                                      Authentication authentication) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "html", StandardCharsets.UTF_8))
                .body(documentService.getDocxPreviewHtml(id, authentication.getName(), trackView));
    }

    @GetMapping("/documents/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id, Authentication authentication) {
        return documentFileResponse(id, authentication.getName(), true, true);
    }

    @PutMapping("/documents/{id}/permissions")
    public ResponseEntity<Void> grantPermission(@PathVariable Long id,
                                                @Valid @RequestBody PermissionGrantRequest request,
                                                Authentication authentication) {
        documentService.grantPermission(id, authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/videos/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER') or hasAnyAuthority('ROLE_ADMIN', 'ROLE_TEACHER', 'ADMIN', 'TEACHER')")
    public ResponseEntity<DocumentResponse> uploadVideo(@RequestParam("file") MultipartFile file,
                                                        @RequestParam(required = false) String title,
                                                        @RequestParam(required = false) String description,
                                                        @RequestParam(required = false) Long folderId,
                                                        @RequestParam(required = false) Long programId,
                                                        @RequestParam(required = false) String thumbnailDataUrl,
                                                        @RequestParam(required = false) Double durationSeconds,
                                                        Authentication authentication) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Video file is required.");
        }

        String originalFilename = file.getOriginalFilename() == null ? "video.mp4" : file.getOriginalFilename();
        String extension = getExtension(originalFilename);
        String mimeType = file.getContentType();

        if (!videoMetadataService.isVideoFile(mimeType, extension)) {
            throw new IllegalArgumentException("Only valid video files (video/*) are accepted.");
        }

        return processAndSaveUpload(file, originalFilename, extension, mimeType, true, title, description, folderId, programId, thumbnailDataUrl, durationSeconds, authentication.getName());
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER') or hasAnyAuthority('ROLE_ADMIN', 'ROLE_TEACHER', 'ADMIN', 'TEACHER')")
    public ResponseEntity<DocumentResponse> uploadDocument(@RequestParam("file") MultipartFile file,
                                                        @RequestParam(required = false) String title,
                                                        @RequestParam(required = false) String description,
                                                        @RequestParam(required = false) Long folderId,
                                                        @RequestParam(required = false) Long programId,
                                                        @RequestParam(required = false) String thumbnailDataUrl,
                                                        @RequestParam(required = false) Double durationSeconds,
                                                        Authentication authentication) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }

        String originalFilename = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String extension = getExtension(originalFilename);
        String mimeType = file.getContentType();
        boolean isVideo = videoMetadataService.isVideoFile(mimeType, extension);

        if (!isVideo && !isAllowedDocumentExtension(extension)) {
            throw new IllegalArgumentException("Only PDF, Word, PowerPoint, Excel, and video files are allowed.");
        }

        return processAndSaveUpload(file, originalFilename, extension, mimeType, isVideo, title, description, folderId, programId, thumbnailDataUrl, durationSeconds, authentication.getName());
    }

    private ResponseEntity<DocumentResponse> processAndSaveUpload(MultipartFile file,
                                                                  String originalFilename,
                                                                  String extension,
                                                                  String mimeType,
                                                                  boolean isVideo,
                                                                  String title,
                                                                  String description,
                                                                  Long folderId,
                                                                  Long programId,
                                                                  String thumbnailDataUrl,
                                                                  Double clientDurationSeconds,
                                                                  String uploaderEmail) throws IOException {
        long fileSize = file.getSize();
        Path rootDir = Paths.get(uploadDir, "documents");
        Files.createDirectories(rootDir);

        String safeSuffix = extension.isBlank() ? ".tmp" : "." + extension.replaceAll("[^a-zA-Z0-9]", "");
        Path tempFile = Files.createTempFile(rootDir, "upload-staging-", safeSuffix);
        Double validatedDuration = null;

        try {
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }

            if (isVideo) {
                validatedDuration = videoMetadataService.validateVideoDuration(tempFile, extension, clientDurationSeconds);
            }

            String safeName = UUID.randomUUID() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path destination = rootDir.resolve(safeName);
            try {
                Files.move(tempFile, destination, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException moveEx) {
                Files.copy(tempFile, destination, StandardCopyOption.REPLACE_EXISTING);
                Files.deleteIfExists(tempFile);
            }

            String thumbnailPath = saveThumbnailIfPresent(thumbnailDataUrl);
            String resolvedTitle = title != null && !title.isBlank() ? title : originalFilename;
            String resolvedDescription = description != null && !description.isBlank()
                    ? description
                    : (isVideo && validatedDuration != null && validatedDuration > 0
                            ? String.format(Locale.ROOT, "Uploaded video (%s)", formatDuration(validatedDuration))
                            : "Uploaded document");

            String resolvedMimeType = (mimeType == null || mimeType.isBlank())
                    ? (isVideo ? "video/" + (extension.isBlank() ? "mp4" : extension) : "application/octet-stream")
                    : mimeType;

            return ResponseEntity.ok(documentService.createDocument(
                    resolvedTitle,
                    resolvedDescription,
                    folderId,
                    programId,
                    uploaderEmail,
                    originalFilename,
                    resolvedMimeType,
                    extension.isBlank() ? (isVideo ? "mp4" : "bin") : extension,
                    fileSize,
                    destination.toAbsolutePath().normalize().toString(),
                    thumbnailPath,
                    validatedDuration
            ));
        } finally {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignored) {
            }
        }
    }

    private String saveThumbnailIfPresent(String thumbnailDataUrl) {
        if (thumbnailDataUrl == null || !thumbnailDataUrl.startsWith("data:image/")) {
            return null;
        }
        int commaIndex = thumbnailDataUrl.indexOf(',');
        if (commaIndex < 0) {
            return null;
        }
        try {
            byte[] imageBytes = Base64.getDecoder().decode(thumbnailDataUrl.substring(commaIndex + 1));
            Path thumbDir = Paths.get(uploadDir, "thumbnails");
            Files.createDirectories(thumbDir);
            Path thumbPath = thumbDir.resolve(UUID.randomUUID() + ".jpg");
            Files.write(thumbPath, imageBytes);
            return thumbPath.toAbsolutePath().normalize().toString();
        } catch (IllegalArgumentException | IOException ignored) {
            return null;
        }
    }

    private String formatDuration(double durationSeconds) {
        int totalSeconds = (int) Math.round(durationSeconds);
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        return String.format(Locale.ROOT, "%02d:%02d", minutes, seconds);
    }

    private ResponseEntity<Resource> documentFileResponse(Long id, String email, boolean download, boolean trackView) {
        DocumentFileResponse file = documentService.getDocumentFile(id, email, download, trackView);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (file.mimeType() != null) {
            try {
                mediaType = MediaType.parseMediaType(file.mimeType());
            } catch (IllegalArgumentException ignored) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }
        }
        ContentDisposition disposition = download
                ? ContentDisposition.attachment().filename(file.fileName(), StandardCharsets.UTF_8).build()
                : ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(file.resource());
    }

    private boolean isAllowedDocumentExtension(String extension) {
        return "pdf".equalsIgnoreCase(extension)
                || "doc".equalsIgnoreCase(extension)
                || "docx".equalsIgnoreCase(extension)
                || "ppt".equalsIgnoreCase(extension)
                || "pptx".equalsIgnoreCase(extension)
                || "xls".equalsIgnoreCase(extension)
                || "xlsx".equalsIgnoreCase(extension)
                || "txt".equalsIgnoreCase(extension);
    }

    private String getExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        return dotIndex > 0 ? fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT) : "";
    }
}
