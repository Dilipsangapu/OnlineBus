let selectedSeats = []
let currentSeatLayout = []
let selectedBusId = null
let selectedTravelDate = null
let selectedRouteStops = []
const userEmail = document.body.getAttribute("data-email")

// Add debounce and state management
let isResizing = false
let resizeTimeout = null
let lastSearchData = null

// --------- RAZORPAY INITIALIZATION ---------
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay)
      } else {
        reject(new Error("Razorpay SDK failed to load"))
      }
    }
    script.onerror = () => reject(new Error("Failed to load Razorpay script"))
    document.head.appendChild(script)
  })
}

// --------- INIT ---------
document.addEventListener("DOMContentLoaded", () => {
  showUserSection("search")
  loadRazorpayScript().catch((err) => console.warn("Razorpay preload failed:", err))
})

// --------- SECTIONS ---------
function showUserSection(sectionId) {
  document.querySelectorAll(".user-section").forEach((sec) => sec.classList.remove("active"))
  document.querySelectorAll(".sidebar li").forEach((li) => li.classList.remove("active"))
  document.getElementById(sectionId + "Section").classList.add("active")
  const li = document.querySelector(`.sidebar li[onclick*="${sectionId}"]`)
  if (li) li.classList.add("active")

  if (sectionId === "bookings") loadUserBookings()
  if (sectionId === "profile") loadUserProfile()
}

// --------- SEARCH ---------
document.getElementById("searchForm")?.addEventListener("submit", (e) => {
  e.preventDefault()
  const from = document.getElementById("fromCity").value.trim()
  const to = document.getElementById("toCity").value.trim()
  const date = document.getElementById("travelDate").value

  if (!from || !to || !date) return alert("❗ Please fill all fields.")

  // Store search data for resize handling
  lastSearchData = { from, to, date }
  selectedTravelDate = date

  resetAllBusSelections()
  performSearch(from, to, date)
})

// --------- PERFORM SEARCH (Separated to avoid loops) ---------
function performSearch(from, to, date) {
  fetch(`/user/api/search-buses?from=${from}&to=${to}&date=${date}`)
    .then((res) => res.json())
    .then((buses) => {
      renderSearchResults(buses, date)
    })
    .catch((err) => {
      console.error("Search error:", err)
      alert("❌ Failed to fetch buses.")
    })
}

// --------- RENDER SEARCH RESULTS (Unified function) ---------
function renderSearchResults(buses, date) {
  const resultDiv = document.getElementById("searchResults")
  const isMobile = window.innerWidth <= 768

  if (buses.length === 0) {
    resultDiv.innerHTML = "<p>❌ No buses found.</p>"
    return
  }

  if (isMobile) {
    renderMobileSearchResults(buses, date, resultDiv)
  } else {
    renderDesktopSearchResults(buses, date, resultDiv)
  }
}

