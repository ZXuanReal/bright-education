package com.brightenglish.portal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FolderResponse {
    private Long id;
    private String name;
    private String description;
    private Long parentId;
    private String parentName;
    private String createdBy;
    private LocalDateTime createdAt;
    private Long documentCount;
}
