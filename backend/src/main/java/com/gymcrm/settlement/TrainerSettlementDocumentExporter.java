package com.gymcrm.settlement;

import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.service.TrainerSettlementDocumentService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class TrainerSettlementDocumentExporter {
    private static final float PAGE_MARGIN = 48f;
    private static final float TITLE_FONT_SIZE = 18f;
    private static final float BODY_FONT_SIZE = 11f;
    private static final float LINE_HEIGHT = 16f;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final List<Path> CANDIDATE_KOREAN_FONT_PATHS = List.of(
            Path.of("/System/Library/Fonts/Supplemental/AppleGothic.ttf"),
            Path.of("/Library/Fonts/AppleGothic.ttf"),
            Path.of("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
            Path.of("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
    );

    public byte[] export(List<TrainerSettlement> settlements) {
        List<TrainerSettlementDocumentService.TrainerSettlementDocument> documents = settlements.stream()
                .map(this::toDocument)
                .toList();
        return exportDocuments(documents);
    }

    public byte[] export(TrainerSettlementDocumentService.TrainerSettlementDocument document) {
        return exportDocuments(List.of(document));
    }

    public byte[] exportDocuments(List<TrainerSettlementDocumentService.TrainerSettlementDocument> documents) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            writePages(document, documents);
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("트레이너 정산 PDF 생성에 실패했습니다.", ex);
        }
    }

    private void writePages(PDDocument document, List<TrainerSettlementDocumentService.TrainerSettlementDocument> documents) throws IOException {
        FontBundle fontBundle = resolveFonts(document);
        List<String> lines = buildLines(documents);
        int lineIndex = 0;

        while (lineIndex < lines.size() || lines.isEmpty()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float y = page.getMediaBox().getUpperRightY() - PAGE_MARGIN;
                float minY = PAGE_MARGIN + LINE_HEIGHT;

                y = writeLine(contentStream, fontBundle.titleFont(), TITLE_FONT_SIZE, y, "Trainer Settlement Statement", fontBundle.sanitizeUnsupportedText());
                y -= 6f;

                if (lines.isEmpty()) {
                    writeLine(contentStream, fontBundle.bodyFont(), BODY_FONT_SIZE, y, "No confirmed trainer settlement rows.", fontBundle.sanitizeUnsupportedText());
                    break;
                }

                while (lineIndex < lines.size() && y >= minY) {
                    y = writeLine(contentStream, fontBundle.bodyFont(), BODY_FONT_SIZE, y, lines.get(lineIndex), fontBundle.sanitizeUnsupportedText());
                    lineIndex += 1;
                }
            }
        }
    }

    private float writeLine(
            PDPageContentStream contentStream,
            PDFont font,
            float fontSize,
            float y,
            String text,
            boolean sanitizeUnsupportedText
    ) throws IOException {
        contentStream.beginText();
        contentStream.setFont(font, fontSize);
        contentStream.newLineAtOffset(PAGE_MARGIN, y);
        contentStream.showText(sanitizeUnsupportedText ? sanitizeText(text) : text);
        contentStream.endText();
        return y - LINE_HEIGHT;
    }

    private List<String> buildLines(List<TrainerSettlementDocumentService.TrainerSettlementDocument> documents) {
        List<String> lines = new ArrayList<>();
        if (documents.isEmpty()) {
            return lines;
        }

        TrainerSettlementDocumentService.TrainerSettlementDocument first = documents.get(0);
        lines.add("Settlement Month: " + first.settlementMonth().getYear() + "-" + String.format("%02d", first.settlementMonth().getMonthValue()));
        lines.add("Settlement Period: " + first.periodStart() + " ~ " + first.periodEnd());
        lines.add("Settlement Status: " + first.settlementStatus());
        lines.add("Confirmed At: " + DATE_TIME_FORMATTER.format(first.confirmedAt()));
        lines.add("Confirmed By: " + first.confirmedBy());
        lines.add("Rows: " + documents.size());
        lines.add("");

        int index = 1;
        for (TrainerSettlementDocumentService.TrainerSettlementDocument settlement : documents) {
            lines.add("Trainer " + index);
            lines.add("Trainer Name: " + settlement.trainerName());
            lines.add("Trainer User ID: " + nullableLong(settlement.trainerUserId()));
            lines.add("PT Completed Classes: " + settlement.pt().lessonCount());
            lines.add("PT Session Unit Price: " + settlement.pt().unitPrice().toPlainString());
            lines.add("PT Amount: " + settlement.pt().amount().toPlainString());
            lines.add("GX Completed Classes: " + settlement.gx().lessonCount());
            lines.add("GX Session Unit Price: " + settlement.gx().unitPrice().toPlainString());
            lines.add("GX Amount: " + settlement.gx().amount().toPlainString());
            lines.add("Bonus Amount: " + settlement.bonusAmount().toPlainString());
            lines.add("Deduction Amount: " + settlement.deductionAmount().toPlainString());
            lines.add("Total Amount: " + settlement.totalAmount().toPlainString());
            lines.add("");
            index += 1;
        }
        return lines;
    }

    private TrainerSettlementDocumentService.TrainerSettlementDocument toDocument(TrainerSettlement settlement) {
        return new TrainerSettlementDocumentService.TrainerSettlementDocument(
                settlement.settlementId(),
                java.time.YearMonth.of(settlement.settlementMonth().getYear(), settlement.settlementMonth().getMonthValue()),
                settlement.settlementMonth().withDayOfMonth(1),
                settlement.settlementMonth().withDayOfMonth(settlement.settlementMonth().lengthOfMonth()),
                settlement.settlementStatus(),
                settlement.confirmedAt(),
                settlement.confirmedBy(),
                settlement.trainerUserId(),
                settlement.trainerName(),
                new TrainerSettlementDocumentService.DocumentLine(
                        Math.toIntExact(settlement.completedClassCount()),
                        settlement.sessionUnitPrice(),
                        settlement.payrollAmount()
                ),
                new TrainerSettlementDocumentService.DocumentLine(0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO),
                java.math.BigDecimal.ZERO,
                java.math.BigDecimal.ZERO,
                settlement.payrollAmount()
        );
    }

    private String nullableLong(Long value) {
        return value == null ? "-" : String.valueOf(value);
    }

    private String sanitizeText(String value) {
        StringBuilder builder = new StringBuilder();
        for (char ch : value.toCharArray()) {
            if (ch >= 32 && ch <= 126) {
                builder.append(ch);
            } else {
                builder.append('?');
            }
        }
        return builder.toString();
    }

    private FontBundle resolveFonts(PDDocument document) throws IOException {
        for (Path path : CANDIDATE_KOREAN_FONT_PATHS) {
            if (!Files.exists(path)) {
                continue;
            }
            try (var inputStream = Files.newInputStream(path)) {
                PDFont font = PDType0Font.load(document, inputStream);
                return new FontBundle(font, font, false);
            } catch (IOException ignored) {
                // Try the next available font candidate before falling back to Helvetica.
            }
        }
        return new FontBundle(
                new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD),
                new PDType1Font(Standard14Fonts.FontName.HELVETICA),
                true
        );
    }

    private record FontBundle(
            PDFont titleFont,
            PDFont bodyFont,
            boolean sanitizeUnsupportedText
    ) {
    }
}
