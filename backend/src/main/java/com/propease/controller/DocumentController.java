package com.propease.controller;

import com.propease.dto.response.DocumentResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final ProfileRepository profileRepository;

    @GetMapping("/my-documents")
    public ResponseEntity<List<DocumentResponse>> getMyDocuments(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(documentService.getDocumentsByTenant(profile.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getDocument(id));
    }
}
