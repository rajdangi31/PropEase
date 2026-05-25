package com.propease.service;

import com.propease.dto.request.MaintenanceLogRequest;
import com.propease.dto.request.MaintenanceRequestDto;
import com.propease.dto.response.MaintenanceRequestResponse;
import com.propease.entity.*;
import com.propease.enums.Priority;
import com.propease.enums.RequestStatus;
import com.propease.exception.ResourceNotFoundException;
import com.propease.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final MaintenanceRequestRepository requestRepository;
    private final MaintenanceLogRepository logRepository;
    private final UnitRepository unitRepository;
    private final ProfileRepository profileRepository;

    public List<MaintenanceRequestResponse> getAllRequests() {
        return requestRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    public List<MaintenanceRequestResponse> getRequestsByLandlord(UUID landlordId) {
        return requestRepository.findByUnit_Property_LandlordId(landlordId).stream()
                .map(this::mapToResponse).toList();
    }

    public List<MaintenanceRequestResponse> getRequestsByTenant(UUID tenantId) {
        return requestRepository.findByTenantId(tenantId).stream().map(this::mapToResponse).toList();
    }

    public MaintenanceRequestResponse getRequest(UUID id) {
        MaintenanceRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + id));
        return mapToResponse(request);
    }

    public MaintenanceRequestResponse createRequest(UUID tenantId, MaintenanceRequestDto dto) {
        Profile tenant = profileRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

        Unit unit;
        if (dto.getUnitId() != null) {
            unit = unitRepository.findById(dto.getUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        } else {
            // Find tenant's unit from active lease
            throw new ResourceNotFoundException("Unit ID is required");
        }

        MaintenanceRequest request = MaintenanceRequest.builder()
                .unit(unit)
                .tenant(tenant)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .priority(dto.getPriority() != null ? Priority.valueOf(dto.getPriority().toUpperCase()) : Priority.MEDIUM)
                .status(RequestStatus.OPEN)
                .build();

        if (dto.getAssignedWorkerId() != null) {
            Profile worker = profileRepository.findById(dto.getAssignedWorkerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
            request.setAssignedWorker(worker);
        }

        return mapToResponse(requestRepository.save(request));
    }

    public MaintenanceRequestResponse updateRequest(UUID id, MaintenanceRequestDto dto) {
        MaintenanceRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + id));

        if (dto.getTitle() != null) request.setTitle(dto.getTitle());
        if (dto.getDescription() != null) request.setDescription(dto.getDescription());
        if (dto.getCategory() != null) request.setCategory(dto.getCategory());
        if (dto.getPriority() != null) request.setPriority(Priority.valueOf(dto.getPriority().toUpperCase()));

        if (dto.getAssignedWorkerId() != null) {
            Profile worker = profileRepository.findById(dto.getAssignedWorkerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
            request.setAssignedWorker(worker);
        }

        return mapToResponse(requestRepository.save(request));
    }

    public MaintenanceRequestResponse updateStatus(UUID id, String status) {
        MaintenanceRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + id));
        request.setStatus(RequestStatus.valueOf(status.toUpperCase()));
        return mapToResponse(requestRepository.save(request));
    }

    public MaintenanceRequestResponse addLog(UUID requestId, UUID authorId, MaintenanceLogRequest logRequest) {
        MaintenanceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));
        Profile author = profileRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found"));

        MaintenanceLog log = MaintenanceLog.builder()
                .request(request)
                .author(author)
                .content(logRequest.getContent())
                .isInternal(logRequest.getIsInternal() != null ? logRequest.getIsInternal() : false)
                .build();

        logRepository.save(log);
        return mapToResponse(requestRepository.findById(requestId).get());
    }

    private MaintenanceRequestResponse mapToResponse(MaintenanceRequest request) {
        List<MaintenanceRequestResponse.LogEntry> logs = logRepository
                .findByRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                .map(log -> MaintenanceRequestResponse.LogEntry.builder()
                        .id(log.getId())
                        .author(log.getAuthor().getFirstName() + " " + log.getAuthor().getLastName())
                        .content(log.getContent())
                        .isInternal(log.getIsInternal())
                        .createdAt(log.getCreatedAt())
                        .build())
                .toList();

        String unitLabel = request.getUnit().getProperty().getName() + " · " + request.getUnit().getUnitNumber();
        String tenantName = request.getTenant().getFirstName() + " " + request.getTenant().getLastName();
        String assigned = request.getAssignedWorker() != null
                ? request.getAssignedWorker().getFirstName() + " " + request.getAssignedWorker().getLastName()
                : null;

        return MaintenanceRequestResponse.builder()
                .id(request.getId())
                .title(request.getTitle())
                .description(request.getDescription())
                .unit(unitLabel)
                .tenant(tenantName)
                .category(request.getCategory())
                .priority(request.getPriority().name())
                .status(request.getStatus().name())
                .assigned(assigned)
                .createdAt(request.getCreatedAt())
                .logs(logs)
                .build();
    }
}
