package com.brightenglish.portal.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder.Default;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    @Column(length = 1000)
    private String description;
    private String fileName;
    private String filePath;
    private String mimeType;
    private String extension;
    private long sizeInBytes;
    private String thumbnailPath;
    @Default
    private String storageProvider = "LOCAL";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id")
    private Program program;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Default
    private DocumentStatus status = DocumentStatus.ACTIVE;

    @Default
    private boolean deleted = false;
    private LocalDateTime deletedAt;

    @Default
    private int viewCount = 0;
    @Default
    private int downloadCount = 0;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @Default
    private List<DocumentPermission> permissions = new ArrayList<>();

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @Default
    private List<DownloadLog> downloadLogs = new ArrayList<>();

    public enum DocumentStatus {
        ACTIVE,
        ARCHIVED
    }
}
