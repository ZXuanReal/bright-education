package com.brightenglish.portal.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long userId;
    private String fullName;
    private String email;
    private String role;
}
