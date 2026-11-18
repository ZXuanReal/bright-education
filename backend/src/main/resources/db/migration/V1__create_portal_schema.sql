CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    phone VARCHAR(255),
    role VARCHAR(255),
    avatar_url VARCHAR(255),
    enabled BIT NOT NULL,
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    INDEX idx_users_role (role)
);

CREATE TABLE IF NOT EXISTS programs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    description VARCHAR(255),
    level VARCHAR(255),
    thumbnail_url VARCHAR(255),
    active BIT NOT NULL,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_programs_active (active)
);

CREATE TABLE IF NOT EXISTS folders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    description VARCHAR(255),
    icon VARCHAR(255),
    parent_id BIGINT,
    created_by_id BIGINT,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_folders_parent (parent_id),
    CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id) REFERENCES folders (id),
    CONSTRAINT fk_folders_created_by FOREIGN KEY (created_by_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS documents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255),
    description VARCHAR(1000),
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    mime_type VARCHAR(255),
    extension VARCHAR(255),
    size_in_bytes BIGINT NOT NULL,
    thumbnail_path VARCHAR(255),
    storage_provider VARCHAR(255),
    folder_id BIGINT,
    program_id BIGINT,
    uploaded_by_id BIGINT,
    uploaded_at DATETIME(6),
    updated_at DATETIME(6),
    status VARCHAR(255),
    deleted BIT NOT NULL,
    deleted_at DATETIME(6),
    view_count INT NOT NULL,
    download_count INT NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_documents_folder_deleted (folder_id, deleted),
    INDEX idx_documents_program (program_id),
    INDEX idx_documents_uploaded_by (uploaded_by_id),
    INDEX idx_documents_uploaded_at (uploaded_at),
    CONSTRAINT fk_documents_folder FOREIGN KEY (folder_id) REFERENCES folders (id),
    CONSTRAINT fk_documents_program FOREIGN KEY (program_id) REFERENCES programs (id),
    CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS document_permissions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    document_id BIGINT,
    user_id BIGINT,
    permission_type VARCHAR(255),
    PRIMARY KEY (id),
    INDEX idx_document_permissions_document_user (document_id, user_id),
    INDEX idx_document_permissions_user_type (user_id, permission_type),
    CONSTRAINT fk_document_permissions_document FOREIGN KEY (document_id) REFERENCES documents (id),
    CONSTRAINT fk_document_permissions_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS download_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    document_id BIGINT,
    user_id BIGINT,
    downloaded_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_download_logs_document (document_id),
    INDEX idx_download_logs_user_date (user_id, downloaded_at),
    CONSTRAINT fk_download_logs_document FOREIGN KEY (document_id) REFERENCES documents (id),
    CONSTRAINT fk_download_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT,
    action VARCHAR(255),
    object_name VARCHAR(255),
    details VARCHAR(255),
    ip_address VARCHAR(255),
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_activity_logs_user_date (user_id, created_at),
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT,
    title VARCHAR(255),
    message VARCHAR(255),
    `read` BIT NOT NULL,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_notifications_user_read_date (user_id, `read`, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS classes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    code VARCHAR(255),
    teacher_name VARCHAR(255),
    schedule VARCHAR(255),
    room VARCHAR(255),
    level VARCHAR(255),
    active BIT NOT NULL,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_classes_code (code)
);

CREATE TABLE IF NOT EXISTS class_students (
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    PRIMARY KEY (class_id, student_id),
    INDEX idx_class_students_student (student_id),
    CONSTRAINT fk_class_students_class FOREIGN KEY (class_id) REFERENCES classes (id),
    CONSTRAINT fk_class_students_user FOREIGN KEY (student_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS class_teachers (
    class_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    PRIMARY KEY (class_id, teacher_id),
    INDEX idx_class_teachers_teacher (teacher_id),
    CONSTRAINT fk_class_teachers_class FOREIGN KEY (class_id) REFERENCES classes (id),
    CONSTRAINT fk_class_teachers_user FOREIGN KEY (teacher_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS courses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255),
    description VARCHAR(255),
    program_id BIGINT,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_courses_program (program_id),
    CONSTRAINT fk_courses_program FOREIGN KEY (program_id) REFERENCES programs (id)
);

CREATE TABLE IF NOT EXISTS lessons (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255),
    description VARCHAR(255),
    video_url VARCHAR(255),
    audio_url VARCHAR(255),
    pdf_url VARCHAR(255),
    worksheet_url VARCHAR(255),
    homework_url VARCHAR(255),
    course_id BIGINT,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_lessons_course (course_id),
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses (id)
);
