package com.gymcrm.locker;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class LockerServiceIntegrationTest {

    @Autowired
    private LockerService lockerService;

    @Autowired
    private MemberService memberService;

    @Test
    @Transactional
    void createAssignReturnLockerFlowWorks() {
        LockerSlot slot = lockerService.createSlot(new LockerService.CreateSlotRequest(
                "A-" + UUID.randomUUID().toString().substring(0, 6),
                "GENERAL",
                "STANDARD",
                "AVAILABLE",
                null
        ));
        Member member = createMember();

        LockerAssignment assignment = lockerService.assign(new LockerService.AssignRequest(
                slot.lockerSlotId(),
                member.memberId(),
                LocalDate.now(),
                LocalDate.now().plusMonths(1),
                "신규 배정"
        ));

        assertNotNull(assignment.lockerAssignmentId());
        assertEquals("ACTIVE", assignment.assignmentStatus());

        LockerAssignment returned = lockerService.returnAssignment(new LockerService.ReturnRequest(
                assignment.lockerAssignmentId(),
                null,
                new BigDecimal("0"),
                "정상 반납",
                "만기 반납"
        ));

        assertEquals("RETURNED", returned.assignmentStatus());
        assertNotNull(returned.returnedAt());

        LockerSlot refreshed = lockerService.listSlots("AVAILABLE", null).stream()
                .filter(s -> s.lockerSlotId().equals(slot.lockerSlotId()))
                .findFirst()
                .orElseThrow();
        assertEquals("AVAILABLE", refreshed.lockerStatus());
    }

    @Test
    @Transactional
    void cannotAssignAlreadyAssignedLockerSlot() {
        LockerSlot slot = lockerService.createSlot(new LockerService.CreateSlotRequest(
                "B-" + UUID.randomUUID().toString().substring(0, 6),
                "GENERAL",
                "STANDARD",
                "AVAILABLE",
                null
        ));
        Member member1 = createMember();
        Member member2 = createMember();

        lockerService.assign(new LockerService.AssignRequest(
                slot.lockerSlotId(),
                member1.memberId(),
                LocalDate.now(),
                LocalDate.now().plusDays(10),
                null
        ));

        ApiException ex = assertThrows(ApiException.class, () -> lockerService.assign(new LockerService.AssignRequest(
                slot.lockerSlotId(),
                member2.memberId(),
                LocalDate.now(),
                LocalDate.now().plusDays(10),
                null
        )));

        assertEquals(com.gymcrm.common.error.ErrorCode.CONFLICT, ex.getErrorCode());
    }

    @Test
    @Transactional
    void cannotAssignTwoActiveLockersToSameMember() {
        LockerSlot slot1 = lockerService.createSlot(new LockerService.CreateSlotRequest(
                "C1-" + UUID.randomUUID().toString().substring(0, 4),
                "GENERAL",
                "STANDARD",
                "AVAILABLE",
                null
        ));
        LockerSlot slot2 = lockerService.createSlot(new LockerService.CreateSlotRequest(
                "C2-" + UUID.randomUUID().toString().substring(0, 4),
                "GENERAL",
                "STANDARD",
                "AVAILABLE",
                null
        ));
        Member member = createMember();

        lockerService.assign(new LockerService.AssignRequest(
                slot1.lockerSlotId(),
                member.memberId(),
                LocalDate.now(),
                LocalDate.now().plusDays(10),
                null
        ));

        ApiException ex = assertThrows(ApiException.class, () -> lockerService.assign(new LockerService.AssignRequest(
                slot2.lockerSlotId(),
                member.memberId(),
                LocalDate.now(),
                LocalDate.now().plusDays(10),
                null
        )));

        assertEquals(com.gymcrm.common.error.ErrorCode.CONFLICT, ex.getErrorCode());
    }

    private Member createMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "LKR회원-" + suffix,
                "010-7" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                null,
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));
    }
}
