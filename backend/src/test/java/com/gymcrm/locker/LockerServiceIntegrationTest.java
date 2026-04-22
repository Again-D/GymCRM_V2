package com.gymcrm.locker;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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
                "GENERAL",
                1,
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
                "GENERAL",
                2,
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
                "GENERAL",
                3,
                "STANDARD",
                "AVAILABLE",
                null
        ));
        LockerSlot slot2 = lockerService.createSlot(new LockerService.CreateSlotRequest(
                "GENERAL",
                4,
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

    @Test
    @Transactional
    void createSlotsGeneratesCodesFromZoneAndNumber() {
        String zoneOne = "qa-" + UUID.randomUUID().toString().substring(0, 8);
        String zoneTwo = "qb-" + UUID.randomUUID().toString().substring(0, 8);

        var slots = lockerService.createSlots(List.of(
                new LockerService.CreateSlotRequest(zoneOne, 11, "STANDARD", "AVAILABLE", "first"),
                new LockerService.CreateSlotRequest(zoneTwo, 2, "PREMIUM", null, null)
        ));

        assertEquals(2, slots.size());
        assertEquals(zoneOne.toUpperCase() + "-11", slots.get(0).lockerCode());
        assertEquals(zoneOne.toUpperCase(), slots.get(0).lockerZone());
        assertEquals(zoneTwo.toUpperCase() + "-02", slots.get(1).lockerCode());
        assertEquals("AVAILABLE", slots.get(1).lockerStatus());
    }

    @Test
    @Transactional
    void createSlotsRejectsWholeBatchWhenAnyRowIsInvalid() {
        int beforeCount = lockerService.listSlots(null, null).size();

        assertThrows(ApiException.class, () -> lockerService.createSlots(List.of(
                new LockerService.CreateSlotRequest("general", 10, "STANDARD", "AVAILABLE", null),
                new LockerService.CreateSlotRequest("", 11, "STANDARD", "AVAILABLE", null)
        )));

        assertEquals(beforeCount, lockerService.listSlots(null, null).size());
    }

    private Member createMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberCreateRequest(
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
