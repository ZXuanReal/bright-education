package com.brightenglish.portal.service;

import com.brightenglish.portal.dto.FolderResponse;
import com.brightenglish.portal.entity.Folder;
import com.brightenglish.portal.entity.User;
import com.brightenglish.portal.repository.FolderRepository;
import com.brightenglish.portal.repository.DocumentRepository;
import com.brightenglish.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderService {
    private final FolderRepository folderRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    public List<FolderResponse> getRootFolders() {
        return folderRepository.findByParentIsNullOrderByNameAsc().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<FolderResponse> getChildren(Long parentId) {
        return folderRepository.findByParentIdOrderByNameAsc(parentId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public FolderResponse createFolder(String name, String description, Long parentId, String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found."));
        Folder parent = parentId == null ? null : folderRepository.findById(parentId).orElseThrow(() -> new RuntimeException("Parent folder not found."));

        Folder folder = Folder.builder()
                .name(name)
                .description(description)
                .icon("📁")
                .parent(parent)
                .createdBy(user)
                .build();

        return toResponse(folderRepository.save(folder));
    }

    public FolderResponse toResponse(Folder folder) {
        return FolderResponse.builder()
                .id(folder.getId())
                .name(folder.getName())
                .description(folder.getDescription())
                .parentId(folder.getParent() != null ? folder.getParent().getId() : null)
                .parentName(folder.getParent() != null ? folder.getParent().getName() : null)
                .createdBy(folder.getCreatedBy() != null ? folder.getCreatedBy().getFullName() : "System")
                .createdAt(folder.getCreatedAt())
                .documentCount(documentRepository.countByFolderIdAndDeletedFalse(folder.getId()))
                .build();
    }
}
