package com.brightenglish.portal.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "programs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Program {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String level;
    private String thumbnailUrl;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "program", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Course> courses = new ArrayList<>();

    @OneToMany(mappedBy = "program")
    private List<Document> documents = new ArrayList<>();
}
