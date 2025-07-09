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
        if (bookings.isEmpty()) throw new IllegalArgumentException("No bookings provided");

        Booking first = bookings.get(0);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc);

        // Add Logo
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

        // Trip Info Table
        Table tripTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
                .useAllAvailableWidth().setMarginTop(5);

        tripTable.addCell(new Cell().add(new Paragraph("Operator:").setBold()));
        tripTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(bus.getOperatorName()).orElse("N/A"))));

        tripTable.addCell(new Cell().add(new Paragraph("Route:").setBold()));
        tripTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(bus.getSource()).orElse("N/A") + " → " +
                        Optional.ofNullable(bus.getDestination()).orElse("N/A"))));

        tripTable.addCell(new Cell().add(new Paragraph("Departure:").setBold()));
        tripTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(schedule.getDepartureTime()).orElse("N/A"))));

        tripTable.addCell(new Cell().add(new Paragraph("Arrival:").setBold()));
        tripTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(schedule.getArrivalTime()).orElse("N/A"))));

        tripTable.addCell(new Cell().add(new Paragraph("Travel Date:").setBold()));
        tripTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(first.getTravelDate()).orElse("N/A"))));

        tripTable.addCell(new Cell().add(new Paragraph("Booking Date:").setBold()));
        tripTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(first.getBookingDate()).orElse("N/A"))));

        doc.add(tripTable);

        // Passenger Info
        doc.add(new Paragraph("\n👤 Passenger Info").setBold().setFontSize(12));

        Table passengerTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
                .useAllAvailableWidth();
        passengerTable.addCell(new Cell().add(new Paragraph("Name:").setBold()));
        passengerTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(first.getCustomerName()).orElse("N/A"))));

        passengerTable.addCell(new Cell().add(new Paragraph("Email:").setBold()));
        passengerTable.addCell(new Cell().add(new Paragraph(
                Optional.ofNullable(first.getCustomerEmail()).orElse("N/A"))));
        doc.add(passengerTable);

        // Booked Seats
        doc.add(new Paragraph("\n💺 Booked Seats").setBold().setFontSize(12));
        Table seatsTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1}))
                .useAllAvailableWidth().setMarginBottom(10);

        seatsTable.addHeaderCell(new Cell().add(new Paragraph("Seat No.").setBold()));
        seatsTable.addHeaderCell(new Cell().add(new Paragraph("Type").setBold()));
        seatsTable.addHeaderCell(new Cell().add(new Paragraph("Fare (₹)").setBold()));

        double totalFare = 0;
        for (Booking b : bookings) {
            seatsTable.addCell(new Cell().add(new Paragraph(
                    Optional.ofNullable(b.getSeatNumber()).orElse("N/A"))));
            seatsTable.addCell(new Cell().add(new Paragraph(
                    Optional.ofNullable(b.getSeatType()).orElse("N/A"))));
            seatsTable.addCell(new Cell().add(new Paragraph(String.format("₹%.2f", b.getFare()))));
            totalFare += b.getFare();
        }

        seatsTable.addCell(new Cell(1, 2).add(new Paragraph("Total").setBold()));
        seatsTable.addCell(new Cell().add(new Paragraph(String.format("₹%.2f", totalFare)).setBold()));
        doc.add(seatsTable);

        // QR Code
        String qrContent = "Name: " + first.getCustomerName()
                + " | Email: " + first.getCustomerEmail()
                + " | Bus: " + bus.getOperatorName()
                + " | Route: " + bus.getSource() + " → " + bus.getDestination()
                + " | Travel Date: " + first.getTravelDate()
                + " | Total Paid: ₹" + totalFare;

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
        Paragraph p = new Paragraph(text).setFontSize(10);
        if (isBold) p.setBold();
        return new Cell().add(p).setPadding(3).setTextAlignment(TextAlignment.LEFT);
    }

    private static Cell getHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(3);
    }
}
