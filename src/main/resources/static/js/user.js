let selectedSeats = [];
let currentSeatLayout = [];
let selectedBusId = null;
let selectedTravelDate = null;
let selectedRouteStops = [];
let userEmail = document.body.getAttribute("data-email");

// --------- INIT ---------
document.addEventListener("DOMContentLoaded", () => showUserSection("search"));

// --------- SECTIONS ---------
function showUserSection(sectionId) {
  document.querySelectorAll(".user-section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));
  document.getElementById(sectionId + "Section").classList.add("active");
  const li = document.querySelector(`.sidebar li[onclick*="${sectionId}"]`);
  if (li) li.classList.add("active");
  if (sectionId === "bookings") loadUserBookings();
}

// --------- SEARCH ---------
document.getElementById("searchForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const from = document.getElementById("fromCity").value.trim();
  const to = document.getElementById("toCity").value.trim();
  const date = document.getElementById("travelDate").value;
  if (!from || !to || !date) return alert("❗ Please fill all fields.");
  selectedTravelDate = date;

  fetch(`/user/api/search-buses?from=${from}&to=${to}&date=${date}`)
    .then(res => res.json())
    .then(buses => {
      const resultDiv = document.getElementById("searchResults");
      resultDiv.innerHTML = buses.length === 0
        ? "<p>❌ No buses found.</p>"
        : buses.map(bus => `
          <div class="bus-card">
            <h4>${bus.busName} (${bus.busNumber})</h4>
            <p>Type: ${bus.busType}</p>
            <p>Departure: ${bus.departureTime}</p>
            <p>Arrival: ${bus.arrivalTime}</p>
            <button onclick='loadSeatLayout("${bus.id}", "${date}")'>🪑 View & Book Seats</button>
          </div>`).join("");
    })
    .catch(err => {
      console.error("Search error:", err);
      alert("❌ Failed to fetch buses.");
    });
});

// --------- LOAD SEAT LAYOUT ---------
function loadSeatLayout(busId, date) {
  selectedBusId = busId;
  selectedTravelDate = date;
  selectedSeats = [];

  Promise.all([
    fetch(`/api/seats/by-bus/${busId}`).then(res => res.json()),
    fetch(`/user/api/booked-seats?busId=${busId}&date=${date}`).then(res => res.json()),
    fetch(`/user/api/route/stops/${busId}`).then(res => res.json())
  ]).then(([seatData, booked, stops]) => {
    currentSeatLayout = seatData?.seats || [];
    window.bookedSeatNumbers = booked || [];
    selectedRouteStops = stops || [];

    document.getElementById("seatLayoutContainer").style.display = "block";
    renderSeatLayout("seater");
  }).catch(err => {
    console.error("Seat layout error:", err);
    alert("❌ Could not load seat layout.");
  });
}

// --------- RENDER SEATS ---------
function renderSeatLayout(type) {
  const layoutDiv = document.getElementById("seatLayout");
  layoutDiv.innerHTML = "";

  const filtered = currentSeatLayout.filter(seat => seat.type === type);
  const lower = filtered.filter(seat => seat.deck === "lower");
  const upper = filtered.filter(seat => seat.deck === "upper");

  function renderDeck(deckName, deckSeats) {
    if (deckSeats.length === 0) return;
    layoutDiv.innerHTML += `<div class="deck-title">${deckName.charAt(0).toUpperCase() + deckName.slice(1)} Deck</div>`;
    const container = document.createElement("div");
    container.className = "seat-deck";

    deckSeats.forEach(seat => {
      const btn = document.createElement("button");
      btn.className = "seat-btn";
      btn.textContent = `${seat.number} (₹${seat.price})`;
      const isBooked = window.bookedSeatNumbers.includes(seat.number);

      if (isBooked) {
        btn.disabled = true;
        btn.classList.add("booked");
      } else {
        btn.onclick = () => toggleSeat(seat);
        if (selectedSeats.some(s => s.number === seat.number)) btn.classList.add("selected");
      }
      container.appendChild(btn);
    });
    layoutDiv.appendChild(container);
  }

  renderDeck("lower", lower);
  renderDeck("upper", upper);
  updateSelectionDisplay();
}

// --------- TOGGLE SEAT ---------
function toggleSeat(seat) {
  const index = selectedSeats.findIndex(s => s.number === seat.number);
  if (index > -1) {
    selectedSeats.splice(index, 1);
  } else {
    selectedSeats.push({
      ...seat,
      passengerFrom: selectedRouteStops[0],
      passengerTo: selectedRouteStops[selectedRouteStops.length - 1],
      dynamicFare: seat.price
    });
  }
  updateSelectionDisplay();
  renderSeatLayout(seat.type);
}

