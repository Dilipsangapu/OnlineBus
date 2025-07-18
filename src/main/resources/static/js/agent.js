// ---------- GLOBAL STATE ----------
let selectedBus = null;
let editingBusId = null;
let editingRouteId = null;
let editingStaffId = null;
let editingScheduleId = null;

// ---------- UTILITIES ----------
function resetEditingState() {
  editingBusId = null;
  editingRouteId = null;
  editingStaffId = null;
  editingScheduleId = null;
}

function scrollToForm(formId) {
  const el = document.getElementById(formId);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Toast notification (basic, unobtrusive, optional)
function showToast(msg, duration = 3000) {
  const toast = document.createElement("div");
  toast.innerText = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.right = "30px";
  toast.style.padding = "12px 20px";
  toast.style.background = "#00b39f";
  toast.style.color = "#fff";
  toast.style.borderRadius = "6px";
  toast.style.boxShadow = "0 8px 22px rgba(0,0,0,0.15)";
  toast.style.zIndex = "2000";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ---------- SECTION CONTROL ----------
function showSection(sectionId) {
  document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));

  document.getElementById(sectionId + "Section")?.classList.add("active");
  document.querySelector(`.sidebar li[onclick*="${sectionId}"]`)?.classList.add("active");

  resetEditingState();

  if (sectionId === "dashboard") loadDashboardStats();
  if (sectionId === "buses") fetchBuses();
  if (sectionId === "layout") fetchBusesForLayout();
  if (sectionId === "routes") loadRoutes();
  if (sectionId === "staff") loadStaffSection();
  if (sectionId === "schedule") loadScheduleSection();
  if (sectionId === "bookings") loadBookings();
}

document.addEventListener("DOMContentLoaded", () => {
  showSection("dashboard");
});

// ---------- DASHBOARD ----------
function loadDashboardStats() {
  const agentEmail = document.body.getAttribute("data-email");

  fetch(`/agent/api/stats/${agentEmail}`)
    .then(res => res.json())
    .then(stats => {
      document.getElementById("totalTrips").innerText = stats.totalSchedules;
      document.getElementById("monthlyRevenue").innerText = "₹" + stats.totalRevenue;
      document.getElementById("busCount").innerText = stats.totalBuses;
      document.getElementById("routeCount").innerText = stats.totalRoutes;
      document.getElementById("bookingCount").innerText = stats.totalBookings;
    })
    .catch(err => {
      console.error("Failed to load dashboard stats:", err);
      alert("❌ Could not load dashboard stats.");
    });
}

// ---------- BUSES ----------
function fetchBuses() {
  const agentId = document.body.getAttribute("data-email");
  fetch(`/buses/api/by-operator/${agentId}`)
    .then(res => res.json())
    .then(buses => {
      const tableBody = document.getElementById("busTableBody");
      tableBody.innerHTML = "";
      buses.forEach(bus => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${bus.busName}</td>
          <td>${bus.busNumber}</td>
          <td>${bus.busType}</td>
          <td>${bus.totalSeats}</td>
          <td><a href="/buses/edit/${bus.id}" class="btn-edit">Edit</a></td>
        `;
        tableBody.appendChild(row);
      });
    });
}

document.getElementById("busForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const form = e.target;

  const bus = {
    operatorId: document.body.getAttribute("data-email"),
    operatorName: document.body.getAttribute("data-name"),
    busName: form.busName.value.trim(),
    busNumber: form.busNumber.value.trim(),
    busType: form.busType.value,
    deckType: form.deckType.value,
    sleeperCount: parseInt(form.sleeperSeats.value || 0),
    seaterCount: parseInt(form.seaterSeats.value || 0),
    totalSeats: (parseInt(form.sleeperSeats.value || 0) + parseInt(form.seaterSeats.value || 0)),
    hasUpperDeck: form.deckType.value.includes("Upper"),
    hasLowerDeck: true
  };

  const method = editingBusId ? "PUT" : "POST";
  const url = editingBusId ? `/buses/api/update/${editingBusId}` : "/buses/api/add";

  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bus)
  })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      form.reset();
      editingBusId = null;
      fetchBuses();
    })
    .catch(err => console.error("Save bus error:", err));
});


// ---------- ROUTES ----------
function loadRoutes() {
  const email = document.body.getAttribute("data-email");
  fetch(`/buses/api/by-operator/${email}`)
    .then(res => res.json())
    .then(buses => {
      const select = document.getElementById("busSelect");
      select.innerHTML = '<option value="">Select Bus</option>';
      buses.forEach(bus => {
        const option = document.createElement("option");
        option.value = bus.id;
        option.textContent = `${bus.busName} (${bus.busNumber})`;
        select.appendChild(option);
      });

      select.addEventListener("change", () => {
        const selectedId = select.value;
        selectedBus = buses.find(b => b.id === selectedId);
      });

      loadSavedRoutes(buses);
    });
}

function loadSavedRoutes(buses) {
  const routeList = document.getElementById("routeList");
  routeList.innerHTML = "";
  buses.forEach(bus => {
    fetch(`/api/routes/by-bus/${bus.id}`)
      .then(res => res.json())
      .then(routes => {
        if (!routes.length) return;

        const section = document.createElement("div");
        section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`;

        const table = document.createElement("table");
        table.className = "route-table";
        table.innerHTML = `<thead><tr><th>From</th><th>To</th><th>Stops</th><th>Timings</th><th>Actions</th></tr></thead>`;

        const tbody = document.createElement("tbody");
        routes.forEach(route => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${route.from}</td>
            <td>${route.to}</td>
            <td>${route.stops?.join(", ") || ""}</td>
            <td>${route.timings}</td>
            <td>
              <button onclick='editRoute(${JSON.stringify(route)})'>✏️</button>
              <button onclick='deleteRoute("${route.id}")'>🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        section.appendChild(table);
        routeList.appendChild(section);
      });
  });
}