// --------- MOBILE SEARCH RESULTS ---------
function renderMobileSearchResults(buses, date, resultDiv) {
  const mobileCards = document.createElement("div")
  mobileCards.className = "mobile-bus-cards"

  buses.forEach((bus) => {
    const card = document.createElement("div")
    card.className = "mobile-bus-card"
    card.id = `mobile-bus-card-${bus.id}`

    card.innerHTML = `
      <div class="mobile-bus-header">
        <div class="mobile-bus-name">${bus.busName}<br><small>(${bus.busNumber})</small></div>
        <div class="mobile-bus-type">${bus.busType}</div>
      </div>
      <div class="mobile-bus-details">
        <div class="mobile-bus-detail">
          <div class="mobile-bus-label">Departure</div>
          <div class="mobile-bus-value">${bus.departureTime}</div>
        </div>
        <div class="mobile-bus-detail">
          <div class="mobile-bus-label">Arrival</div>
          <div class="mobile-bus-value">${bus.arrivalTime}</div>
        </div>
      </div>
      <div class="mobile-bus-actions">
        <button onclick='loadSeatLayout("${bus.id}", "${date}")' class="mobile-view-seats-btn">
          🪑 View & Book Seats
        </button>
      </div>

      <div class="bus-seat-layout-container" id="seatLayoutContainer-${bus.id}" style="display: none;">
        <div class="seat-type-tabs">
          <button onclick="renderSeatLayout('seater', '${bus.id}')" class="tab-btn active">Seater</button>
          <button onclick="renderSeatLayout('sleeper', '${bus.id}')" class="tab-btn">Sleeper</button>
        </div>

        <div class="seat-legend" id="seatLegend-${bus.id}">
          <div class="legend-item">
            <div class="legend-box legend-available"></div>
            <span>Available</span>
          </div>
          <div class="legend-item">
            <div class="legend-box legend-booked"></div>
            <span>Booked</span>
          </div>
          <div class="legend-item">
            <div class="legend-box legend-selected"></div>
            <span>Selected</span>
          </div>
        </div>

        <div class="seat-layout" id="seatLayout-${bus.id}"></div>

        <div class="selection-summary">
          <p><strong>Selected Seats:</strong> <span id="selectedSeatsDisplay-${bus.id}">None</span></p>
          <p><strong>Total Fare:</strong> <span id="totalFare-${bus.id}">₹0</span></p>
        </div>
      </div>

      <div class="bus-passenger-details-section" id="passengerDetailsSection-${bus.id}" style="display: none;">
        <h3>Passenger Details</h3>
        <form id="passengerDetailsForm-${bus.id}" class="passenger-form"></form>
        <button id="confirmBookingBtn-${bus.id}" onclick="confirmBooking('${bus.id}')" disabled class="confirm-booking-btn">
          💳 Confirm Booking & Pay
        </button>
      </div>
    `

    mobileCards.appendChild(card)
  })

  resultDiv.innerHTML = ""
  resultDiv.appendChild(mobileCards)
}

// --------- DESKTOP SEARCH RESULTS ---------
function renderDesktopSearchResults(buses, date, resultDiv) {
  resultDiv.innerHTML = buses
    .map(
      (bus) => `
        <div class="bus-card" id="bus-card-${bus.id}">
          <div class="bus-info">
            <h4>${bus.busName} (${bus.busNumber})</h4>
            <p>Type: ${bus.busType}</p>
            <p>Departure: ${bus.departureTime}</p>
            <p>Arrival: ${bus.arrivalTime}</p>
            <button onclick='loadSeatLayout("${bus.id}", "${date}")' class="view-seats-btn">🪑 View & Book Seats</button>
          </div>

          <div class="bus-seat-layout-container" id="seatLayoutContainer-${bus.id}" style="display: none;">
            <div class="seat-type-tabs">
              <button onclick="renderSeatLayout('seater', '${bus.id}')" class="tab-btn active">Seater</button>
              <button onclick="renderSeatLayout('sleeper', '${bus.id}')" class="tab-btn">Sleeper</button>
            </div>

            <div class="seat-legend" id="seatLegend-${bus.id}">
              <div class="legend-item">
                <div class="legend-box legend-available"></div>
                <span>Available</span>
              </div>
              <div class="legend-item">
                <div class="legend-box legend-booked"></div>
                <span>Booked</span>
              </div>
              <div class="legend-item">
                <div class="legend-box legend-selected"></div>
                <span>Selected</span>
              </div>
            </div>

            <div class="seat-layout" id="seatLayout-${bus.id}"></div>

            <div class="selection-summary">
              <p><strong>Selected Seats:</strong> <span id="selectedSeatsDisplay-${bus.id}">None</span></p>
              <p><strong>Total Fare:</strong> <span id="totalFare-${bus.id}">₹0</span></p>
            </div>
          </div>

          <div class="bus-passenger-details-section" id="passengerDetailsSection-${bus.id}" style="display: none;">
            <h3>Passenger Details</h3>
            <form id="passengerDetailsForm-${bus.id}" class="passenger-form"></form>
            <button id="confirmBookingBtn-${bus.id}" onclick="confirmBooking('${bus.id}')" disabled class="confirm-booking-btn">
              💳 Confirm Booking & Pay
            </button>
          </div>
        </div>
      `,
    )
    .join("")
}

