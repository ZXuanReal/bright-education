package com.brightenglish.portal.service;

import com.brightenglish.portal.dto.DashboardStats;
import com.brightenglish.portal.entity.Document;
import com.brightenglish.portal.entity.Role;
import com.brightenglish.portal.repository.ClassRepository;
import com.brightenglish.portal.repository.DocumentRepository;
import com.brightenglish.portal.repository.ProgramRepository;
import com.brightenglish.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final ClassRepository classRepository;
    private final ProgramRepository programRepository;

    public DashboardStats getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalTeachers = userRepository.countByRole(Role.TEACHER);
        long totalStudents = userRepository.countByRole(Role.STUDENT);

        long totalDocuments = documentRepository.countByDeletedFalse();
        long totalDownloads = documentRepository.sumDownloadsByDeletedFalse();
        long totalViews = documentRepository.sumViewsByDeletedFalse();

        return DashboardStats.builder()
                .totalUsers(totalUsers)
                .totalTeachers(totalTeachers)
                .totalStudents(totalStudents)
                .totalClasses(classRepository.count())
                .totalPrograms(programRepository.count())
                .totalDocuments(totalDocuments)
                .totalDownloads(totalDownloads)
                .totalViews(totalViews)
                .build();
    }
}
