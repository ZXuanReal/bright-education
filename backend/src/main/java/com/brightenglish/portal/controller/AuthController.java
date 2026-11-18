package com.brightenglish.portal.controller;

import com.brightenglish.portal.dto.AuthRequest;
import com.brightenglish.portal.dto.AuthResponse;
import com.brightenglish.portal.dto.EmailVerificationRequest;
import com.brightenglish.portal.dto.RegisterRequest;
import com.brightenglish.portal.dto.UserResponse;
import com.brightenglish.portal.service.AuthService;
import com.brightenglish.portal.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/auth/email-verification")
    public ResponseEntity<Map<String, String>> sendRegistrationCode(@Valid @RequestBody EmailVerificationRequest request) {
        Map<String, String> response = authService.sendRegistrationCode(request);
        return ResponseEntity.accepted().body(response);
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(201).body(Map.of("message", "Account created."));
    }

    /**
     * Returns the caller's profile with the role as currently stored in the database.
     * The frontend uses this to resync the UI after an ADMIN grants or revokes permissions.
     */
    @GetMapping("/auth/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        return ResponseEntity.ok(userService.getCurrentUser(authentication.getName()));
    }
}