// --------- RESET SELECTIONS ---------
function resetAllBusSelections() {
  selectedSeats = []
  selectedBusId = null
  currentSeatLayout = []
  selectedRouteStops = []

  document.querySelectorAll(".bus-seat-layout-container").forEach((container) => {
    container.style.display = "none"
  })
  document.querySelectorAll(".bus-passenger-details-section").forEach((section) => {
    section.style.display = "none"
  })
}

// --------- LOAD SEAT LAYOUT ---------
function loadSeatLayout(busId, date) {
  resetAllBusSelections()

  selectedBusId = busId
  selectedTravelDate = date
  selectedSeats = []

  Promise.all([
    fetch(`/api/seats/by-bus/${busId}`).then((res) => res.json()),
    fetch(`/user/api/booked-seats?busId=${busId}&date=${date}`).then((res) => res.json()),
    fetch(`/user/api/route/stops/${busId}`).then((res) => res.json()),
  ])
    .then(([seatData, booked, stops]) => {
      currentSeatLayout = seatData?.seats || []
      window.bookedSeatNumbers = booked || []
      selectedRouteStops = stops || []

      const seatLayoutContainer = document.getElementById(`seatLayoutContainer-${busId}`)
      if (seatLayoutContainer) {
        seatLayoutContainer.style.display = "block"
        renderSeatLayout("seater", busId)
        seatLayoutContainer.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    })
    .catch((err) => {
      console.error("Seat layout error:", err)
      alert("❌ Could not load seat layout.")
    })
}

// --------- RENDER SEATS ---------
function renderSeatLayout(type, busId) {
  const layoutDiv = document.getElementById(`seatLayout-${busId}`)
  if (!layoutDiv) return

  layoutDiv.innerHTML = ""
  const filtered = currentSeatLayout.filter((seat) => seat.type === type)
  const lower = filtered.filter((seat) => seat.deck === "lower")
  const upper = filtered.filter((seat) => seat.deck === "upper")

  const tabButtons = document.querySelectorAll(`#seatLayoutContainer-${busId} .tab-btn`)
  tabButtons.forEach((btn) => btn.classList.remove("active"))
  event?.target?.classList.add("active")

  function renderDeck(deckName, deckSeats) {
    if (deckSeats.length === 0) return
    layoutDiv.innerHTML += `<div class="deck-title">${deckName.charAt(0).toUpperCase() + deckName.slice(1)} Deck</div>`
    const container = document.createElement("div")
    container.className = "seat-deck"
    deckSeats.forEach((seat) => {
      const btn = document.createElement("button")
      btn.className = "seat-btn"
      btn.textContent = `${seat.number} (₹${seat.price})`
      const isBooked = window.bookedSeatNumbers.includes(seat.number)
      const isSelected = selectedSeats.some((s) => s.number === seat.number)

      if (isBooked) {
        btn.disabled = true
        btn.classList.add("booked")
        btn.setAttribute("aria-label", `Seat ${seat.number} is booked`)
      } else if (isSelected) {
        btn.classList.add("selected")
        btn.onclick = () => toggleSeat(seat, busId)
        btn.setAttribute("aria-label", `Seat ${seat.number} is selected`)
      } else {
        btn.classList.add("available")
        btn.onclick = () => toggleSeat(seat, busId)
        btn.setAttribute("aria-label", `Seat ${seat.number} is available`)
      }

      container.appendChild(btn)
    })
    layoutDiv.appendChild(container)
  }

  renderDeck("lower", lower)
  renderDeck("upper", upper)
  updateSelectionDisplay(busId)
}

// --------- TOGGLE SEAT ---------
function toggleSeat(seat, busId) {
  const index = selectedSeats.findIndex((s) => s.number === seat.number)
  if (index > -1) {
    selectedSeats.splice(index, 1)
  } else {
    selectedSeats.push({
      ...seat,
      passengerFrom: selectedRouteStops[0],
      passengerTo: selectedRouteStops[selectedRouteStops.length - 1],
      dynamicFare: seat.price,
    })
  }
  updateSelectionDisplay(busId)
  renderSeatLayout(seat.type, busId)
}

// --------- UPDATE FARE ---------
function calculateDynamicFare(from, to, basePrice) {
  const fromIdx = selectedRouteStops.indexOf(from.toLowerCase())
  const toIdx = selectedRouteStops.indexOf(to.toLowerCase())
  if (fromIdx >= 0 && toIdx > fromIdx) {
    const ratio = (toIdx - fromIdx) / (selectedRouteStops.length - 1)
    return Math.round(basePrice * ratio * 100) / 100
  }
  return basePrice
}

// --------- DISPLAY SELECTED ---------
function updateSelectionDisplay(busId) {
  const selectedList = selectedSeats.map((seat) => seat.number).join(", ") || "None"
  const total = selectedSeats.reduce((sum, s) => sum + s.dynamicFare, 0)

  const selectedSeatsDisplay = document.getElementById(`selectedSeatsDisplay-${busId}`)
  const totalFareDisplay = document.getElementById(`totalFare-${busId}`)

  if (selectedSeatsDisplay) selectedSeatsDisplay.textContent = selectedList
  if (totalFareDisplay) totalFareDisplay.textContent = `₹${total}`

  renderPassengerDetails(busId)
}

// --------- RENDER PASSENGER FORM ---------
function renderPassengerDetails(busId) {
  const form = document.getElementById(`passengerDetailsForm-${busId}`)
  const section = document.getElementById(`passengerDetailsSection-${busId}`)

  if (!form || !section) return

  form.innerHTML = ""
  selectedSeats.forEach((seat, i) => {
    const fromOptions = selectedRouteStops
      .map(
        (stop, fromIdx) => `<option value="${stop}" ${stop === seat.passengerFrom ? "selected" : ""}>${stop}</option>`,
      )
      .join("")
    const toOptions = selectedRouteStops
      .map((stop, toIdx) => {
        const fromIndex = selectedRouteStops.indexOf(seat.passengerFrom.toLowerCase())
        const disabled = toIdx <= fromIndex ? "disabled" : ""
        return `<option value="${stop}" ${stop === seat.passengerTo ? "selected" : ""} ${disabled}>${stop}</option>`
      })
      .join("")

    form.innerHTML += `
      <div class="passenger-input-block">
        <h4>Passenger for Seat ${seat.number}</h4>
        <label>From:
          <select name="from${i}" onchange="updateFareForSeat(${i}, '${busId}'); updateStopOptions(${i}, '${busId}'); validatePassengerForm('${busId}')">
            ${fromOptions}
          </select>
        </label>
        <label>To:
          <select name="to${i}" onchange="updateFareForSeat(${i}, '${busId}'); validatePassengerForm('${busId}')">
            ${toOptions}
          </select>
        </label>
        <label>Name: <input type="text" name="name${i}" required minlength="2" oninput="validatePassengerForm('${busId}')"></label><br />
        <label>Age: <input type="number" name="age${i}" required min="1" max="120" oninput="validatePassengerForm('${busId}')"></label><br />
        <label>Mobile: <input type="tel" name="mobile${i}" required pattern="[6-9]{1}[0-9]{9}" oninput="validatePassengerForm('${busId}')"></label><br />
        <label>Email: <input type="email" name="email${i}" required value="${userEmail}" oninput="validatePassengerForm('${busId}')"></label><br />
        <p>Fare: ₹<span id="fare${i}-${busId}">${seat.dynamicFare}</span></p><hr/>
      </div>
    `
  })

  section.style.display = selectedSeats.length > 0 ? "block" : "none"

  setTimeout(() => {
    selectedSeats.forEach((_, i) => updateStopOptions(i, busId))
  }, 0)

  validatePassengerForm(busId)
}

// --------- UPDATE FARE ON CHANGE ---------
function updateFareForSeat(i, busId) {
  const form = document.getElementById(`passengerDetailsForm-${busId}`)
  const from = form.querySelector(`[name="from${i}"]`).value.toLowerCase()
  const to = form.querySelector(`[name="to${i}"]`).value.toLowerCase()
  const seat = selectedSeats[i]
  const fromIdx = selectedRouteStops.indexOf(from)
  const toIdx = selectedRouteStops.indexOf(to)

  if (fromIdx >= 0 && toIdx > fromIdx) {
    const ratio = (toIdx - fromIdx) / (selectedRouteStops.length - 1)
    const newFare = Math.round(seat.price * ratio * 100) / 100
    seat.dynamicFare = newFare
  } else {
    seat.dynamicFare = seat.price
  }

  seat.passengerFrom = from
  seat.passengerTo = to

  const fareElement = document.getElementById(`fare${i}-${busId}`)
  if (fareElement) fareElement.textContent = seat.dynamicFare

  updateSelectionDisplay(busId)
}

// --------- CONFIRM BOOKING ---------
async function confirmBooking(busId) {
  try {
    const confirmBtn = document.getElementById(`confirmBookingBtn-${busId}`)
    const originalText = confirmBtn.textContent
    confirmBtn.textContent = "Loading Payment..."
    confirmBtn.disabled = true

    const formData = new FormData(document.getElementById(`passengerDetailsForm-${busId}`))
    const passengers = selectedSeats.map((seat, i) => ({
      seatNumber: seat.number,
      seatType: seat.type,
      fare: seat.dynamicFare,
      passengerFrom: seat.passengerFrom,
      passengerTo: seat.passengerTo,
      name: formData.get(`name${i}`),
      age: formData.get(`age${i}`),
      mobile: formData.get(`mobile${i}`),
      email: formData.get(`email${i}`) || userEmail,
    }))

    const totalAmount = Math.round(passengers.reduce((sum, p) => sum + p.fare, 0) * 100)

    const orderResponse = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `amount=${totalAmount}&currency=INR`,
    })

    if (!orderResponse.ok) {
      throw new Error("❌ Failed to create payment order.")
    }

    const order = await orderResponse.json()
    const Razorpay = await loadRazorpayScript()

    confirmBtn.textContent = originalText
    confirmBtn.disabled = false

    const options = {
      key: "rzp_test_38I5IEufjhiOFj",
      amount: order.amount,
      currency: order.currency,
      name: "Online Bus Booking",
      description: "Bus Ticket Payment",
      order_id: order.id,
      handler: async (response) => {
        try {
          await Promise.all(
            passengers.map((p) =>
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
                  passengerTo: p.passengerTo,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                }),
              }),
            ),
          )

          const finalizeResponse = await fetch("/user/api/finalize-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail,
              busId: selectedBusId,
              travelDate: selectedTravelDate,
              seatNumbers: passengers.map((p) => p.seatNumber),
              paymentId: response.razorpay_payment_id,
            }),
          })

          const msg = await finalizeResponse.text()
          alert("✅ Booking & Payment Successful!\n" + msg)
          resetAllBusSelections()
          showUserSection("bookings")
        } catch (err) {
          console.error("Booking Error:", err)
          alert(
            "❌ Payment successful but booking failed. Please contact support with Payment ID: " +
              response.razorpay_payment_id,
          )
        }
      },
      modal: {
        ondismiss: () => {
          confirmBtn.textContent = originalText
          confirmBtn.disabled = false
        },
      },
      theme: {
        color: "#008c7a",
      },
    }

    const rzp = new Razorpay(options)
    rzp.open()
  } catch (err) {
    console.error("Payment Error:", err)

    const confirmBtn = document.getElementById(`confirmBookingBtn-${busId}`)
    if (confirmBtn) {
      confirmBtn.textContent = "💳 Confirm Booking & Pay"
      confirmBtn.disabled = false
    }

    if (err.message.includes("Razorpay")) {
      alert("❌ Payment system is currently unavailable. Please try again later.")
    } else {
      alert("❌ Payment creation failed. Please check your connection and try again.")
    }
  }
}

