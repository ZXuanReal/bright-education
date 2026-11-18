package com.brightenglish.portal.service;

import com.brightenglish.portal.dto.AuthRequest;
import com.brightenglish.portal.dto.AuthResponse;
import com.brightenglish.portal.dto.EmailVerificationRequest;
import com.brightenglish.portal.dto.RegisterRequest;
import com.brightenglish.portal.dto.UserResponse;
import com.brightenglish.portal.entity.Role;
import com.brightenglish.portal.entity.User;
import com.brightenglish.portal.repository.UserRepository;
import com.brightenglish.portal.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;

    public Map<String, String> sendRegistrationCode(EmailVerificationRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        return emailVerificationService.sendCode(email);
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        if (!emailVerificationService.verifyCode(email, request.getCode())) {
            throw new IllegalArgumentException("The verification code is invalid or expired.");
        }

        // SECURITY: public registration ALWAYS creates a STUDENT (regular user) account.
        // RegisterRequest has no role field, and any "role" sent by the client is ignored.
        // Only an ADMIN can later grant TEACHER via /api/users/{id}/grant-teacher.
        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.STUDENT)
                .enabled(true)
                .build();
        User savedUser = userRepository.save(user);

        return UserResponse.builder()
                .id(savedUser.getId())
                .fullName(savedUser.getFullName())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .enabled(savedUser.isEnabled())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }

    public AuthResponse login(AuthRequest request) {
        String email = normalizeEmail(request.getEmail());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        String token = jwtService.generateToken(authentication);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
