package com.OnlineBusBooking.OnlineBus.util;
import com.OnlineBusBooking.OnlineBus.model.Booking;
import com.OnlineBusBooking.OnlineBus.model.Bus;
import com.OnlineBusBooking.OnlineBus.model.Staff;
import com.OnlineBusBooking.OnlineBus.model.TripSchedule;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.WebColors;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.pdf.canvas.draw.DashedLine;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.kernel.geom.Rectangle;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class TicketPDFGenerator {
    public static byte[] generateTicketPDF(List<Booking> bookings, Bus bus, TripSchedule schedule, Staff staff) throws Exception {
        if (bookings == null || bookings.isEmpty()) {
            throw new IllegalArgumentException("No bookings provided");
        }
        Booking first = bookings.get(0);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc);

        // Set document margins
        doc.setMargins(30, 30, 30, 30);
        System.out.println("✅ Starting PDF generation...");

        // Try loading logo
        try (InputStream logoStream = TicketPDFGenerator.class.getResourceAsStream("/static/logo.png")) {
            if (logoStream != null && logoStream.available() > 0) {
                Image logo = new Image(ImageDataFactory.create(logoStream.readAllBytes()));
                logo.scaleToFit(80, 80);
                logo.setHorizontalAlignment(HorizontalAlignment.CENTER);
                doc.add(logo);
            } else {
                System.out.println("⚠️ Logo not found or empty.");
            }
        } catch (Exception e) {
            System.out.println("⚠️ Failed to load logo: " + e.getMessage());
        }

        // Title with decorative line
        doc.add(new Paragraph("🚌 BUS TICKET")
                .setFontSize(24)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(WebColors.getRGBColor("#1a5276")));

        // Add decorative line
        doc.add(new LineSeparator(new DashedLine()).setMarginTop(-10).setMarginBottom(15));

        // Ticket ID - Unique for each booking
        String ticketId = "TKT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        doc.add(new Paragraph("Ticket ID: " + ticketId)
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(WebColors.getRGBColor("#566573")));

        String source = Optional.ofNullable(bus.getSource()).orElse(first.getPassengerFrom());
        String destination = Optional.ofNullable(bus.getDestination()).orElse(first.getPassengerTo());
        String route = source + " → " + destination;

        // Trip Info with enhanced styling
        doc.add(new Paragraph("\n📍 TRIP INFORMATION").setBold().setFontSize(14).setFontColor(WebColors.getRGBColor("#2980b9")));
        Table tripTable = new Table(UnitValue.createPercentArray(new float[]{1, 2})).useAllAvailableWidth().setMarginTop(5);
        tripTable.setBackgroundColor(WebColors.getRGBColor("#ecf0f1"));

        // FIX: Remove border radius - use simple border instead
        tripTable.setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 1));

        tripTable.addCell(getStyledCell("Operator:", true));
        tripTable.addCell(getStyledCell(Optional.ofNullable(bus.getOperatorName()).orElse("N/A"), false));
        tripTable.addCell(getStyledCell("Route:", true));
        tripTable.addCell(getStyledCell(route, false).setBold()); // Bold route info
        tripTable.addCell(getStyledCell("Departure:", true));
        tripTable.addCell(getStyledCell(Optional.ofNullable(schedule.getDepartureTime()).orElse("N/A"), false));
        tripTable.addCell(getStyledCell("Arrival:", true));
        tripTable.addCell(getStyledCell(Optional.ofNullable(schedule.getArrivalTime()).orElse("N/A"), false));
        tripTable.addCell(getStyledCell("Travel Date:", true));
        tripTable.addCell(getStyledCell(Optional.ofNullable(first.getTravelDate()).orElse("N/A"), false).setBold()); // Bold travel date

        // FIX: Using getBookingDate() if it exists, otherwise fallback to travelDate
        String bookingDate = null;
        try {
            bookingDate = first.getBookingDate();
        } catch (NoSuchMethodError e) {
            bookingDate = first.getTravelDate(); // Fallback if method doesn't exist
        }
        tripTable.addCell(getStyledCell("Booking Date:", true));
        tripTable.addCell(getStyledCell(Optional.ofNullable(bookingDate).orElse("N/A"), false));
        doc.add(tripTable);

        // Passenger Info
        doc.add(new Paragraph("\n👤 PASSENGER INFORMATION").setBold().setFontSize(14).setFontColor(WebColors.getRGBColor("#2980b9")));
        Table passengerTable = new Table(UnitValue.createPercentArray(new float[]{1, 2, 1, 1})).useAllAvailableWidth();
        passengerTable.setBackgroundColor(WebColors.getRGBColor("#ecf0f1"));

        // FIX: Remove border radius - use simple border instead
        passengerTable.setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 1));

        passengerTable.addHeaderCell(getHeaderCell("Name"));
        passengerTable.addHeaderCell(getHeaderCell("Email"));
        passengerTable.addHeaderCell(getHeaderCell("Age"));
        passengerTable.addHeaderCell(getHeaderCell("Mobile"));

        for (Booking b : bookings) {
            passengerTable.addCell(getStyledCell(Optional.ofNullable(b.getPassengerName()).orElse("N/A"), false));
            passengerTable.addCell(getStyledCell(Optional.ofNullable(b.getCustomerEmail()).orElse("N/A"), false));
            passengerTable.addCell(getStyledCell(b.getPassengerAge() > 0 ? String.valueOf(b.getPassengerAge()) : "N/A", false));
            passengerTable.addCell(getStyledCell(Optional.ofNullable(b.getPassengerMobile()).orElse("N/A"), false));
        }
        doc.add(passengerTable);

        // Booked Seats
        doc.add(new Paragraph("\n💺 BOOKED SEATS").setBold().setFontSize(14).setFontColor(WebColors.getRGBColor("#2980b9")));
        Table seatsTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 2}))
                .useAllAvailableWidth().setMarginBottom(10).setBackgroundColor(WebColors.getRGBColor("#ecf0f1"));

        // FIX: Remove border radius - use simple border instead
        seatsTable.setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 1));

        seatsTable.addHeaderCell(getHeaderCell("Seat No."));
        seatsTable.addHeaderCell(getHeaderCell("Type"));
        seatsTable.addHeaderCell(getHeaderCell("Fare (₹)"));
        seatsTable.addHeaderCell(getHeaderCell("From → To"));

        double totalFare = 0;
        for (Booking b : bookings) {
            double fare = b.getFare();
            totalFare += fare;
            seatsTable.addCell(getStyledCell(Optional.ofNullable(b.getSeatNumber()).orElse("N/A"), false));
            seatsTable.addCell(getStyledCell(Optional.ofNullable(b.getSeatType()).orElse("N/A"), false));
            seatsTable.addCell(getStyledCell(String.format("₹%.2f", fare), false));
            String fromTo = Optional.ofNullable(b.getPassengerFrom()).orElse("N/A") + " → " +
                    Optional.ofNullable(b.getPassengerTo()).orElse("N/A");
            seatsTable.addCell(getStyledCell(fromTo, false).setBold()); // Bold from-to info
        }

        seatsTable.addCell(new Cell(1, 3).add(new Paragraph("Total").setBold()).setBackgroundColor(WebColors.getRGBColor("#3498db")).setFontColor(ColorConstants.WHITE));
        seatsTable.addCell(getStyledCell(String.format("₹%.2f", totalFare), true).setFontColor(WebColors.getRGBColor("#e74c3c")).setBold());
        doc.add(seatsTable);

        // Staff Info
        doc.add(new Paragraph("\n👨‍✈️ STAFF INFORMATION").setBold().setFontSize(14).setFontColor(WebColors.getRGBColor("#2980b9")));
        Table staffTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
                .useAllAvailableWidth().setMarginBottom(10).setBackgroundColor(WebColors.getRGBColor("#ecf0f1"));

        // FIX: Remove border radius - use simple border instead
        staffTable.setBorder(new SolidBorder(ColorConstants.LIGHT_GRAY, 1));

        staffTable.addCell(getStyledCell("Driver Name:", true));
        staffTable.addCell(getStyledCell(Optional.ofNullable(staff.getDriverName()).orElse("N/A"), false));
        staffTable.addCell(getStyledCell("Driver Contact:", true));
        staffTable.addCell(getStyledCell(Optional.ofNullable(staff.getDriverContact()).orElse("N/A"), false));
        staffTable.addCell(getStyledCell("Conductor Name:", true));
        staffTable.addCell(getStyledCell(Optional.ofNullable(staff.getConductorName()).orElse("N/A"), false));
        staffTable.addCell(getStyledCell("Conductor Contact:", true));
        staffTable.addCell(getStyledCell(Optional.ofNullable(staff.getConductorContact()).orElse("N/A"), false));
        doc.add(staffTable);

        // QR Code
        String qrContent = String.format("TicketID: %s | Name: %s | Bus: %s | Route: %s | Date: %s | Paid: ₹%.2f",
                ticketId,
                Optional.ofNullable(first.getPassengerName()).orElse("N/A"),
                Optional.ofNullable(bus.getOperatorName()).orElse("N/A"),
                route,
                Optional.ofNullable(first.getTravelDate()).orElse("N/A"),
                totalFare
        );

        // FIX: Close QR output stream after use
        try (ByteArrayOutputStream qrOut = new ByteArrayOutputStream()) {
            var matrix = new QRCodeWriter().encode(qrContent, BarcodeFormat.QR_CODE, 120, 120);
            MatrixToImageWriter.writeToStream(matrix, "PNG", qrOut);
            Image qrImg = new Image(ImageDataFactory.create(qrOut.toByteArray()))
                    .setMaxHeight(120).setMaxWidth(120).setHorizontalAlignment(HorizontalAlignment.CENTER);
            doc.add(new Paragraph("\nScan QR Code for ticket verification").setTextAlignment(TextAlignment.CENTER).setFontSize(10).setFontColor(WebColors.getRGBColor("#7f8c8d")));
            doc.add(qrImg);
        } catch (IOException e) {
            System.err.println("Error generating QR code: " + e.getMessage());
        }

        // Add friendly message
        doc.add(new Paragraph("\n\n\n✨ Have a pleasant journey! ✨").setTextAlignment(TextAlignment.CENTER)
                .setFontSize(16).setBold().setFontColor(WebColors.getRGBColor("#27ae60")));
        doc.add(new Paragraph("Thank you for choosing our service!\nFor any assistance, please contact our customer support: 1800-123-4567")
                .setTextAlignment(TextAlignment.CENTER).setFontSize(10).setFontColor(WebColors.getRGBColor("#7f8c8d")));
        doc.add(new Paragraph("This ticket is valid only with valid ID proof").setTextAlignment(TextAlignment.CENTER)
                .setFontSize(8).setFontColor(WebColors.getRGBColor("#95a5a6")));

        doc.close();
        System.out.println("✅ PDF generated successfully with unique ticket ID: " + ticketId);
        return outputStream.toByteArray();
    }

    private static Cell getStyledCell(String text, boolean isBold) {
        Paragraph p = new Paragraph(Optional.ofNullable(text).orElse("N/A")).setFontSize(10);
        if (isBold) p.setBold();
        return new Cell().add(p).setPadding(5).setTextAlignment(TextAlignment.LEFT);
    }

    private static Cell getHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(Optional.ofNullable(text).orElse("N/A")).setBold().setFontSize(10))
                .setBackgroundColor(WebColors.getRGBColor("#3498db"))
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(5)
                .setFontColor(ColorConstants.WHITE);
    }
}