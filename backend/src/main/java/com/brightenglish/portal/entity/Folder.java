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
@Table(name = "folders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String icon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Folder parent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "folder")
    @Default
    private List<Document> documents = new ArrayList<>();

    @OneToMany(mappedBy = "parent")
    @Default
    private List<Folder> children = new ArrayList<>();
}
