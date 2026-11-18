package com.brightenglish.portal.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation failed", errors);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, "You do not have permission to access this resource", null);
    }

    @ExceptionHandler({DisabledException.class, LockedException.class})
    public ResponseEntity<Map<String, Object>> handleDisabled(AuthenticationException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "This account has been disabled. Please contact an administrator.", null);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        // Generic message: never reveal whether the email exists or which credential was wrong.
        return buildResponse(HttpStatus.UNAUTHORIZED, "Invalid email or password.", null);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), null);
    }

    @ExceptionHandler({
            org.springframework.web.multipart.MultipartException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class
    })
    public ResponseEntity<Map<String, Object>> handleBadRequestParams(Exception ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    @ExceptionHandler(EmailVerificationException.class)
    public ResponseEntity<Map<String, Object>> handleEmailVerification(EmailVerificationException ex) {
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(), null);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", null);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, Object details) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("timestamp", LocalDateTime.now());
        payload.put("status", status.value());
        payload.put("message", message);
        payload.put("details", details);
        return ResponseEntity.status(status).body(payload);
    }
}