// --------- VALIDATE PASSENGER FORM ---------
function validatePassengerForm(busId) {
  const form = document.getElementById(`passengerDetailsForm-${busId}`)
  const confirmBtn = document.getElementById(`confirmBookingBtn-${busId}`)

  if (!form || !confirmBtn) return

  let allValid = true
  selectedSeats.forEach((_, i) => {
    const name = form.querySelector(`[name="name${i}"]`)
    const age = form.querySelector(`[name="age${i}"]`)
    const mobile = form.querySelector(`[name="mobile${i}"]`)
    const email = form.querySelector(`[name="email${i}"]`)
    const from = form.querySelector(`[name="from${i}"]`)
    const to = form.querySelector(`[name="to${i}"]`)

    if (
      !name?.value.trim() ||
      name?.value.length < 2 ||
      isNaN(age?.value) ||
      +age?.value < 1 ||
      +age?.value > 120 ||
      !/^[6-9][0-9]{9}$/.test(mobile?.value) ||
      !email?.checkValidity() ||
      from?.value === to?.value
    ) {
      allValid = false
    }
  })

  confirmBtn.disabled = !allValid
}

// --------- DISABLE INVALID "TO" STOPS ---------
function updateStopOptions(index, busId) {
  const form = document.getElementById(`passengerDetailsForm-${busId}`)
  const fromSelect = form.querySelector(`[name="from${index}"]`)
  const toSelect = form.querySelector(`[name="to${index}"]`)

  if (!fromSelect || !toSelect) return

  const fromIndex = selectedRouteStops.indexOf(fromSelect.value.toLowerCase())

  Array.from(toSelect.options).forEach((opt, i) => {
    opt.disabled = i <= fromIndex
  })

  if (toSelect.selectedIndex <= fromIndex) {
    toSelect.selectedIndex = fromIndex + 1
    toSelect.dispatchEvent(new Event("change"))
  }
}

