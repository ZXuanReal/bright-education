package com.brightenglish.portal.dto;

import com.brightenglish.portal.entity.DocumentPermission;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PermissionGrantRequest {
    @NotBlank
    @Email
    private String email;

    @NotNull
    private DocumentPermission.PermissionType permissionType;
}