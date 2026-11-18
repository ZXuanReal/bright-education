package com.brightenglish.portal.controller;

import com.brightenglish.portal.dto.UserResponse;
import com.brightenglish.portal.dto.UserStatusRequest;
import com.brightenglish.portal.dto.UserUpdateRequest;
import com.brightenglish.portal.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Account management API. Every endpoint is ADMIN-only (enforced here, at the URL layer in SecurityConfig,
 * and re-checked inside UserService).
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@RequestParam String fullName,
                                                  @RequestParam String email,
                                                  @RequestParam String password,
                                                  @RequestParam(required = false) String phone,
                                                  @RequestParam(required = false) String role,
                                                  Authentication authentication) {
        return ResponseEntity.ok(userService.createUser(fullName, email, password, phone, role, authentication.getName()));
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                 @Valid @RequestBody UserUpdateRequest request,
                                                 Authentication authentication) {
        return ResponseEntity.ok(userService.updateUser(id, request, authentication.getName()));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id, Authentication authentication) {
        userService.deleteUser(id, authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Account deleted."));
    }

    @PatchMapping("/users/{id}/grant-teacher")
    public ResponseEntity<UserResponse> grantTeacher(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(userService.grantTeacher(id, authentication.getName()));
    }

    @PatchMapping("/users/{id}/revoke-teacher")
    public ResponseEntity<UserResponse> revokeTeacher(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(userService.revokeTeacher(id, authentication.getName()));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> updateStatus(@PathVariable Long id,
                                                     @Valid @RequestBody UserStatusRequest request,
                                                     Authentication authentication) {
        return ResponseEntity.ok(userService.updateStatus(id, request.getEnabled(), authentication.getName()));
    }
}
