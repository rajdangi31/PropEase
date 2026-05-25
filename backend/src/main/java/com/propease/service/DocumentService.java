package com.propease.service;

import com.propease.dto.response.DocumentResponse;
import com.propease.entity.Document;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;

    public List<DocumentResponse> getDocumentsByTenant(UUID tenantId) {
        return documentRepository.findByTenantId(tenantId).stream()
                .map(this::mapToResponse).toList();
    }

    public DocumentResponse getDocument(UUID id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        return mapToResponse(doc);
    }

    private DocumentResponse mapToResponse(Document doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .name(doc.getName())
                .fileSize(doc.getFileSize())
                .type(doc.getType().name())
                .status(doc.getStatus().name())
                .uploadedBy(doc.getUploadedBy().getFirstName() + " " + doc.getUploadedBy().getLastName())
                .build();
    }
}
