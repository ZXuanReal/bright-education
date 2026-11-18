package com.brightenglish.portal.repository;

import com.brightenglish.portal.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByParentIsNullOrderByNameAsc();
    List<Folder> findByParentIdOrderByNameAsc(Long parentId);
}