// --------- UPDATE FARE ---------
function calculateDynamicFare(from, to, basePrice) {
  const fromIdx = selectedRouteStops.indexOf(from.toLowerCase());
  const toIdx = selectedRouteStops.indexOf(to.toLowerCase());
  if (fromIdx >= 0 && toIdx > fromIdx) {
    const ratio = (toIdx - fromIdx) / (selectedRouteStops.length - 1);
    return Math.round(basePrice * ratio * 100) / 100;
  }
  return basePrice;
}

// --------- DISPLAY SELECTED ---------
function updateSelectionDisplay() {
  const selectedList = selectedSeats.map(seat => seat.number).join(", ") || "None";
  const total = selectedSeats.reduce((sum, s) => sum + s.dynamicFare, 0);

  document.getElementById("selectedSeatsDisplay").textContent = selectedList;
  document.getElementById("totalFare").textContent = `₹${total}`;

  renderPassengerDetails();
}

// --------- RENDER PASSENGER FORM ---------
function renderPassengerDetails() {
  const form = document.getElementById("passengerDetailsForm");
  const section = document.getElementById("passengerDetailsSection");
  form.innerHTML = "";

  selectedSeats.forEach((seat, i) => {
    const fromOptions = selectedRouteStops.map((stop, fromIdx) =>
      `<option value="${stop}" ${stop === seat.passengerFrom ? 'selected' : ''}>${stop}</option>`
    ).join("");

    const toOptions = selectedRouteStops.map((stop, toIdx) => {
      const fromIndex = selectedRouteStops.indexOf(seat.passengerFrom.toLowerCase());
      const disabled = toIdx <= fromIndex ? 'disabled' : '';
      return `<option value="${stop}" ${stop === seat.passengerTo ? 'selected' : ''} ${disabled}>${stop}</option>`;
    }).join("");

    form.innerHTML += `
      <div class="passenger-input-block">
        <h4>Passenger for Seat ${seat.number}</h4>
        <label>From:
          <select name="from${i}" onchange="updateFareForSeat(${i}); updateStopOptions(${i}); validatePassengerForm()">
            ${fromOptions}
          </select>
        </label>
        <label>To:
          <select name="to${i}" onchange="updateFareForSeat(${i}); validatePassengerForm()">
            ${toOptions}
          </select>
        </label>
        <label>Name: <input type="text" name="name${i}" required minlength="2" oninput="validatePassengerForm()"></label><br />
        <label>Age: <input type="number" name="age${i}" required min="1" max="120" oninput="validatePassengerForm()"></label><br />
        <label>Mobile: <input type="tel" name="mobile${i}" required pattern="[6-9]{1}[0-9]{9}" oninput="validatePassengerForm()"></label><br />
        <label>Email: <input type="email" name="email${i}" required value="${userEmail}" oninput="validatePassengerForm()"></label><br />
        <p>Fare: ₹<span id="fare${i}">${seat.dynamicFare}</span></p><hr/>
      </div>
    `;
  });

  section.style.display = selectedSeats.length > 0 ? "block" : "none";

  // Update "to" options after rendering
  setTimeout(() => {
    selectedSeats.forEach((_, i) => updateStopOptions(i));
  }, 0);

  validatePassengerForm();
}

// --------- UPDATE FARE ON CHANGE ---------
function updateFareForSeat(i) {
  const from = document.querySelector(`[name="from${i}"]`).value.toLowerCase();
  const to = document.querySelector(`[name="to${i}"]`).value.toLowerCase();
  const seat = selectedSeats[i];

  const fromIdx = selectedRouteStops.indexOf(from);
  const toIdx = selectedRouteStops.indexOf(to);

  if (fromIdx >= 0 && toIdx > fromIdx) {
    const ratio = (toIdx - fromIdx) / (selectedRouteStops.length - 1);
    const newFare = Math.round(seat.price * ratio * 100) / 100;
    seat.dynamicFare = newFare;
  } else {
    seat.dynamicFare = seat.price;
  }

  seat.passengerFrom = from;
  seat.passengerTo = to;
  document.getElementById(`fare${i}`).textContent = seat.dynamicFare;
  updateSelectionDisplay();
}

