package com.brightenglish.portal.config;

import com.brightenglish.portal.entity.*;
import com.brightenglish.portal.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final ProgramRepository programRepository;
    private final DocumentRepository documentRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.uploadDir}")
    private String uploadDir;

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        User admin;
        if (userRepository.count() == 0) {
            admin = userRepository.save(User.builder()
                    .fullName("Admin Bright")
                    .email("admin@brightenglish.com")
                    .password(passwordEncoder.encode("Admin@123"))
                    .phone("0900000001")
                    .role(Role.ADMIN)
                    .enabled(true)
                    .build());

            User teacher = userRepository.save(User.builder()
                    .fullName("Teacher Bright")
                    .email("teacher@brightenglish.com")
                    .password(passwordEncoder.encode("Teacher@123"))
                    .phone("0900000002")
                    .role(Role.TEACHER)
                    .enabled(true)
                    .build());

            userRepository.save(User.builder()
                    .fullName("Student Bright")
                    .email("student@brightenglish.com")
                    .password(passwordEncoder.encode("Student@123"))
                    .phone("0900000003")
                    .role(Role.STUDENT)
                    .enabled(true)
                    .build());

            Folder textbooks = folderRepository.save(Folder.builder().name("TEXTBOOKS").icon("📚").createdBy(admin).build());
            folderRepository.save(Folder.builder().name("WORKSHEETS").icon("📝").createdBy(admin).build());
            folderRepository.save(Folder.builder().name("AUDIO").icon("🔊").createdBy(admin).build());
            folderRepository.save(Folder.builder().name("VIDEO").icon("🎬").createdBy(admin).build());

            Folder lookStarter = folderRepository.save(Folder.builder().name("LOOK STARTER").parent(textbooks).icon("📁").createdBy(admin).build());
            folderRepository.save(Folder.builder().name("LOOK 1").parent(textbooks).icon("📁").createdBy(admin).build());
            folderRepository.save(Folder.builder().name("UNIT 1").parent(lookStarter).icon("📁").createdBy(teacher).build());
            folderRepository.save(Folder.builder().name("UNIT 2").parent(lookStarter).icon("📁").createdBy(teacher).build());
            folderRepository.save(Folder.builder().name("UNIT 3").parent(lookStarter).icon("📁").createdBy(teacher).build());

            programRepository.save(Program.builder().name("LOOK STARTER").description("Starter course for young learners").level("A1").active(true).build());
            programRepository.save(Program.builder().name("LOOK 1").description("Elementary level course").level("A2").active(true).build());
            programRepository.save(Program.builder().name("LOOK 2").description("Pre-intermediate course").level("B1").active(true).build());
        } else {
            admin = userRepository.findByEmail("admin@brightenglish.com").orElse(null);
        }

        if (admin != null) {
            syncExistingUploadedFiles(admin);
        }
    }

    private void syncExistingUploadedFiles(User defaultUploader) {
        Path docsDir = Paths.get(uploadDir, "documents");
        if (!Files.isDirectory(docsDir)) {
            return;
        }
        try (Stream<Path> paths = Files.list(docsDir)) {
            paths.filter(Files::isRegularFile).forEach(filePath -> {
                String fileNameOnDisk = filePath.getFileName().toString();
                if (fileNameOnDisk.startsWith("upload-staging-")
                        || fileNameOnDisk.contains("bright-api-smoke")
                        || fileNameOnDisk.contains("fullstack-e2e")) {
                    return;
                }
                String fullPath = filePath.toAbsolutePath().normalize().toString();
                if (documentRepository.existsByFilePath(fullPath) || documentRepository.existsByFilePath(filePath.toString())) {
                    return;
                }
                String displayName = fileNameOnDisk;
                int underscoreIdx = fileNameOnDisk.indexOf('_');
                if (underscoreIdx == 36 && fileNameOnDisk.length() > 37) {
                    displayName = fileNameOnDisk.substring(37);
                }
                int dotIdx = displayName.lastIndexOf('.');
                String ext = dotIdx > 0 ? displayName.substring(dotIdx + 1).toLowerCase(Locale.ROOT) : "";
                String mimeType = switch (ext) {
                    case "pdf" -> "application/pdf";
                    case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    case "doc" -> "application/msword";
                    case "mp4" -> "video/mp4";
                    case "webm" -> "video/webm";
                    case "mov" -> "video/quicktime";
                    case "avi" -> "video/x-msvideo";
                    case "mkv" -> "video/x-matroska";
                    default -> "application/octet-stream";
                };
                try {
                    long size = Files.size(filePath);
                    documentRepository.save(Document.builder()
                            .title(displayName)
                            .description("Uploaded document")
                            .fileName(displayName)
                            .filePath(fullPath)
                            .mimeType(mimeType)
                            .extension(ext)
                            .sizeInBytes(size)
                            .uploadedBy(defaultUploader)
                            .status(Document.DocumentStatus.ACTIVE)
                            .deleted(false)
                            .build());
                } catch (IOException ex) {
                    log.warn("Could not sync file {}: {}", filePath, ex.getMessage());
                }
            });
        } catch (IOException ex) {
            log.warn("Could not list documents directory {}: {}", docsDir, ex.getMessage());
        }
    }
}