// --------- LOAD BOOKINGS ---------
function loadUserBookings() {
  fetch(`/user/api/bookings/by-user/${userEmail}`)
    .then((res) => res.json())
    .then((bookings) => {
      const container = document.getElementById("bookingList")
      if (!bookings.length) {
        container.innerHTML = "<p>No bookings yet.</p>"
        return
      }

      const isMobile = window.innerWidth <= 768

      if (isMobile) {
        const mobileCards = document.createElement("div")
        mobileCards.className = "mobile-booking-cards"

        bookings.forEach((b) => {
          const card = document.createElement("div")
          card.className = "mobile-booking-card"

          card.innerHTML = `
            <div class="mobile-booking-header">
              <div class="mobile-booking-bus">${b.busName || "Bus"}</div>
              <div class="mobile-booking-status">${b.status}</div>
            </div>
            <div class="mobile-booking-details">
              <div class="mobile-booking-detail">
                <div class="mobile-booking-label">Date</div>
                <div class="mobile-booking-value">${b.travelDate}</div>
              </div>
              <div class="mobile-booking-detail">
                <div class="mobile-booking-label">Seat</div>
                <div class="mobile-booking-value">${b.seatNumber}</div>
              </div>
              <div class="mobile-booking-detail">
                <div class="mobile-booking-label">Fare</div>
                <div class="mobile-booking-value">₹${b.fare}</div>
              </div>
              <div class="mobile-booking-detail">
                <div class="mobile-booking-label">From - To</div>
                <div class="mobile-booking-value">${b.passengerFrom || "N/A"} - ${b.passengerTo || "N/A"}</div>
              </div>
            </div>
            ${
              b.status === "CONFIRMED"
                ? `
              <div class="mobile-booking-actions">
                <button class="mobile-download-btn" onclick="downloadTicket('${b.busId}', '${b.travelDate}', '${b.seatNumber}')">
                  📥 Download Ticket
                </button>
              </div>
            `
                : ""
            }
          `

          mobileCards.appendChild(card)
        })

        container.innerHTML = ""
        container.appendChild(mobileCards)
      } else {
        const table = document.createElement("table")
        table.className = "booking-table"
        table.innerHTML = `<thead><tr><th>Bus</th><th>Date</th><th>Seat</th><th>Fare</th><th>Status</th><th>Action</th></tr></thead>`

        const tbody = document.createElement("tbody")
        bookings.forEach((b) => {
          tbody.innerHTML += `
            <tr>
              <td>${b.busName || "-"}</td>
              <td>${b.travelDate}</td>
              <td>${b.seatNumber}</td>
              <td>₹${b.fare}</td>
              <td>${b.status}</td>
              <td>${b.status === "CONFIRMED" ? `<button onclick="downloadTicket('${b.busId}', '${b.travelDate}', '${b.seatNumber}')">📥 Download</button>` : "-"}</td>
            </tr>`
        })

        table.appendChild(tbody)
        container.innerHTML = ""
        container.appendChild(table)
      }
    })
    .catch((err) => {
      console.error("Bookings load error:", err)
      document.getElementById("bookingList").innerHTML = "<p>❌ Failed to load bookings.</p>"
    })
}