function editRoute(route) {
  editingRouteId = route.id;
  const form = document.getElementById("routeForm");
  form.from.value = route.from;
  form.to.value = route.to;
  form.stops.value = route.stops.join(", ");
  form.timings.value = route.timings;
  document.getElementById("busSelect").value = route.busId;
  selectedBus = { id: route.busId };

  scrollToForm("routeForm");
}

function deleteRoute(id) {
  fetch(`/api/routes/delete/${id}`, { method: "DELETE" })
    .then(() => loadRoutes());
}

document.getElementById("routeForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;

  if (!selectedBus?.id) return alert("Please select a bus for the route.");

  const route = {
    busId: selectedBus.id,
    from: form.from.value,
    to: form.to.value,
    stops: form.stops.value.split(",").map(s => s.trim()),
    timings: form.timings.value
  };

  const url = editingRouteId ? `/api/routes/update/${editingRouteId}` : "/api/routes/add";
  const method = editingRouteId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route)
    });

    if (!res.ok) throw new Error(await res.text());

    form.reset();
    editingRouteId = null;
    loadRoutes();
  } catch (err) {
    console.error("Error saving route:", err);
    alert("❌ Failed to save route.");
  }
});

// ---------- LAYOUT (SEAT MAP & PRICING) ----------
function fetchBusesForLayout() {
  const email = document.body.getAttribute("data-email");
  fetch(`/buses/api/by-operator/${email}`)
    .then(res => res.json())
    .then(buses => {
      const container = document.getElementById("seatLayoutBusCards");
      container.innerHTML = "";
      buses.forEach(bus => {
        const card = document.createElement("div");
        card.className = "bus-card";
        card.innerHTML = `
          <h4>${bus.busName}</h4>
          <p>${bus.busNumber} | ${bus.busType}</p>
          <p>Deck: ${bus.deckType}</p>
          <p>Seats: ${bus.totalSeats} (S: ${bus.sleeperCount}, T: ${bus.seaterCount})</p>
          <button class="configure-btn">Configure Seats</button>
        `;
        card.querySelector(".configure-btn").addEventListener("click", () => {
          selectedBus = bus;
          renderRedbusLayout(bus);
        });
        container.appendChild(card);
      });
    });
}

function renderRedbusLayout(bus) {
  const lowerDeck = document.getElementById("lowerDeck");
  const upperDeck = document.getElementById("upperDeck");
  lowerDeck.innerHTML = "";
  upperDeck.innerHTML = "";

  const totalSeats = bus.sleeperCount + bus.seaterCount;
  for (let i = 1; i <= totalSeats; i++) {
    const type = i <= bus.sleeperCount ? "sleeper" : "seater";
    const deck = type === "sleeper" ? "upper" : "lower";
    const div = document.createElement("div");
    div.className = `seat ${type}`;
    div.innerHTML = `${type === "sleeper" ? "🏋️" : "🛅"} S${i} <input type="number" placeholder="₹" value="500" />`;
    (deck === "upper" ? upperDeck : lowerDeck).appendChild(div);
  }
  switchDeck("lower");
}

