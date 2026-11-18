package com.brightenglish.portal.controller;

import com.brightenglish.portal.dto.FolderResponse;
import com.brightenglish.portal.service.FolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FolderController {
    private final FolderService folderService;

    @GetMapping("/folders")
    public ResponseEntity<List<FolderResponse>> getFolders(@RequestParam(required = false) Long parentId) {
        if (parentId != null) {
            return ResponseEntity.ok(folderService.getChildren(parentId));
        }
        return ResponseEntity.ok(folderService.getRootFolders());
    }

    @PostMapping("/folders")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<FolderResponse> createFolder(@RequestParam String name,
                                                     @RequestParam(required = false) String description,
                                                     @RequestParam(required = false) Long parentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return ResponseEntity.ok(folderService.createFolder(name, description, parentId, email));
    }
}
