package com.gymcrm.member.controller;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.dto.request.MemberUpdateRequest;
import com.gymcrm.member.dto.response.MemberDetailResponse;
import com.gymcrm.member.dto.response.MemberSummaryResponse;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/members")
public class MemberController {
    private final MemberService memberService;
    private final AuditLogService auditLogService;

    public MemberController(MemberService memberService, AuditLogService auditLogService) {
        this.memberService = memberService;
        this.auditLogService = auditLogService;
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<MemberDetailResponse> create(@Valid @RequestBody MemberCreateRequest request) {
        Member member = memberService.create(request);
        return ApiResponse.success(MemberDetailResponse.from(member), "회원이 등록되었습니다.");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<List<MemberSummaryResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String memberCode,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @Pattern(regexp = "^\\s*(?i:(ACTIVE|INACTIVE)?)\\s*$", message = "memberStatus must be ACTIVE or INACTIVE")
            @RequestParam(required = false) String memberStatus,
            @RequestParam(required = false) Long trainerId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String membershipOperationalStatus,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo
    ) {
        List<MemberSummaryResponse> items = memberService.list(
                        keyword,
                        memberCode,
                        name,
                        phone,
                        memberStatus,
                        trainerId,
                        productId,
                        membershipOperationalStatus,
                        dateFrom,
                        dateTo
                ).stream()
                .map(MemberSummaryResponse::from)
                .toList();
        return ApiResponse.success(items, "회원 목록 조회 성공");
    }

    @GetMapping("/{memberId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<MemberDetailResponse> detail(@PathVariable Long memberId) {
        Member member = memberService.get(memberId);
        auditLogService.recordPiiRead(
                "MEMBER",
                String.valueOf(memberId),
                "{\"fields\":[\"phone\",\"birthDate\"]}"
        );
        return ApiResponse.success(MemberDetailResponse.from(member), "회원 상세 조회 성공");
    }

    @PatchMapping("/{memberId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<MemberDetailResponse> update(
            @PathVariable Long memberId,
            @Valid @RequestBody MemberUpdateRequest request
    ) {
        Member member = memberService.update(memberId, request);
        return ApiResponse.success(MemberDetailResponse.from(member), "회원 정보가 수정되었습니다.");
    }

    @DeleteMapping("/{memberId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<Void> delete(@PathVariable Long memberId) {
        memberService.delete(memberId);
        return ApiResponse.success(null, "회원이 삭제되었습니다.");
    }
}
