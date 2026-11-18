package com.brightenglish.portal.service;

import com.brightenglish.portal.dto.UserResponse;
import com.brightenglish.portal.dto.UserUpdateRequest;
import com.brightenglish.portal.entity.ActivityLog;
import com.brightenglish.portal.entity.Role;
import com.brightenglish.portal.entity.User;
import com.brightenglish.portal.exception.ResourceNotFoundException;
import com.brightenglish.portal.repository.ActivityLogRepository;
import com.brightenglish.portal.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogRepository activityLogRepository;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public UserResponse getCurrentUser(String email) {
        return toResponse(findByEmail(email));
    }

    @Transactional
    public UserResponse updateUser(Long targetId, UserUpdateRequest request, String actorEmail) {
        if (request == null) {
            throw new IllegalArgumentException("Missing account update payload.");
        }
        User actor = requireAdmin(actorEmail);
        User target = findById(targetId);
        guardNotSelf(actor, target, "You cannot edit your own account from this screen.");

        String fullName = request.getFullName() == null ? target.getFullName() : request.getFullName().trim();
        if (fullName.isBlank()) {
            throw new IllegalArgumentException("Full name is required.");
        }

        String normalizedEmail = request.getEmail() == null ? target.getEmail() : request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (!normalizedEmail.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        if (!target.getEmail().equalsIgnoreCase(normalizedEmail) && userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("User with this email already exists.");
        }

        String phone = request.getPhone() == null || request.getPhone().isBlank() ? null : request.getPhone().trim();
        Role requestedRole = request.getRole() == null || request.getRole().isBlank() ? target.getRole() : parseRole(request.getRole());
        ensureRoleTransitionAllowed(target, requestedRole);

        Role previousRole = target.getRole();
        target.setFullName(fullName);
        target.setEmail(normalizedEmail);
        target.setPhone(phone);
        target.setRole(requestedRole);
        target.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(target);
        audit(actor, "UPDATE_USER", saved.getEmail(), "Profile updated: role " + previousRole + " -> " + saved.getRole());
        return toResponse(saved);
    }

    @Transactional
    public void deleteUser(Long targetId, String actorEmail) {
        User actor = requireAdmin(actorEmail);
        User target = findById(targetId);
        guardNotSelf(actor, target, "You cannot delete your own account.");
        if (target.getRole() == Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new AccessDeniedException("At least one administrator must remain in the system.");
        }

        userRepository.delete(target);
        audit(actor, "DELETE_USER", target.getEmail(), "Deleted account with role " + target.getRole());
    }

    @Transactional
    public UserResponse createUser(String fullName, String email, String password, String phone, String roleValue, String actorEmail) {
        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("Full name is required.");
        }
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (!normalizedEmail.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        if (password == null || password.length() < 8 || password.length() > 72) {
            throw new IllegalArgumentException("Password must be between 8 and 72 characters.");
        }
        Role role = parseRole(roleValue);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("User with this email already exists.");
        }
        User actor = findByEmail(actorEmail);
        User user = User.builder()
                .fullName(fullName.trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .phone(phone == null || phone.isBlank() ? null : phone.trim())
                .role(role)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build();
        User saved = userRepository.save(user);
        audit(actor, "CREATE_USER", saved.getEmail(), "Created account with role " + role);
        return toResponse(saved);
    }

    /**
     * ADMIN-only: promote a STUDENT/USER account to TEACHER.
     */
    @Transactional
    public UserResponse grantTeacher(Long targetId, String actorEmail) {
        User actor = requireAdmin(actorEmail);
        User target = findById(targetId);
        guardNotSelf(actor, target, "You cannot change your own role.");
        if (target.getRole() == Role.ADMIN) {
            throw new AccessDeniedException("Administrator accounts cannot be changed through teacher permission management.");
        }
        if (target.getRole() == Role.TEACHER) {
            throw new IllegalArgumentException(target.getEmail() + " already has the TEACHER role.");
        }
        Role previous = target.getRole();
        target.setRole(Role.TEACHER);
        target.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(target);
        audit(actor, "GRANT_TEACHER", saved.getEmail(), "Role " + previous + " -> TEACHER");
        return toResponse(saved);
    }

    /**
     * ADMIN-only: revoke TEACHER and return the account to STUDENT/USER.
     * Takes effect on the user's next request because authorities are reloaded from the DB per request.
     */
    @Transactional
    public UserResponse revokeTeacher(Long targetId, String actorEmail) {
        User actor = requireAdmin(actorEmail);
        User target = findById(targetId);
        guardNotSelf(actor, target, "You cannot change your own role.");
        if (target.getRole() == Role.ADMIN) {
            throw new AccessDeniedException("Administrator accounts cannot be changed through teacher permission management.");
        }
        if (target.getRole() != Role.TEACHER) {
            throw new IllegalArgumentException(target.getEmail() + " does not have the TEACHER role.");
        }
        target.setRole(Role.STUDENT);
        target.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(target);
        audit(actor, "REVOKE_TEACHER", saved.getEmail(), "Role TEACHER -> STUDENT");
        return toResponse(saved);
    }

    /**
     * ADMIN-only: lock or unlock an account. Locked accounts can neither log in nor use existing tokens.
     */
    @Transactional
    public UserResponse updateStatus(Long targetId, boolean enabled, String actorEmail) {
        User actor = requireAdmin(actorEmail);
        User target = findById(targetId);
        guardNotSelf(actor, target, "You cannot lock or unlock your own account.");
        if (target.getRole() == Role.ADMIN) {
            throw new AccessDeniedException("Administrator accounts are protected and cannot be locked from this screen.");
        }
        if (target.isEnabled() == enabled) {
            return toResponse(target);
        }
        target.setEnabled(enabled);
        target.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(target);
        audit(actor, enabled ? "UNLOCK_USER" : "LOCK_USER", saved.getEmail(), enabled ? "Account unlocked" : "Account locked");
        return toResponse(saved);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    /** Service-level re-check so these operations stay safe even if called from somewhere other than the controller. */
    private User requireAdmin(String actorEmail) {
        User actor = findByEmail(actorEmail);
        if (actor.getRole() != Role.ADMIN || !actor.isEnabled()) {
            throw new AccessDeniedException("Only administrators can manage account permissions.");
        }
        return actor;
    }

    private void guardNotSelf(User actor, User target, String message) {
        if (actor.getId().equals(target.getId())) {
            throw new AccessDeniedException(message);
        }
    }

    private void ensureRoleTransitionAllowed(User target, Role nextRole) {
        if (target.getRole() == Role.ADMIN && nextRole != Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new AccessDeniedException("At least one administrator must remain in the system.");
        }
    }

    private Role parseRole(String roleValue) {
        if (roleValue == null || roleValue.isBlank()) {
            return Role.STUDENT;
        }
        String normalized = roleValue.trim().toUpperCase(Locale.ROOT);
        if ("USER".equals(normalized)) {
            return Role.STUDENT;
        }
        try {
            return Role.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role. Allowed values: ADMIN, TEACHER, STUDENT.");
        }
    }

    private void audit(User actor, String action, String objectName, String details) {
        String ip = null;
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            ip = request.getRemoteAddr();
        }
        activityLogRepository.save(ActivityLog.builder()
                .user(actor)
                .action(action)
                .objectName(truncate(objectName))
                .details(truncate(details + " (by " + actor.getEmail() + ")"))
                .ipAddress(ip)
                .createdAt(LocalDateTime.now())
                .build());
        log.info("AUDIT {} target={} actor={} {}", action, objectName, actor.getEmail(), details);
    }

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() > 255 ? value.substring(0, 255) : value;
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .avatarUrl(user.getAvatarUrl())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
