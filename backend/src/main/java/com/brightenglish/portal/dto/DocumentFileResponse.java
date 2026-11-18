package com.brightenglish.portal.dto;

import org.springframework.core.io.Resource;

public record DocumentFileResponse(Resource resource, String fileName, String mimeType) {
}