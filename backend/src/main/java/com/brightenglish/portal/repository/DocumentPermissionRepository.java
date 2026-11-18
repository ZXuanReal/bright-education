package com.brightenglish.portal.repository;

import com.brightenglish.portal.entity.DocumentPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, Long> {
    boolean existsByDocument_IdAndUser_IdAndPermissionType(Long documentId, Long userId, DocumentPermission.PermissionType permissionType);

    Optional<DocumentPermission> findByDocument_IdAndUser_IdAndPermissionType(Long documentId, Long userId, DocumentPermission.PermissionType permissionType);
}