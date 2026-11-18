package com.brightenglish.portal.dto;

import com.brightenglish.portal.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private String avatarUrl;
    private boolean enabled;
    private LocalDateTime createdAt;
}
