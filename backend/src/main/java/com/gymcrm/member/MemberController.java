package com.gymcrm.member;

import com.gymcrm.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
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

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public ApiResponse<MemberResponse> create(@Valid @RequestBody CreateMemberRequest request) {
        Member member = memberService.create(new MemberService.MemberCreateRequest(
                request.memberName(),
                request.phone(),
                request.email(),
                request.gender(),
                request.birthDate(),
                request.memberStatus(),
                request.joinDate(),
                request.consentSms(),
                request.consentMarketing(),
                request.memo()
        ));
        return ApiResponse.success(MemberResponse.from(member), "회원이 등록되었습니다.");
    }

    @GetMapping
    public ApiResponse<List<MemberSummaryResponse>> list(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone
    ) {
        List<MemberSummaryResponse> items = memberService.list(name, phone).stream()
                .map(MemberSummaryResponse::from)
                .toList();
        return ApiResponse.success(items, "회원 목록 조회 성공");
    }

    @GetMapping("/{memberId}")
    public ApiResponse<MemberResponse> detail(@PathVariable Long memberId) {
        return ApiResponse.success(MemberResponse.from(memberService.get(memberId)), "회원 상세 조회 성공");
    }

    @PatchMapping("/{memberId}")
    public ApiResponse<MemberResponse> update(
            @PathVariable Long memberId,
            @Valid @RequestBody UpdateMemberRequest request
    ) {
        Member member = memberService.update(memberId, new MemberService.MemberUpdateRequest(
                request.memberName(),
                request.phone(),
                request.email(),
                request.gender(),
                request.birthDate(),
                request.memberStatus(),
                request.joinDate(),
                request.consentSms(),
                request.consentMarketing(),
                request.memo()
        ));
        return ApiResponse.success(MemberResponse.from(member), "회원 정보가 수정되었습니다.");
    }

    public record CreateMemberRequest(
            @NotBlank(message = "memberName is required")
            String memberName,
            @NotBlank(message = "phone is required")
            String phone,
            String email,
            @Pattern(regexp = "^(?i)(MALE|FEMALE|OTHER)?$", message = "gender must be MALE, FEMALE, or OTHER")
            String gender,
            LocalDate birthDate,
            @NotBlank(message = "memberStatus is required")
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)$", message = "memberStatus must be ACTIVE or INACTIVE")
            String memberStatus,
            LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo
    ) {}

    public record UpdateMemberRequest(
            String memberName,
            String phone,
            String email,
            @Pattern(regexp = "^(?i)(MALE|FEMALE|OTHER)?$", message = "gender must be MALE, FEMALE, or OTHER")
            String gender,
            LocalDate birthDate,
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)?$", message = "memberStatus must be ACTIVE or INACTIVE")
            String memberStatus,
            LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo
    ) {}

    public record MemberSummaryResponse(
            Long memberId,
            Long centerId,
            String memberName,
            String phone,
            String memberStatus,
            LocalDate joinDate
    ) {
        static MemberSummaryResponse from(Member member) {
            return new MemberSummaryResponse(
                    member.memberId(),
                    member.centerId(),
                    member.memberName(),
                    member.phone(),
                    member.memberStatus(),
                    member.joinDate()
            );
        }
    }

    public record MemberResponse(
            Long memberId,
            Long centerId,
            String memberName,
            String phone,
            String email,
            String gender,
            LocalDate birthDate,
            String memberStatus,
            LocalDate joinDate,
            boolean consentSms,
            boolean consentMarketing,
            String memo
    ) {
        static MemberResponse from(Member member) {
            return new MemberResponse(
                    member.memberId(),
                    member.centerId(),
                    member.memberName(),
                    member.phone(),
                    member.email(),
                    member.gender(),
                    member.birthDate(),
                    member.memberStatus(),
                    member.joinDate(),
                    member.consentSms(),
                    member.consentMarketing(),
                    member.memo()
            );
        }
    }
}
