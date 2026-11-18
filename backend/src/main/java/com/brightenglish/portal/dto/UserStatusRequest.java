package com.brightenglish.portal.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserStatusRequest {
    @NotNull
    private Boolean enabled;
}