// --------- MOBILE PROFILE ---------
function loadUserProfile() {
  const isMobile = window.innerWidth <= 768
  const profileContainer = document.getElementById("profileSection")

  if (isMobile) {
    let mobileProfile = profileContainer.querySelector(".mobile-profile-card")
    if (!mobileProfile) {
      mobileProfile = document.createElement("div")
      mobileProfile.className = "mobile-profile-card"

      const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U"

      mobileProfile.innerHTML = `
        <div class="mobile-profile-header">
          <div class="mobile-profile-avatar">${userInitial}</div>
          <div class="mobile-profile-name">User Profile</div>
          <div class="mobile-profile-email">${userEmail || "user@example.com"}</div>
        </div>
        <div class="mobile-profile-details">
          <div class="mobile-profile-detail">
            <div class="mobile-profile-label">Email</div>
            <div class="mobile-profile-value">${userEmail || "user@example.com"}</div>
          </div>
          <div class="mobile-profile-detail">
            <div class="mobile-profile-label">Account Type</div>
            <div class="mobile-profile-value">Regular User</div>
          </div>
          <div class="mobile-profile-detail">
            <div class="mobile-profile-label">Member Since</div>
            <div class="mobile-profile-value">2024</div>
          </div>
          <div class="mobile-profile-detail">
            <div class="mobile-profile-label">Total Bookings</div>
            <div class="mobile-profile-value">Loading...</div>
          </div>
        </div>
      `

      profileContainer.appendChild(mobileProfile)
    }

    fetch(`/user/api/bookings/by-user/${userEmail}`)
      .then((res) => res.json())
      .then((bookings) => {
        const countElement = mobileProfile.querySelector(".mobile-profile-detail:last-child .mobile-profile-value")
        if (countElement) {
          countElement.textContent = bookings.length.toString()
        }
      })
      .catch(() => {
        const countElement = mobileProfile.querySelector(".mobile-profile-detail:last-child .mobile-profile-value")
        if (countElement) {
          countElement.textContent = "0"
        }
      })
  }
}

