package com.gymcrm.settlement;

import com.gymcrm.settlement.entity.TrainerSettlement;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.StringJoiner;

@Component
public class TrainerSettlementDocumentExporter {
    public String export(List<TrainerSettlement> settlements) {
        StringBuilder csv = new StringBuilder();
        csv.append("settlementMonth,trainerName,trainerUserId,completedClassCount,sessionUnitPrice,payrollAmount,settlementStatus,confirmedAt,confirmedBy\n");
        for (TrainerSettlement settlement : settlements) {
            csv.append(join(
                    settlement.settlementMonth().toString(),
                    settlement.trainerName(),
                    nullable(settlement.trainerUserId()),
                    String.valueOf(settlement.completedClassCount()),
                    settlement.sessionUnitPrice().toPlainString(),
                    settlement.payrollAmount().toPlainString(),
                    settlement.settlementStatus(),
                    settlement.confirmedAt().toString(),
                    String.valueOf(settlement.confirmedBy())
            )).append('\n');
        }
        return csv.toString();
    }

    private String join(String... values) {
        StringJoiner joiner = new StringJoiner(",");
        for (String value : values) {
            joiner.add(escape(value));
        }
        return joiner.toString();
    }

    private String nullable(Long value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String escape(String value) {
        String safe = value == null ? "" : value;
        if (!safe.contains(",") && !safe.contains("\"") && !safe.contains("\n")) {
            return safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
}
