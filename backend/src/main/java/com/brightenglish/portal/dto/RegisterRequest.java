package com.brightenglish.portal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    @Size(max = 100)
    private String fullName;

    @NotBlank
    @Email
    @Pattern(regexp = "(?i)^[^@\\s]+@gmail\\.com$", message = "Use a Gmail address ending in @gmail.com.")
    @Size(max = 254)
    private String email;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @NotBlank
    @Pattern(regexp = "\\d{4,10}")
    private String code;
}