// --------- CONFIRM BOOKING ---------
function confirmBooking() {
  const formData = new FormData(document.getElementById("passengerDetailsForm"));

  const passengers = selectedSeats.map((seat, i) => ({
    seatNumber: seat.number,
    seatType: seat.type,
    fare: seat.dynamicFare,
    passengerFrom: seat.passengerFrom,
    passengerTo: seat.passengerTo,
    name: formData.get(`name${i}`),
    age: formData.get(`age${i}`),
    mobile: formData.get(`mobile${i}`),
    email: formData.get(`email${i}`) || userEmail
  }));

  const totalAmount = Math.round(passengers.reduce((sum, p) => sum + p.fare, 0) * 100); // ✔ ensure integer in paise

  fetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `amount=${totalAmount}&currency=INR`
  })
    .then(res => {
      if (!res.ok) throw new Error("❌ Failed to create Razorpay order.");
      return res.json();
    })
    .then(order => {
      const options = {
        key: "rzp_test_38I5IEufjhiOFj",
        amount: order.amount,
        currency: order.currency,
        name: "Online Bus Booking",
        description: "Bus Ticket Payment",
        order_id: order.id,
        handler: function (response) {
          Promise.all(passengers.map(p =>
            fetch("/user/api/bookings/book", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                busId: selectedBusId,
                travelDate: selectedTravelDate,
                customerEmail: userEmail,
                seatNumber: p.seatNumber,
                seatType: p.seatType,
                fare: p.fare,
                passengerName: p.name,
                passengerAge: p.age,
                passengerMobile: p.mobile,
                passengerFrom: p.passengerFrom,
                passengerTo: p.passengerTo
              })
            })
          )).then(() => fetch("/user/api/finalize-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail,
              busId: selectedBusId,
              travelDate: selectedTravelDate,
              seatNumbers: passengers.map(p => p.seatNumber)
            })
          }))
          .then(res => res.text())
          .then(msg => {
            alert("✅ Booking & Payment Successful!\n" + msg);
            selectedSeats = [];
            updateSelectionDisplay();
            showUserSection("bookings");
          })
          .catch(err => {
            console.error("Booking Error:", err);
            alert("❌ Payment successful but booking failed.");
          });
        },
        theme: { color: "#008c7a" }
      };
      new Razorpay(options).open();
    })
    .catch(err => {
      console.error("Payment Error:", err);
      alert("❌ Payment creation failed.");
    });
}

// --------- VALIDATE PASSENGER FORM ---------
function validatePassengerForm() {
  const form = document.getElementById("passengerDetailsForm");
  let allValid = true;

  selectedSeats.forEach((_, i) => {
    const name = form.querySelector(`[name="name${i}"]`);
    const age = form.querySelector(`[name="age${i}"]`);
    const mobile = form.querySelector(`[name="mobile${i}"]`);
    const email = form.querySelector(`[name="email${i}"]`);
    const from = form.querySelector(`[name="from${i}"]`);
    const to = form.querySelector(`[name="to${i}"]`);

    if (
      !name.value.trim() ||
      name.value.length < 2 ||
      isNaN(age.value) || +age.value < 1 || +age.value > 120 ||
      !/^[6-9][0-9]{9}$/.test(mobile.value) ||
      !email.checkValidity() ||
      from.value === to.value
    ) {
      allValid = false;
    }
  });

  document.getElementById("confirmBookingBtn").disabled = !allValid;
}

// --------- DISABLE INVALID "TO" STOPS ---------
function updateStopOptions(index) {
  const fromSelect = document.querySelector(`[name="from${index}"]`);
  const toSelect = document.querySelector(`[name="to${index}"]`);
  const fromIndex = selectedRouteStops.indexOf(fromSelect.value.toLowerCase());

  Array.from(toSelect.options).forEach((opt, i) => {
    opt.disabled = i <= fromIndex;
  });

  if (toSelect.selectedIndex <= fromIndex) {
    toSelect.selectedIndex = fromIndex + 1;
    toSelect.dispatchEvent(new Event("change"));
  }
}

// --------- LOAD BOOKINGS ---------
function loadUserBookings() {
  fetch(`/user/api/bookings/by-user/${userEmail}`)
    .then(res => res.json())
    .then(bookings => {
      const container = document.getElementById("bookingList");
      if (!bookings.length) return container.innerHTML = "<p>No bookings yet.</p>";
      const table = document.createElement("table");
      table.className = "booking-table";
      table.innerHTML = `<thead><tr><th>Bus</th><th>Date</th><th>Seat</th><th>Fare</th><th>Status</th><th>Action</th></tr></thead>`;
      const tbody = document.createElement("tbody");
      bookings.forEach(b => {
        tbody.innerHTML += `
          <tr>
            <td>${b.busName || "-"}</td>
            <td>${b.travelDate}</td>
            <td>${b.seatNumber}</td>
            <td>₹${b.fare}</td>
            <td>${b.status}</td>
            <td>${b.status === 'CONFIRMED' ? `<button onclick="downloadTicket('${b.busId}', '${b.travelDate}', '${b.seatNumber}')">📥 Download</button>` : '-'}</td>
          </tr>`;
      });
      table.appendChild(tbody);
      container.innerHTML = "";
      container.appendChild(table);
    });
}

// --------- DOWNLOAD TICKET ---------
function downloadTicket(busId, date, seatNumber) {
  fetch(`/user/api/bookings/download-ticket?email=${userEmail}&busId=${busId}&travelDate=${date}&seatNumber=${seatNumber}`)
    .then(res => {
      if (!res.ok) throw new Error("Invalid response");
      return res.blob();
    })
    .then(blob => {
      if (blob.size === 0) throw new Error("Empty file");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket_${seatNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      console.error("Ticket download failed:", err);
      alert("❌ Download failed.");
    });
}
