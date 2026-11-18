package com.brightenglish.portal.repository;

import com.brightenglish.portal.entity.Document;
import com.brightenglish.portal.entity.DocumentPermission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByFolderId(Long folderId);

    boolean existsByFilePath(String filePath);

    long countByFolderIdAndDeletedFalse(Long folderId);

    @Query("SELECT d FROM Document d WHERE d.deleted = false AND " +
            "(:folderId IS NULL OR d.folder.id = :folderId) AND " +
            "(:search IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.description) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.fileName) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(d.status = com.brightenglish.portal.entity.Document.DocumentStatus.ACTIVE OR :isAdmin = true OR d.uploadedBy.id = :userId OR EXISTS (SELECT p.id FROM DocumentPermission p WHERE p.document = d AND p.user.id = :userId AND p.permissionType = :permission)) " +
            "ORDER BY d.uploadedAt DESC")
    Page<Document> searchDocuments(@Param("folderId") Long folderId,
                                   @Param("search") String search,
                                   @Param("userId") Long userId,
                                   @Param("isAdmin") boolean isAdmin,
                                   @Param("permission") DocumentPermission.PermissionType permission,
                                   Pageable pageable);

    Long countByDeletedFalse();

    @Query("SELECT COALESCE(SUM(d.downloadCount), 0) FROM Document d WHERE d.deleted = false")
    long sumDownloadsByDeletedFalse();

    @Query("SELECT COALESCE(SUM(d.viewCount), 0) FROM Document d WHERE d.deleted = false")
    long sumViewsByDeletedFalse();
}
