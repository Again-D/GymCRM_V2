package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.SalesReceivablesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class SalesReceivablesService {
    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 50;

    private final SalesReceivablesRepository repository;
    private final CurrentUserProvider currentUserProvider;

    public SalesReceivablesService(SalesReceivablesRepository repository, CurrentUserProvider currentUserProvider) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public ReceivablesResult getReceivables(ReceivablesQuery query) {
        LocalDate baseDate = query.baseDate() == null ? LocalDate.now() : query.baseDate();
        int limit = normalizeLimit(query.limit());

        List<SalesReceivablesRepository.SalesReceivableRow> rows = repository.findReceivables(
                new SalesReceivablesRepository.QueryCommand(
                        currentUserProvider.currentCenterId(),
                        baseDate,
                        limit
                )
        );

        BigDecimal totalOutstandingAmount = rows.stream()
                .map(SalesReceivablesRepository.SalesReceivableRow::outstandingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long reminderEligibleCount = rows.stream().filter(SalesReceivablesRepository.SalesReceivableRow::reminderEligible).count();

        return new ReceivablesResult(
                baseDate,
                limit,
                totalOutstandingAmount,
                rows.size(),
                reminderEligibleCount,
                rows.stream().map(ReceivableRow::from).toList()
        );
    }

    private int normalizeLimit(Integer limit) {
        int normalized = limit == null ? DEFAULT_LIMIT : limit;
        if (normalized < 1 || normalized > MAX_LIMIT) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and " + MAX_LIMIT);
        }
        return normalized;
    }

    public record ReceivablesQuery(
            LocalDate baseDate,
            Integer limit
    ) {
    }

    public record ReceivablesResult(
            LocalDate baseDate,
            int limit,
            BigDecimal totalOutstandingAmount,
            long receivableCount,
            long reminderEligibleCount,
            List<ReceivableRow> rows
    ) {
    }

    public record ReceivableRow(
            Long membershipId,
            Long memberId,
            String memberName,
            String productName,
            String productCategory,
            String membershipStatus,
            BigDecimal contractAmount,
            Long paymentId,
            String paymentMethod,
            BigDecimal paidAmount,
            LocalDate paidDate,
            LocalDate followUpDate,
            BigDecimal outstandingAmount,
            boolean reminderEligible,
            String reminderChannel
    ) {
        static ReceivableRow from(SalesReceivablesRepository.SalesReceivableRow row) {
            return new ReceivableRow(
                    row.membershipId(),
                    row.memberId(),
                    row.memberName(),
                    row.productName(),
                    row.productCategory(),
                    row.membershipStatus(),
                    row.contractAmount(),
                    row.paymentId(),
                    row.paymentMethod(),
                    row.paidAmount(),
                    row.paidDate(),
                    row.followUpDate(),
                    row.outstandingAmount(),
                    row.reminderEligible(),
                    row.reminderEligible() ? "CRM" : "REVIEW"
            );
        }
    }
}
