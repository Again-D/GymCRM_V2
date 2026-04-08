package com.gymcrm.settlement;

import com.gymcrm.settlement.entity.TrainerSettlement;
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
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            writePage(document, page, settlements);
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("트레이너 정산 PDF 생성에 실패했습니다.", ex);
        }
    }

    private void writePage(PDDocument document, PDPage page, List<TrainerSettlement> settlements) throws IOException {
        FontBundle fontBundle = resolveFonts(document);
        List<String> lines = buildLines(settlements);

        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float y = page.getMediaBox().getUpperRightY() - PAGE_MARGIN;

            y = writeLine(contentStream, fontBundle.titleFont(), TITLE_FONT_SIZE, y, "Trainer Settlement Statement", fontBundle.sanitizeUnsupportedText());
            y -= 6f;
            for (String line : lines) {
                y = writeLine(contentStream, fontBundle.bodyFont(), BODY_FONT_SIZE, y, line, fontBundle.sanitizeUnsupportedText());
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

    private List<String> buildLines(List<TrainerSettlement> settlements) {
        List<String> lines = new ArrayList<>();
        if (settlements.isEmpty()) {
            lines.add("No confirmed trainer settlement rows.");
            return lines;
        }

        TrainerSettlement first = settlements.get(0);
        lines.add("Settlement Month: " + first.settlementMonth().getYear() + "-" + String.format("%02d", first.settlementMonth().getMonthValue()));
        lines.add("Settlement Status: " + first.settlementStatus());
        lines.add("Confirmed At: " + DATE_TIME_FORMATTER.format(first.confirmedAt()));
        lines.add("Confirmed By: " + first.confirmedBy());
        lines.add("Rows: " + settlements.size());
        lines.add("");

        int index = 1;
        for (TrainerSettlement settlement : settlements) {
            lines.add("Trainer " + index);
            lines.add("Trainer Name: " + settlement.trainerName());
            lines.add("Trainer User ID: " + nullableLong(settlement.trainerUserId()));
            lines.add("Completed Classes: " + settlement.completedClassCount());
            lines.add("Session Unit Price: " + settlement.sessionUnitPrice().toPlainString());
            lines.add("Payroll Amount: " + settlement.payrollAmount().toPlainString());
            lines.add("");
            index += 1;
        }
        return lines;
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