function switchDeck(deck) {
  document.getElementById("lowerDeck").style.display = deck === "lower" ? "grid" : "none";
  document.getElementById("upperDeck").style.display = deck === "upper" ? "grid" : "none";
  document.getElementById("lowerTab").classList.toggle("active", deck === "lower");
  document.getElementById("upperTab").classList.toggle("active", deck === "upper");
}

function saveSeatLayout() {
  if (!selectedBus || !selectedBus.id) {
    alert("Please select a bus to save seat layout.");
    return;
  }

  const layout = {
    busId: selectedBus.id,
    seats: []
  };

  const seatElements = document.querySelectorAll(".seat");
  seatElements.forEach(seat => {
    const number = seat.innerText.split(" ")[1];
    const type = seat.classList.contains("sleeper") ? "sleeper" : "seater";
    const deck = seat.parentElement.id === "upperDeck" ? "upper" : "lower";
    const priceInput = seat.querySelector("input");
    const price = parseInt(priceInput.value || 0);

    layout.seats.push({ number, type, deck, price });
  });

  fetch("/api/seats/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(layout)
  })
    .then(res => {
      if (!res.ok) throw new Error(`Failed with HTTP status ${res.status}`);
      return res.json();
    })
    .then(() => alert("✅ Seat layout saved successfully!"))
    .catch(err => {
      console.error("Error saving seat layout:", err);
      alert("❌ Failed to save seat layout. See console.");
    });
}


