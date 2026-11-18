package com.brightenglish.portal.service;

import com.brightenglish.portal.exception.EmailVerificationException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final JavaMailSender mailSender;
    private final RestClient restClient = RestClient.create();
    private final ConcurrentHashMap<String, VerificationEntry> verificationCodes = new ConcurrentHashMap<>();
    private static final int VERIFICATION_CODE_TTL_MINUTES = 10;

    @Value("${app.twilio.accountSid:}")
    private String accountSid;

    @Value("${app.twilio.authToken:}")
    private String authToken;

    @Value("${app.twilio.verifyServiceSid:}")
    private String verifyServiceSid;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    public Map<String, String> sendCode(String email) {
        String normalizedEmail = normalizeEmail(email);

        if (isSmtpConfigured()) {
            String verificationCode = generateCode();
            verificationCodes.put(normalizedEmail, new VerificationEntry(verificationCode, Instant.now().plus(VERIFICATION_CODE_TTL_MINUTES, ChronoUnit.MINUTES)));

            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(smtpUsername);
                message.setTo(normalizedEmail);
                message.setSubject("Bright English - Email verification");
                message.setText("Your verification code is " + verificationCode + ". It expires in 10 minutes.");
                mailSender.send(message);
                return Map.of("message", "Verification code sent.");
            } catch (MailException exception) {
                verificationCodes.remove(normalizedEmail);
                throw new EmailVerificationException("Could not send the email verification code.", exception);
            }
        }

        if (isTwilioConfigured()) {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("To", normalizedEmail);
            form.add("Channel", "email");

            try {
                restClient.post()
                        .uri(serviceUrl() + "/Verifications")
                        .headers(headers -> headers.setBasicAuth(accountSid, authToken))
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(form)
                        .retrieve()
                        .body(JsonNode.class);
                return Map.of("message", "Verification code sent.");
            } catch (RestClientException exception) {
                throw new EmailVerificationException("Could not send the email verification code.", exception);
            }
        }

        String fallbackCode = generateCode();
        verificationCodes.put(normalizedEmail, new VerificationEntry(fallbackCode, Instant.now().plus(VERIFICATION_CODE_TTL_MINUTES, ChronoUnit.MINUTES)));
        return Map.of(
                "message", "Development verification code generated.",
                "code", fallbackCode
        );
    }

    public boolean verifyCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);

        if (isSmtpConfigured()) {
            return verifyLocalCode(normalizedEmail, code);
        }

        if (isTwilioConfigured()) {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("To", normalizedEmail);
            form.add("Code", code);

            try {
                JsonNode response = restClient.post()
                        .uri(serviceUrl() + "/VerificationCheck")
                        .headers(headers -> headers.setBasicAuth(accountSid, authToken))
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(form)
                        .retrieve()
                        .body(JsonNode.class);
                return response != null && "approved".equals(response.path("status").asText());
            } catch (RestClientException exception) {
                throw new EmailVerificationException("Could not verify the email code.", exception);
            }
        }

        return verifyLocalCode(normalizedEmail, code);
    }

    private boolean verifyLocalCode(String email, String code) {
        VerificationEntry entry = verificationCodes.get(email);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            verificationCodes.remove(email);
            return false;
        }

        boolean matches = entry.code().equals(code);
        if (matches) {
            verificationCodes.remove(email);
        }
        return matches;
    }

    private boolean isSmtpConfigured() {
        return !smtpHost.isBlank() && !smtpUsername.isBlank() && !smtpPassword.isBlank();
    }

    private boolean isTwilioConfigured() {
        return !accountSid.isBlank() && !authToken.isBlank() && !verifyServiceSid.isBlank();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateCode() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(1000000));
    }

    private String serviceUrl() {
        return "https://verify.twilio.com/v2/Services/" + verifyServiceSid;
    }

    private record VerificationEntry(String code, Instant expiresAt) {
    }
}