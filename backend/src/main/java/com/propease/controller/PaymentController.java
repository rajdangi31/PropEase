package com.propease.controller;

import com.propease.dto.request.PaymentRequest;
import com.propease.dto.response.PaymentResponse;
import com.propease.dto.response.PaymentSummaryResponse;
import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import com.propease.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final ProfileRepository profileRepository;

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getAllPayments(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(paymentService.getPaymentsByLandlord(profile.getId()));
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> logPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentRequest request) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.createPayment(request, profile.getId()));
    }

    @GetMapping("/summary")
    public ResponseEntity<PaymentSummaryResponse> getSummary(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(paymentService.getPaymentSummary(profile.getId()));
    }

    @PostMapping("/pay")
    public ResponseEntity<PaymentResponse> makePayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentRequest request) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.makePayment(profile.getId(), request));
    }

    @GetMapping("/my-history")
    public ResponseEntity<List<PaymentResponse>> getMyHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        Profile profile = profileRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(paymentService.getPaymentsByTenant(profile.getId()));
    }
}
