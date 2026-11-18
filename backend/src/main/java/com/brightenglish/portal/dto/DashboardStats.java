package com.brightenglish.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardStats {
    private long totalUsers;
    private long totalTeachers;
    private long totalStudents;
    private long totalClasses;
    private long totalPrograms;
    private long totalDocuments;
    private long totalDownloads;
    private long totalViews;
}
