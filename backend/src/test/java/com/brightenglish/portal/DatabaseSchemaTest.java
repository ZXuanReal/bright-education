package com.brightenglish.portal;

import com.brightenglish.portal.entity.Role;
import com.brightenglish.portal.entity.User;
import com.brightenglish.portal.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DatabaseSchemaTest {
    @Autowired
    private UserRepository userRepository;

    @Test
    void persistsCustomerAccountWithStudentRole() {
        User customer = userRepository.saveAndFlush(User.builder()
                .fullName("Database Test Student")
                .email("database-test-student@brightenglish.com")
                .password("encoded-password")
                .role(Role.STUDENT)
                .enabled(true)
                .build());

        User storedCustomer = userRepository.findByEmail(customer.getEmail()).orElseThrow();

        assertThat(storedCustomer.getId()).isNotNull();
        assertThat(storedCustomer.getFullName()).isEqualTo("Database Test Student");
        assertThat(storedCustomer.getRole()).isEqualTo(Role.STUDENT);
        assertThat(storedCustomer.isEnabled()).isTrue();
    }
}
