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

    @Autowired
    private EmailService emailService;
    @Autowired
    private SeatLayoutRepository seatLayoutRepository;
    @Autowired
    private StaffRepository staffRepository;



    @GetMapping("/dashboard")
    public String showUserDashboard(HttpSession session, Principal principal, Model model) {
        String email = principal.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            session.setAttribute("email", user.getEmail());
            session.setAttribute("name", user.getName());
            model.addAttribute("session", user);
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
        List<Route> allRoutes = routeRepository.findAll();
        List<Map<String, Object>> results = new ArrayList<>();

        String fromLower = from.toLowerCase();
        String toLower = to.toLowerCase();

        for (Route route : allRoutes) {
            boolean validRoute = false;

            List<String> fullPath = new ArrayList<>();
            fullPath.add(route.getFrom().toLowerCase());
            if (route.getStops() != null)
                fullPath.addAll(route.getStops().stream().map(String::toLowerCase).toList());
            fullPath.add(route.getTo().toLowerCase());

            if (fullPath.contains(fromLower) && fullPath.contains(toLower)) {
                int fromIndex = fullPath.indexOf(fromLower);
                int toIndex = fullPath.indexOf(toLower);
                if (fromIndex < toIndex) {
                    validRoute = true;
                }
            }

            if (validRoute) {
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
        }

        return results;
    }

    @GetMapping("/api/route/stops/{busId}")
    @ResponseBody
    public List<String> getStopsByBusId(@PathVariable String busId) {
        List<Route> routes = routeRepository.findByBusId(busId);
        if (routes.isEmpty()) return Collections.emptyList();

        Route route = routes.get(0);
        List<String> stops = new ArrayList<>();
        stops.add(route.getFrom().toLowerCase());
        if (route.getStops() != null)
            stops.addAll(route.getStops().stream().map(String::toLowerCase).toList());
        stops.add(route.getTo().toLowerCase());

        return stops;
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
    public List<Map<String, Object>> getBookingsByUser(@PathVariable String email) {
        List<Booking> bookings = bookingRepository.findByCustomerEmail(email);
        List<Map<String, Object>> enriched = new ArrayList<>();

        for (Booking booking : bookings) {
            Optional<Bus> busOpt = busRepository.findById(booking.getBusId());

            String busName = busOpt.map(Bus::getBusName).orElse("Unknown Bus");
            String routeFrom = booking.getPassengerFrom();
            String routeTo = booking.getPassengerTo();

            Map<String, Object> entry = new HashMap<>();
            entry.put("busId", booking.getBusId()); // ✅ ADDED: Needed for ticket download
            entry.put("busName", busName);
            entry.put("routeFrom", routeFrom);
            entry.put("routeTo", routeTo);
            entry.put("travelDate", booking.getTravelDate());
            entry.put("seatNumber", booking.getSeatNumber());
            entry.put("fare", booking.getFare());
            entry.put("status", booking.getStatus());
            entry.put("passengerName", booking.getPassengerName());
            entry.put("passengerMobile", booking.getPassengerMobile());
            entry.put("email", booking.getCustomerEmail());

            enriched.add(entry);
        }

        return enriched;
    }



    @PostMapping("/api/bookings/book")
    @ResponseBody
    public ResponseEntity<String> bookTicket(@RequestBody Booking booking) {
        // 1. Check if already booked
        boolean alreadyBooked = bookingRepository.existsByBusIdAndTravelDateAndSeatNumber(
                booking.getBusId(), booking.getTravelDate(), booking.getSeatNumber()
        );

        if (alreadyBooked) {
            return ResponseEntity.status(409).body("❌ Seat already booked.");
        }

        // 2. Fetch Bus and Route
        Optional<Bus> busOpt = busRepository.findById(booking.getBusId());
        List<Route> routes = routeRepository.findByBusId(booking.getBusId());

        if (busOpt.isEmpty() || routes.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ Bus or Route not found.");
        }

        Bus bus = busOpt.get();
        Route route = routes.get(0);

        // 3. Build stops list
        List<String> stops = new ArrayList<>();
        stops.add(route.getFrom().toLowerCase());
        if (route.getStops() != null)
            stops.addAll(route.getStops().stream().map(String::toLowerCase).toList());
        stops.add(route.getTo().toLowerCase());

        // 4. Validate from-to stops
        String from = booking.getPassengerFrom() != null ? booking.getPassengerFrom().toLowerCase() : "";
        String to = booking.getPassengerTo() != null ? booking.getPassengerTo().toLowerCase() : "";

        int fromIndex = stops.indexOf(from);
        int toIndex = stops.indexOf(to);

        if (fromIndex == -1 || toIndex == -1 || fromIndex >= toIndex) {
            return ResponseEntity.badRequest().body("❌ Invalid stop selection: from=" + from + ", to=" + to);
        }

        // 5. Get Seat Price from SeatLayout
        Optional<SeatLayout> seatLayoutOpt = seatLayoutRepository.findByBusId(booking.getBusId());
        if (seatLayoutOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ Seat layout not found.");
        }

        SeatLayout seatLayout = seatLayoutOpt.get();
        Optional<SeatLayout.Seat> seatOpt = seatLayout.getSeats().stream()
                .filter(s -> s.getNumber().equalsIgnoreCase(booking.getSeatNumber()))
                .findFirst();

        if (seatOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ Seat not found in layout.");
        }

        double seatPrice = seatOpt.get().getPrice();

        // 6. Calculate fare
        double segmentRatio = (double) (toIndex - fromIndex) / (stops.size() - 1);
        double finalFare = Math.round(seatPrice * segmentRatio * 100.0) / 100.0;

        // 7. Save booking
        booking.setFare(finalFare);
        booking.setStatus("CONFIRMED");
        bookingRepository.save(booking);

        // 8. Debug logs
        System.out.println("✅ Booking seat: " + booking.getSeatNumber() + ", Seat Price: " + seatPrice);
        System.out.println("From: " + from + ", To: " + to);
        System.out.println("Segment ratio: " + segmentRatio + ", Final Fare: ₹" + finalFare);

        return ResponseEntity.ok("✅ Booking confirmed. ₹" + finalFare);
    }


    @PostMapping("/api/finalize-booking")
    @ResponseBody
    public ResponseEntity<String> finalizeBooking(@RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        String busId = (String) payload.get("busId");
        String travelDateStr = (String) payload.get("travelDate");

        if (email == null || busId == null || travelDateStr == null || !payload.containsKey("seatNumbers")) {
            return ResponseEntity.badRequest().body("Missing required fields.");
        }

        List<String> seatNumbers = (List<String>) payload.get("seatNumbers");

        List<Booking> bookings = bookingRepository.findByCustomerEmail(email).stream()
                .filter(b -> b.getBusId().equals(busId)
                        && b.getTravelDate().equals(travelDateStr)
                        && seatNumbers.contains(b.getSeatNumber()))
                .toList();

        Optional<Bus> busOpt = busRepository.findById(busId);
        List<TripSchedule> schedules = tripScheduleRepository.findByBusIdAndDate(busId, LocalDate.parse(travelDateStr));
        List<Staff> staffList = staffRepository.findByBusId(busId);

        if (bookings.isEmpty() || busOpt.isEmpty() || schedules.isEmpty() || staffList.isEmpty()) {
            return ResponseEntity.badRequest().body("No bookings, schedule, bus, or staff found.");
        }

        Bus bus = busOpt.get();
        TripSchedule schedule = schedules.get(0);
        Staff staff = staffList.get(0); // Use first staff for this bus

        try {
            byte[] pdf = TicketPDFGenerator.generateTicketPDF(bookings, bus, schedule, staff);
            emailService.sendTicket(email, pdf, "ticket.pdf", bookings, bus, staff);
            return ResponseEntity.ok("📧 Ticket emailed successfully.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("❌ Failed to generate/send ticket.");
        }
    }

    @GetMapping("/api/bookings/download-ticket")
    public ResponseEntity<byte[]> downloadTicket(@RequestParam String email,
                                                 @RequestParam String busId,
                                                 @RequestParam String travelDate,
                                                 @RequestParam String seatNumber) {
        Optional<Booking> bookingOpt = bookingRepository.findByCustomerEmail(email).stream()
                .filter(b -> b.getBusId().equals(busId)
                        && b.getTravelDate().equals(travelDate)
                        && b.getSeatNumber().equalsIgnoreCase(seatNumber))
                .findFirst();

        Optional<Bus> busOpt = busRepository.findById(busId);
        List<TripSchedule> schedules = tripScheduleRepository.findByBusIdAndDate(busId, LocalDate.parse(travelDate));
        List<Staff> staffList = staffRepository.findByBusId(busId);

        if (bookingOpt.isEmpty() || busOpt.isEmpty() || schedules.isEmpty() || staffList.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Booking booking = bookingOpt.get();
            Bus bus = busOpt.get();
            TripSchedule schedule = schedules.get(0);
            Staff staff = staffList.get(0); // Use first staff entry for the bus

            byte[] pdf = TicketPDFGenerator.generateTicketPDF(List.of(booking), bus, schedule, staff);

            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=ticket_" + seatNumber + ".pdf")
                    .header("Content-Type", "application/pdf")
                    .body(pdf);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    @GetMapping("/passenger-details")
    public String showPassengerFormPage(HttpSession session, Model model) {
        if (session.getAttribute("email") == null) {
            return "redirect:/login";
        }
        model.addAttribute("email", session.getAttribute("email"));
        model.addAttribute("name", session.getAttribute("name"));
        return "passenger-details"; // Thymeleaf template name (without .html)
    }

}