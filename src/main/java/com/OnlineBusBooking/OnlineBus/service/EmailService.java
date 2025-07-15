package com.OnlineBusBooking.OnlineBus.service;

import com.OnlineBusBooking.OnlineBus.model.Booking;
import com.OnlineBusBooking.OnlineBus.model.Bus;
import com.OnlineBusBooking.OnlineBus.model.Staff;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendTicket(String toEmail, byte[] pdfBytes, String fileName,
                           List<Booking> bookings, Bus bus, Staff staff) throws MessagingException {

        if (bookings == null || bookings.isEmpty()) {
            throw new IllegalArgumentException("No bookings to send");
        }

        Booking first = bookings.get(0);
        String passengerName = Optional.ofNullable(first.getPassengerName()).orElse("Valued Passenger");
        String travelDate = Optional.ofNullable(first.getTravelDate()).orElse("N/A");
        String bookingDate = travelDate; // Replace with actual booking timestamp if available
        int passengerCount = bookings.size();
        double totalAmount = bookings.stream().mapToDouble(Booking::getFare).sum();

        StringBuilder passengerDetails = new StringBuilder();
        for (Booking b : bookings) {
            String name = Optional.ofNullable(b.getPassengerName()).orElse("N/A");
            String age = String.valueOf(b.getPassengerAge());
            String mobile = Optional.ofNullable(b.getPassengerMobile()).orElse("N/A");
            String seat = Optional.ofNullable(b.getSeatNumber()).orElse("N/A");
            String type = Optional.ofNullable(b.getSeatType()).orElse("N/A");

            passengerDetails.append("- ").append(name)
                    .append(" (Age: ").append(age)
                    .append(", Mobile: ").append(mobile)
                    .append(", Seat: ").append(seat).append(" ").append(type).append(")\n");
        }

        String fromStop = Optional.ofNullable(first.getPassengerFrom()).orElse("N/A");
        String toStop = Optional.ofNullable(first.getPassengerTo()).orElse("N/A");

        String driverName = Optional.ofNullable(staff.getDriverName()).orElse("N/A");
        String driverContact = Optional.ofNullable(staff.getDriverContact()).orElse("N/A");
        String conductorName = Optional.ofNullable(staff.getConductorName()).orElse("N/A");
        String conductorContact = Optional.ofNullable(staff.getConductorContact()).orElse("N/A");

        String emailBody = String.format("""
        Dear %s,

        Thank you for booking your journey with us through the Online Bus Booking platform.

        📅 Travel Date: %s
        📋 Booking Date: %s
        🚌 Route: %s → %s
        🏢 Operator: %s
        👥 Passenger Count: %d
        💳 Amount Paid: ₹%.2f

        Passenger Details:
        %s

        🧑‍✈️ Staff Information:
        - Driver: %s (📞 %s)
        - Conductor: %s (📞 %s)

        Your e-ticket (attached as PDF) contains:
        - Passenger information
        - Seat numbers and types
        - Bus operator & timings
        - QR code for quick verification

        👉 Please carry a digital or printed copy of this ticket while boarding.
        ✅ The QR code on the ticket can be scanned at the boarding point.

        For any assistance, feel free to reach us at: support@onlinebusbooking.com

        Wishing you a safe and comfortable journey!
        — Online Bus Booking Team
        """,
                passengerName,
                travelDate,
                bookingDate,
                fromStop,
                toStop,
                Optional.ofNullable(bus.getOperatorName()).orElse("N/A"),
                passengerCount,
                totalAmount,
                passengerDetails.toString(),
                driverName, driverContact,
                conductorName, conductorContact
        );

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setTo(toEmail);
        helper.setSubject("🚌 Your Bus Ticket Confirmation");
        helper.setText(emailBody);
        helper.addAttachment(fileName, new ByteArrayResource(pdfBytes));

        mailSender.send(message);
    }

    public void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
