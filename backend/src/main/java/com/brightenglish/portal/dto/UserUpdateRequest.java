package com.brightenglish.portal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @NotBlank(message = "Full name is required.")
    private String fullName;

    @NotBlank(message = "Email is required.")
    @Email(message = "A valid email address is required.")
    private String email;

    private String phone;

    private String role;
}
