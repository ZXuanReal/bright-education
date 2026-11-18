package com.brightenglish.portal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentResponse {
    private Long id;
    private String title;
    private String description;
    private String fileName;
    private String mimeType;
    private String extension;
    private long sizeInBytes;
    private Double durationSeconds;
    private String thumbnailUrl;
    private Long folderId;
    private String folderName;
    private Long programId;
    private String programName;
    private String uploadedByName;
    private LocalDateTime uploadedAt;
    private Integer viewCount;
    private Integer downloadCount;
    private String status;
}
