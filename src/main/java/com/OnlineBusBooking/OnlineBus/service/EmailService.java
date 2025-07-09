package com.OnlineBusBooking.OnlineBus.service;

import com.OnlineBusBooking.OnlineBus.model.Booking;
import com.OnlineBusBooking.OnlineBus.model.Bus;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendTicket(String toEmail, byte[] pdfBytes, String fileName, List<Booking> bookings, Bus bus) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setTo(toEmail);
        helper.setSubject("🚌 Your Bus Ticket Confirmation");

        String travelDate = bookings.get(0).getTravelDate();
        String passengerName = bookings.get(0).getCustomerName();
        String bookingDate = bookings.get(0).getBookingDate();
        int passengerCount = bookings.size();
        double totalAmount = bookings.stream().mapToDouble(Booking::getFare).sum();

        String seatDetails = bookings.stream()
                .map(b -> b.getSeatNumber() + " (" + b.getSeatType() + ")")
                .collect(Collectors.joining(", "));

        String emailBody = """
                Dear %s,

                Thank you for booking your journey with us through the Online Bus Booking platform.

                📅 Travel Date: %s
                🧾 Booking Date: %s
                🚌 Route: %s → %s
                🏢 Operator: %s
                💺 Seat(s): %s
                👥 Passenger Count: %d
                💳 Amount Paid: ₹%.2f

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
                """.formatted(
                passengerName,
                travelDate,
                bookingDate,
                bus.getSource(),
                bus.getDestination(),
                bus.getOperatorName(),
                seatDetails,
                passengerCount,
                totalAmount
        );

        helper.setText(emailBody);
        helper.addAttachment(fileName, new ByteArrayResource(pdfBytes));

        mailSender.send(message);
    }
}
