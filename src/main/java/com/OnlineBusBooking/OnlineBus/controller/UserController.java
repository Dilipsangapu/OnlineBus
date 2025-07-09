package com.OnlineBusBooking.OnlineBus.controller;

import com.OnlineBusBooking.OnlineBus.model.*;
import com.OnlineBusBooking.OnlineBus.repository.*;
import com.OnlineBusBooking.OnlineBus.service.EmailService;
import com.OnlineBusBooking.OnlineBus.util.TicketPDFGenerator;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.*;

@Controller
@RequestMapping("/user")
public class UserController {

    @Autowired
    private BusRepository busRepository;

    @Autowired
    private TripScheduleRepository tripScheduleRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RouteRepository routeRepository;

    @GetMapping("/dashboard")
    public String showUserDashboard(HttpSession session, Principal principal, Model model) {
        String email = principal.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            session.setAttribute("email", user.getEmail());
            session.setAttribute("name", user.getName());
            model.addAttribute("session", user);  // ✅ So Thymeleaf can access via ${session}
            return "userDashboard";
        }

        return "redirect:/login";
    }

    @GetMapping("/api/search-buses")
    @ResponseBody
    public List<Map<String, Object>> searchBuses(@RequestParam String from,
                                                 @RequestParam String to,
                                                 @RequestParam String date) {
        LocalDate travelDate = LocalDate.parse(date);
        List<Route> routes = routeRepository.findByFromIgnoreCaseAndToIgnoreCase(from, to);
        List<Map<String, Object>> results = new ArrayList<>();

        for (Route route : routes) {
            List<TripSchedule> schedules = tripScheduleRepository.findByRouteIdAndDate(route.getId(), travelDate);

            for (TripSchedule schedule : schedules) {
                Optional<Bus> busOpt = busRepository.findById(schedule.getBusId());
                if (busOpt.isPresent()) {
                    Bus bus = busOpt.get();

                    Map<String, Object> result = new HashMap<>();
                    result.put("id", bus.getId());
                    result.put("busId", bus.getId());
                    result.put("busName", bus.getBusName());
                    result.put("busNumber", bus.getBusNumber());
                    result.put("busType", bus.getBusType());
                    result.put("departureTime", schedule.getDepartureTime());
                    result.put("arrivalTime", schedule.getArrivalTime());
                    result.put("seaterFare", bus.getSeaterFare());
                    result.put("sleeperFare", bus.getSleeperFare());

                    results.add(result);
                }
            }
        }

        return results;
    }
    @GetMapping("/api/booked-seats")
    @ResponseBody
    public List<String> getBookedSeats(@RequestParam String busId,
                                       @RequestParam String date) {
        List<Booking> bookings = bookingRepository.findByBusIdAndTravelDate(busId, date);
        List<String> bookedSeatNumbers = new ArrayList<>();
        for (Booking booking : bookings) {
            bookedSeatNumbers.add(booking.getSeatNumber());
        }
        return bookedSeatNumbers;
    }

    @GetMapping("/api/bookings/by-user/{email}")
    @ResponseBody
    public List<Booking> getBookingsByUser(@PathVariable String email) {
        return bookingRepository.findByCustomerEmail(email);
    }

    @PostMapping("/api/bookings/book")
    @ResponseBody
    public ResponseEntity<String> bookTicket(@RequestBody Booking booking) {
        boolean alreadyBooked = bookingRepository.existsByBusIdAndTravelDateAndSeatNumber(
                booking.getBusId(), booking.getTravelDate(), booking.getSeatNumber()
        );

        if (alreadyBooked) {
            return ResponseEntity.status(409).body("❌ Seat already booked.");
        }

        booking.setBookingDate(LocalDate.now().toString());
        booking.setStatus("CONFIRMED");
        bookingRepository.save(booking);
        return ResponseEntity.ok("✅ Booking confirmed");
    }


    @Autowired
    private EmailService emailService;


    @PostMapping("/api/finalize-booking")
    @ResponseBody
    public ResponseEntity<String> finalizeBooking(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String busId = payload.get("busId");
        String travelDateStr = payload.get("travelDate");

        if (email == null || busId == null || travelDateStr == null) {
            return ResponseEntity.badRequest().body("Missing email, busId or travelDate.");
        }

        List<Booking> bookings = bookingRepository.findByCustomerEmail(email).stream()
                .filter(b -> b.getBusId().equals(busId) && b.getTravelDate().equals(travelDateStr))
                .toList();

        Optional<Bus> busOpt = busRepository.findById(busId);
        List<TripSchedule> schedules = tripScheduleRepository.findByBusIdAndDate(busId, LocalDate.parse(travelDateStr));

        if (bookings.isEmpty() || busOpt.isEmpty() || schedules.isEmpty()) {
            return ResponseEntity.badRequest().body("No bookings or schedule found.");
        }

        Bus bus = busOpt.get();
        TripSchedule schedule = schedules.get(0);  // assuming one schedule per date per bus

        try {
            byte[] pdf = TicketPDFGenerator.generateTicketPDF(bookings, bus, schedule);
            emailService.sendTicket(email, pdf, "ticket.pdf", bookings, bus);
            return ResponseEntity.ok("📧 Ticket emailed successfully.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("❌ Failed to generate/send ticket.");
        }
    }



}