// ---------- STAFF FEATURE ----------
function loadStaffSection() {
  const agentId = document.body.getAttribute("data-email");
  fetch(`/buses/api/by-operator/${agentId}`)
    .then(res => res.json())
    .then(buses => {
      const select = document.getElementById("staffBusSelect");
      select.innerHTML = '<option value="">Select Bus</option>';
      buses.forEach(bus => {
        const option = document.createElement("option");
        option.value = bus.id;
        option.textContent = `${bus.busName} (${bus.busNumber})`;
        select.appendChild(option);
      });

      const container = document.getElementById("staffList");
      container.innerHTML = "";
      buses.forEach(bus => {
        fetch(`/api/staff/by-bus/${bus.id}`)
          .then(res => res.json())
          .then(staffList => {
            if (staffList.length === 0) return;
            const section = document.createElement("div");
            section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`;

            const table = document.createElement("table");
            table.className = "route-table";
            table.innerHTML = `
              <thead>
                <tr><th>Driver</th><th>Conductor</th><th>Actions</th></tr>
              </thead>
            `;
            const tbody = document.createElement("tbody");
            staffList.forEach(staff => {
              const row = document.createElement("tr");
              row.innerHTML = `
                <td>${staff.driverName} <br/>📞 ${staff.driverContact}</td>
                <td>${staff.conductorName || '-'} <br/>📞 ${staff.conductorContact || '-'}</td>
                <td>
                  <button onclick='editStaff(${JSON.stringify(staff)})'>✏️</button>
                  <button onclick='deleteStaff("${staff.id}")'>🗑️</button>
                </td>
              `;
              tbody.appendChild(row);
            });
            table.appendChild(tbody);
            section.appendChild(table);
            container.appendChild(section);
          });
      });
    });
}

function editStaff(staff) {
  editingStaffId = staff.id;
  const form = document.getElementById("staffForm");
  form.driverName.value = staff.driverName;
  form.driverContact.value = staff.driverContact;
  form.conductorName.value = staff.conductorName || "";
  form.conductorContact.value = staff.conductorContact || "";
  document.getElementById("staffBusSelect").value = staff.busId;
  scrollToForm("staffForm");
}

function deleteStaff(id) {
  fetch(`/api/staff/delete/${id}`, { method: "DELETE" })
    .then(() => loadStaffSection());
}

document.getElementById("staffForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;

  const staff = {
    busId: document.getElementById("staffBusSelect").value,
    driverName: form.driverName.value,
    driverContact: form.driverContact.value,
    conductorName: form.conductorName.value,
    conductorContact: form.conductorContact.value
  };

  if (!staff.busId) {
    alert("Please select a bus");
    return;
  }

  const url = editingStaffId ? `/api/staff/update/${editingStaffId}` : "/api/staff/add";
  const method = editingStaffId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staff)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    form.reset();
    editingStaffId = null;
    loadStaffSection();
  } catch (err) {
    console.error("Error saving staff:", err);
    alert("❌ Failed to save staff. See console.");
  }
});

// ---------- SCHEDULE FEATURE ----------
function loadScheduleSection() {
  const agentId = document.body.getAttribute("data-email");
  fetch(`/buses/api/by-operator/${agentId}`)
    .then(res => res.json())
    .then(buses => {
      const select = document.getElementById("scheduleBusSelect");
      select.innerHTML = '<option value="">Select Bus</option>';
      buses.forEach(bus => {
        const option = document.createElement("option");
        option.value = bus.id;
        option.textContent = `${bus.busName} (${bus.busNumber})`;
        select.appendChild(option);
      });
      loadScheduleList(buses);
    });
}

function loadScheduleList(buses) {
  const container = document.getElementById("tripScheduleList");
  container.innerHTML = "";
  buses.forEach(bus => {
    fetch(`/api/schedule/by-bus/${bus.id}`)
      .then(res => res.json())
      .then(schedules => {
        if (schedules.length === 0) return;

        const section = document.createElement("div");
        section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`;

        const table = document.createElement("table");
        table.className = "route-table";
        table.innerHTML = `
          <thead><tr><th>Date</th><th>Departure</th><th>Arrival</th><th>Actions</th></tr></thead>
        `;

        const tbody = document.createElement("tbody");
        schedules.forEach(sch => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${sch.date}</td>
            <td>${sch.departureTime}</td>
            <td>${sch.arrivalTime}</td>
            <td>
              <button onclick='editSchedule(${JSON.stringify(sch)})'>✏️</button>
              <button onclick='deleteSchedule("${sch.id}")'>🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        section.appendChild(table);
        container.appendChild(section);
      });
  });
}

function editSchedule(schedule) {
  editingScheduleId = schedule.id;
  document.getElementById("scheduleDate").value = schedule.date;
  document.getElementById("departureTime").value = schedule.departureTime;
  document.getElementById("arrivalTime").value = schedule.arrivalTime;
  document.getElementById("scheduleBusSelect").value = schedule.busId;
  scrollToForm("scheduleSection");
}

function deleteSchedule(id) {
  fetch(`/api/schedule/delete/${id}`, { method: "DELETE" })
    .then(() => loadScheduleSection());
}

document.getElementById("saveScheduleBtn")?.addEventListener("click", async () => {
  const schedule = {
    busId: document.getElementById("scheduleBusSelect").value,
    date: document.getElementById("scheduleDate").value,
    departureTime: document.getElementById("departureTime").value,
    arrivalTime: document.getElementById("arrivalTime").value
  };

  if (!schedule.busId || !schedule.date || !schedule.departureTime || !schedule.arrivalTime) {
    alert("Please fill in all schedule fields");
    return;
  }

  const url = editingScheduleId ? `/api/schedule/update/${editingScheduleId}` : "/api/schedule/add";
  const method = editingScheduleId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    document.getElementById("scheduleDate").value = "";
    document.getElementById("departureTime").value = "";
    document.getElementById("arrivalTime").value = "";
    editingScheduleId = null;
    loadScheduleSection();
  } catch (err) {
    console.error("Error saving schedule:", err);
    alert("❌ Failed to save schedule. See console.");
  }
});

// ---------- BOOKINGS ----------
function loadBookings() {
  const agentId = document.body.getAttribute("data-email");

  fetch(`/agent/api/bookings/by-agent/${agentId}`)
    .then(res => res.json())
    .then(bookings => {
      const container = document.getElementById("bookingList");
      container.innerHTML = "";

      if (bookings.length === 0) {
        container.innerHTML = "<p>No bookings found for your buses.</p>";
        return;
      }

      const table = document.createElement("table");
      table.className = "route-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Passenger</th><th>Email</th><th>Mobile</th>
            <th>From</th><th>To</th>
            <th>Seat</th><th>Fare</th><th>Status</th><th>Date</th>
          </tr>
        </thead>
      `;

      const tbody = document.createElement("tbody");
      bookings.forEach(b => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${b.passengerName}</td>
          <td>${b.email}</td>
          <td>${b.passengerMobile}</td>
          <td>${b.routeFrom}</td>
          <td>${b.routeTo}</td>
          <td>${b.seatNumber}</td>
          <td>₹${b.fare}</td>
          <td>${b.status}</td>
          <td>${b.travelDate}</td>
        `;
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    });
}