// --------- DOWNLOAD TICKET ---------
function downloadTicket(busId, date, seatNumber) {
  fetch(
    `/user/api/bookings/download-ticket?email=${userEmail}&busId=${busId}&travelDate=${date}&seatNumber=${seatNumber}`,
  )
    .then((res) => {
      if (!res.ok) throw new Error("Invalid response")
      return res.blob()
    })
    .then((blob) => {
      if (blob.size === 0) throw new Error("Empty file")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ticket_${seatNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
    .catch((err) => {
      console.error("Ticket download failed:", err)
      alert("❌ Download failed. Please try again or contact support.")
    })
}

// --------- DEBOUNCED RESIZE HANDLER (Fixed) ---------
window.addEventListener("resize", () => {
  if (isResizing) return

  isResizing = true

  // Clear existing timeout
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  // Set new timeout
  resizeTimeout = setTimeout(() => {
    const activeSection = document.querySelector(".user-section.active")
    if (activeSection) {
      const sectionId = activeSection.id.replace("Section", "")

      if (sectionId === "bookings") {
        loadUserBookings()
      } else if (sectionId === "profile") {
        loadUserProfile()
      } else if (sectionId === "search" && lastSearchData) {
        // Only re-render if we have search data and results exist
        const searchResults = document.getElementById("searchResults")
        if (searchResults && searchResults.children.length > 0) {
          // Re-render existing results without new API call
          const buses = Array.from(searchResults.querySelectorAll('[id^="bus-card-"], [id^="mobile-bus-card-"]'))
          if (buses.length > 0) {
            // Extract bus data from existing DOM (simplified approach)
            // In a real scenario, you'd store the bus data in a variable
            console.log("Resize detected - layout will adjust automatically via CSS")
          }
        }
      }
    }

    isResizing = false
  }, 250) // 250ms debounce
})
