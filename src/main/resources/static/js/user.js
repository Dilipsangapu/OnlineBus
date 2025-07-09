let selectedSeats = [];
let currentSeatLayout = [];
let selectedBusId = null;
let selectedTravelDate = null;
let userEmail = document.body.getAttribute("data-email");

// --------- SHOW SECTIONS ---------
function showUserSection(sectionId) {
  document.querySelectorAll(".user-section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));

  document.getElementById(sectionId + "Section").classList.add("active");

  const li = document.querySelector(`.sidebar li[onclick*="${sectionId}"]`);
  if (li) li.classList.add("active");

  if (sectionId === "bookings") loadUserBookings();
}

// --------- SEARCH BUSES ---------
document.getElementById("searchForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const from = document.getElementById("fromCity").value.trim();
  const to = document.getElementById("toCity").value.trim();
  const date = document.getElementById("travelDate").value;

  if (!from || !to || !date) {
    alert("❗ Please fill in all fields.");
    return;
  }

  selectedTravelDate = date;

  fetch(`/user/api/search-buses?from=${from}&to=${to}&date=${date}`)
    .then(res => res.json())
    .then(buses => {
      const resultDiv = document.getElementById("searchResults");
      resultDiv.innerHTML = "";

      if (buses.length === 0) {
        resultDiv.innerHTML = "<p>❌ No buses found for the selected route and date.</p>";
        return;
      }

      buses.forEach(bus => {
        const div = document.createElement("div");
        div.className = "bus-card";
        div.innerHTML = `
          <h4>${bus.busName || "Bus"} (${bus.busNumber || "N/A"})</h4>
          <p>Type: ${bus.busType || "N/A"}</p>
          <p>Departure: ${bus.departureTime || "N/A"}</p>
          <p>Arrival: ${bus.arrivalTime || "N/A"}</p>
          <button onclick='loadSeatLayout("${bus.id}", "${date}")'>🪑 View & Book Seats</button>`;
        resultDiv.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Error searching buses:", err);
      alert("❌ Failed to fetch bus data.");
    });
});

// --------- LOAD SEAT LAYOUT ---------
function loadSeatLayout(busId, travelDate) {
  selectedBusId = busId;
  selectedTravelDate = travelDate;
  selectedSeats = [];
  currentSeatLayout = [];

  Promise.all([
    fetch(`/api/seats/by-bus/${busId}`).then(res => res.json()),
    fetch(`/user/api/booked-seats?busId=${busId}&date=${travelDate}`).then(res => res.json())
  ])
    .then(([layoutData, bookedSeats]) => {
      currentSeatLayout = layoutData.seats || [];
      window.bookedSeatNumbers = bookedSeats || [];
      document.getElementById("seatLayoutContainer").style.display = "block";
      renderSeatLayout("seater");
    })
    .catch(err => {
      console.error("Error loading seat layout:", err);
      alert("❌ Could not load seat layout.");
    });
}

// --------- RENDER SEAT LAYOUT ---------
function renderSeatLayout(type) {
  const layoutDiv = document.getElementById("seatLayout");
  layoutDiv.innerHTML = "";

  const filtered = currentSeatLayout.filter(seat => seat.type === type);
  const lowerDeck = filtered.filter(seat => seat.deck === "lower");
  const upperDeck = filtered.filter(seat => seat.deck === "upper");

  if (filtered.length === 0) {
    layoutDiv.innerHTML = `<p>No ${type} seats available.</p>`;
    return;
  }

  function renderDeck(deckName, seats) {
    if (seats.length === 0) return;

    const title = document.createElement("div");
    title.className = "deck-title";
    title.textContent = `${deckName.charAt(0).toUpperCase() + deckName.slice(1)} Deck`;
    layoutDiv.appendChild(title);

    const container = document.createElement("div");
    container.className = "seat-deck";

    seats.forEach(seat => {
      const btn = document.createElement("button");
      btn.className = "seat-btn";
      btn.textContent = `${seat.number} (₹${seat.price})`;

      const isBooked = window.bookedSeatNumbers?.includes(seat.number);
      if (isBooked) {
        btn.disabled = true;
        btn.classList.add("booked");
      } else {
        btn.onclick = () => toggleSeat(seat);
        if (selectedSeats.some(s => s.number === seat.number)) {
          btn.classList.add("selected");
        }
      }

      container.appendChild(btn);
    });

    layoutDiv.appendChild(container);
  }

  renderDeck("lower", lowerDeck);
  renderDeck("upper", upperDeck);
  updateSelectionDisplay();
}

// --------- TOGGLE SEAT SELECTION ---------
function toggleSeat(seat) {
  const index = selectedSeats.findIndex(s => s.number === seat.number);
  if (index > -1) {
    selectedSeats.splice(index, 1);
  } else {
    selectedSeats.push(seat);
  }

  updateSelectionDisplay();
  renderSeatLayout(seat.type);
}

// --------- UPDATE DISPLAY ---------
function updateSelectionDisplay() {
  const selectedList = selectedSeats.map(seat => seat.number).join(", ") || "None";
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  document.getElementById("selectedSeatsDisplay").textContent = selectedList;
  document.getElementById("totalFare").textContent = total;
  document.getElementById("confirmBookingBtn").disabled = selectedSeats.length === 0;
}

// --------- CONFIRM BOOKING ---------
function confirmBooking() {
  if (!selectedBusId || selectedSeats.length === 0) return;

  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0) * 100;

  fetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `amount=${totalAmount}&currency=INR`
  })
    .then(res => res.text())
    .then(text => {
      const order = JSON.parse(text);

      const options = {
        key: "rzp_test_38I5IEufjhiOFj",
        amount: order.amount,
        currency: order.currency,
        name: "Online Bus Booking",
        description: "Bus Ticket Payment",
        order_id: order.id,
        handler: function (response) {
          fetch("/api/payments/save-success", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              paymentId: response.razorpay_payment_id,
              receipt: order.receipt,
              amount: order.amount,
              status: "SUCCESS"
            })
          });

          const promises = selectedSeats.map(seat =>
            fetch("/user/api/bookings/book", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                busId: selectedBusId,
                travelDate: selectedTravelDate,
                customerEmail: userEmail,
                seatNumber: seat.number,
                seatType: seat.type,
                fare: seat.price
              })
            })
          );

          Promise.all(promises)
            .then(() =>
              fetch("/user/api/finalize-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: userEmail,
                  busId: selectedBusId,
                  travelDate: selectedTravelDate
                })
              })
            )
            .then(res => res.text())
            .then(msg => {
              alert("✅ Payment successful, seats booked & ticket sent via email!\n\n" + msg);
              selectedSeats = [];
              updateSelectionDisplay();
              showUserSection("bookings");
            })
            .catch(err => {
              console.error("Booking/email error:", err);
              alert("❌ Booking succeeded but sending ticket failed.");
            });
        },
        theme: { color: "#008c7a" }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    })
    .catch(err => {
      console.error("Error initiating payment:", err);
      alert("❌ Payment initiation failed.");
    });
}

// --------- LOAD USER BOOKINGS ---------
function loadUserBookings() {
  fetch(`/user/api/bookings/by-user/${userEmail}`)
    .then(res => res.json())
    .then(bookings => {
      const container = document.getElementById("bookingList");
      container.innerHTML = "";

      if (bookings.length === 0) {
        container.innerHTML = "<p>No bookings yet.</p>";
        return;
      }

      const table = document.createElement("table");
      table.className = "booking-table";
      table.innerHTML = `
        <thead>
          <tr><th>Bus</th><th>Date</th><th>Seat</th><th>Fare</th><th>Status</th></tr>
        </thead>
      `;

      const tbody = document.createElement("tbody");
      bookings.forEach(b => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${b.busName || "-"}</td>
          <td>${b.bookingDate}</td>
          <td>${b.seatNumber}</td>
          <td>₹${b.fare}</td>
          <td>${b.status}</td>
        `;
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    })
    .catch(err => {
      console.error("Failed to load bookings:", err);
      alert("❌ Could not load bookings.");
    });
}

// --------- INIT ---------
document.addEventListener("DOMContentLoaded", () => {
  showUserSection("search");
});
