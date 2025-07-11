package com.OnlineBusBooking.OnlineBus.util;

import com.OnlineBusBooking.OnlineBus.model.Booking;
import com.OnlineBusBooking.OnlineBus.model.Bus;
import com.OnlineBusBooking.OnlineBus.model.TripSchedule;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

public class TicketPDFGenerator {

    public static byte[] generateTicketPDF(List<Booking> bookings, Bus bus, TripSchedule schedule) throws Exception {
        if (bookings == null || bookings.isEmpty()) {
            throw new IllegalArgumentException("No bookings provided");
        }

        Booking first = bookings.get(0);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc);

        // Logo
        InputStream logoStream = TicketPDFGenerator.class.getResourceAsStream("/static/logo.png");
        if (logoStream != null) {
            Image logo = new Image(ImageDataFactory.create(logoStream.readAllBytes()));
            logo.scaleToFit(60, 60);
            logo.setHorizontalAlignment(HorizontalAlignment.CENTER);
            doc.add(logo);
        }

        // Title
        doc.add(new Paragraph("🚌 Bus Ticket")
                .setFontSize(18)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.DARK_GRAY));

        // Determine route with fallback
        String source = bus.getSource() != null ? bus.getSource() : first.getPassengerFrom();
        String destination = bus.getDestination() != null ? bus.getDestination() : first.getPassengerTo();
        if (source == null) source = "Unknown";
        if (destination == null) destination = "Unknown";
        String route = source + " → " + destination;

        // Trip Info Table
        Table tripTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
                .useAllAvailableWidth().setMarginTop(5);

        tripTable.addCell(getCell("Operator:", true));
        tripTable.addCell(getCell(Optional.ofNullable(bus.getOperatorName()).orElse("N/A"), false));

        tripTable.addCell(getCell("Route:", true));
        tripTable.addCell(getCell(route, false));

        tripTable.addCell(getCell("Departure:", true));
        tripTable.addCell(getCell(Optional.ofNullable(schedule.getDepartureTime()).orElse("N/A"), false));

        tripTable.addCell(getCell("Arrival:", true));
        tripTable.addCell(getCell(Optional.ofNullable(schedule.getArrivalTime()).orElse("N/A"), false));

        tripTable.addCell(getCell("Travel Date:", true));
        tripTable.addCell(getCell(Optional.ofNullable(first.getTravelDate()).orElse("N/A"), false));

        tripTable.addCell(getCell("Booking Date:", true));
        tripTable.addCell(getCell(Optional.ofNullable(first.getTravelDate()).orElse("N/A"), false));

        doc.add(tripTable);

        // Passenger Info
        doc.add(new Paragraph("\n👤 Passenger Info").setBold().setFontSize(12));
        Table passengerTable = new Table(UnitValue.createPercentArray(new float[]{1, 2, 1, 1}))
                .useAllAvailableWidth();

        passengerTable.addHeaderCell(getHeaderCell("Name"));
        passengerTable.addHeaderCell(getHeaderCell("Email"));
        passengerTable.addHeaderCell(getHeaderCell("Age"));
        passengerTable.addHeaderCell(getHeaderCell("Mobile"));

        for (Booking booking : bookings) {
            passengerTable.addCell(getCell(Optional.ofNullable(booking.getPassengerName()).orElse("N/A"), false));
            passengerTable.addCell(getCell(Optional.ofNullable(booking.getCustomerEmail()).orElse("N/A"), false));
            passengerTable.addCell(getCell(
                    booking.getPassengerAge() > 0 ? String.valueOf(booking.getPassengerAge()) : "N/A", false));
            passengerTable.addCell(getCell(Optional.ofNullable(booking.getPassengerMobile()).orElse("N/A"), false));
        }

        doc.add(passengerTable);

        // Booked Seats Table
        doc.add(new Paragraph("\n💼 Booked Seats").setBold().setFontSize(12));
        Table seatsTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 2}))
                .useAllAvailableWidth().setMarginBottom(10);

        seatsTable.addHeaderCell(getHeaderCell("Seat No."));
        seatsTable.addHeaderCell(getHeaderCell("Type"));
        seatsTable.addHeaderCell(getHeaderCell("Fare (₹)"));
        seatsTable.addHeaderCell(getHeaderCell("From → To"));

        double totalFare = 0;
        for (Booking b : bookings) {
            double fare = b.getFare();
            totalFare += fare;

            seatsTable.addCell(getCell(Optional.ofNullable(b.getSeatNumber()).orElse("N/A"), false));
            seatsTable.addCell(getCell(Optional.ofNullable(b.getSeatType()).orElse("N/A"), false));
            seatsTable.addCell(getCell(String.format("₹%.2f", fare), false));
            seatsTable.addCell(getCell(
                    Optional.ofNullable(b.getPassengerFrom()).orElse("N/A") + " → " +
                            Optional.ofNullable(b.getPassengerTo()).orElse("N/A"), false));
        }

        seatsTable.addCell(new Cell(1, 3).add(new Paragraph("Total").setBold()));
        seatsTable.addCell(getCell(String.format("₹%.2f", totalFare), true));
        doc.add(seatsTable);

        // QR Code
        String qrContent = String.format("Name: %s | Email: %s | Bus: %s | Route: %s | Date: %s | Paid: ₹%.2f",
                Optional.ofNullable(first.getPassengerName()).orElse("N/A"),
                Optional.ofNullable(first.getCustomerEmail()).orElse("N/A"),
                Optional.ofNullable(bus.getOperatorName()).orElse("N/A"),
                route,
                Optional.ofNullable(first.getTravelDate()).orElse("N/A"),
                totalFare
        );

        ByteArrayOutputStream qrOut = new ByteArrayOutputStream();
        var matrix = new QRCodeWriter().encode(qrContent, BarcodeFormat.QR_CODE, 100, 100);
        MatrixToImageWriter.writeToStream(matrix, "PNG", qrOut);
        Image qrImg = new Image(ImageDataFactory.create(qrOut.toByteArray()))
                .setMaxHeight(100).setMaxWidth(100).setHorizontalAlignment(HorizontalAlignment.CENTER);

        doc.add(new Paragraph("\nScan QR for ticket info").setTextAlignment(TextAlignment.CENTER).setFontSize(10));
        doc.add(qrImg);

        doc.close();
        return outputStream.toByteArray();
    }


    private static Cell getCell(String text, boolean isBold) {
        Paragraph p = new Paragraph(Optional.ofNullable(text).orElse("N/A")).setFontSize(10);
        if (isBold) p.setBold();
        return new Cell().add(p).setPadding(3).setTextAlignment(TextAlignment.LEFT);
    }

    private static Cell getHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(Optional.ofNullable(text).orElse("N/A")).setBold().setFontSize(10))
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(3);
    }
}
