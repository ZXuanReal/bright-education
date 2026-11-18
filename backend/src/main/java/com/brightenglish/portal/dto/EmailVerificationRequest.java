package com.brightenglish.portal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EmailVerificationRequest {
    @NotBlank
    @Email
    @Pattern(regexp = "(?i)^[^@\\s]+@gmail\\.com$", message = "Use a Gmail address ending in @gmail.com.")
    @Size(max = 254)
    private String email;
}