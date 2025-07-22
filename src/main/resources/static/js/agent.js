// ---------- GLOBAL STATE ----------
let selectedBus = null
let editingBusId = null
let editingRouteId = null
let editingStaffId = null
let editingScheduleId = null
let isMobileView = false
let resizeTimeout = null
const lastSectionData = {}
let isLoading = false
let isSidebarOpen = false

// ---------- MOBILE DETECTION & RESIZE HANDLING ----------
function checkMobileView() {
  return window.innerWidth <= 768
}

function handleResize() {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    const newMobileView = checkMobileView()
    if (newMobileView !== isMobileView) {
      isMobileView = newMobileView
      updateSidebarForViewport()
      const activeSection = document.querySelector(".dashboard-section.active")
      if (activeSection) {
        const sectionId = activeSection.id.replace("Section", "")
        renderDataForCurrentView(sectionId)
      }
    }
  }, 250)
}

window.addEventListener("resize", handleResize)

// ---------- MOBILE SIDEBAR FUNCTIONALITY ----------
function createMobileMenuToggle() {
  // Create toggle button if it doesn't exist
  let toggleBtn = document.getElementById("mobileMenuToggle")
  if (!toggleBtn) {
    toggleBtn = document.createElement("button")
    toggleBtn.id = "mobileMenuToggle"
    toggleBtn.className = "mobile-menu-toggle"
    toggleBtn.innerHTML = "☰"
    toggleBtn.setAttribute("aria-label", "Toggle menu")
    document.body.appendChild(toggleBtn)

    toggleBtn.addEventListener("click", toggleMobileSidebar)
  }
  return toggleBtn
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector(".sidebar")
  const overlay = document.getElementById("sidebarOverlay")

  isSidebarOpen = !isSidebarOpen

  if (isSidebarOpen) {
    // Open sidebar
    sidebar.classList.add("mobile-open")
    createSidebarOverlay()
    document.body.style.overflow = "hidden" // Prevent background scroll
  } else {
    // Close sidebar
    sidebar.classList.remove("mobile-open")
    removeSidebarOverlay()
    document.body.style.overflow = ""
  }

  // Update toggle button icon
  const toggleBtn = document.getElementById("mobileMenuToggle")
  if (toggleBtn) {
    toggleBtn.innerHTML = isSidebarOpen ? "✕" : "☰"
  }
}

function createSidebarOverlay() {
  let overlay = document.getElementById("sidebarOverlay")
  if (!overlay) {
    overlay = document.createElement("div")
    overlay.id = "sidebarOverlay"
    overlay.className = "sidebar-overlay"
    overlay.addEventListener("click", closeMobileSidebar)
    document.body.appendChild(overlay)
  }
  overlay.style.display = "block"
}

function removeSidebarOverlay() {
  const overlay = document.getElementById("sidebarOverlay")
  if (overlay) {
    overlay.style.display = "none"
  }
}

function closeMobileSidebar() {
  if (isSidebarOpen) {
    toggleMobileSidebar()
  }
}

function updateSidebarForViewport() {
  const sidebar = document.querySelector(".sidebar")
  const toggleBtn = document.getElementById("mobileMenuToggle")

  if (isMobileView) {
    // Mobile view
    createMobileMenuToggle()
    if (toggleBtn) toggleBtn.style.display = "block"
    sidebar.classList.remove("mobile-open")
    removeSidebarOverlay()
    isSidebarOpen = false
    document.body.style.overflow = ""
  } else {
    // Desktop view
    if (toggleBtn) toggleBtn.style.display = "none"
    sidebar.classList.remove("mobile-open")
    removeSidebarOverlay()
    isSidebarOpen = false
    document.body.style.overflow = ""
  }
}

// ---------- UTILITIES ----------
function resetEditingState() {
  editingBusId = null
  editingRouteId = null
  editingStaffId = null
  editingScheduleId = null
}

function scrollToForm(formId) {
  const el = document.getElementById(formId)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    // Add mobile-specific scroll offset
    if (isMobileView) {
      setTimeout(() => {
        window.scrollBy(0, -60)
      }, 300)
    }
  }
}

// Enhanced toast notification with mobile positioning
function showToast(msg, type = "success", duration = 3000) {
  const toast = document.createElement("div")
  toast.innerText = msg
  toast.className = `toast toast-${type}`
  toast.style.position = "fixed"
  toast.style.bottom = isMobileView ? "80px" : "30px"
  toast.style.right = isMobileView ? "16px" : "30px"
  toast.style.left = isMobileView ? "16px" : "auto"
  toast.style.padding = "12px 20px"
  toast.style.background = type === "error" ? "#f44336" : "#00b39f"
  toast.style.color = "#fff"
  toast.style.borderRadius = "8px"
  toast.style.boxShadow = "0 8px 22px rgba(0,0,0,0.15)"
  toast.style.zIndex = "2000"
  toast.style.fontSize = isMobileView ? "14px" : "16px"
  toast.style.textAlign = "center"
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(20px)"
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

function confirmAction(message, callback) {
  if (confirm(message)) {
    callback()
  }
}

// ---------- SECTION CONTROL ----------
function showSection(sectionId) {
  if (isLoading) return

  document.querySelectorAll(".dashboard-section").forEach((sec) => sec.classList.remove("active"))
  document.querySelectorAll(".sidebar li").forEach((li) => li.classList.remove("active"))

  const section = document.getElementById(sectionId + "Section")
  if (section) section.classList.add("active")

  const menuItem = document.querySelector(`.sidebar li[onclick*="${sectionId}"]`)
  if (menuItem) menuItem.classList.add("active")

  resetEditingState()
  isMobileView = checkMobileView()

  // Close mobile sidebar when section is selected
  if (isMobileView && isSidebarOpen) {
    closeMobileSidebar()
  }

  // Load section data
  switch (sectionId) {
    case "dashboard":
      loadDashboardStats()
      break
    case "buses":
      loadBusesSection()
      break
    case "layout":
      loadLayoutSection()
      break
    case "routes":
      loadRoutesSection()
      break
    case "staff":
      loadStaffSection()
      break
    case "schedule":
      loadScheduleSection()
      break
    case "bookings":
      loadBookingsSection()
      break
  }
}

function renderDataForCurrentView(sectionId) {
  if (!lastSectionData[sectionId]) return

  switch (sectionId) {
    case "buses":
      renderBusesForCurrentView(lastSectionData[sectionId])
      break
    case "routes":
      renderRoutesForCurrentView(lastSectionData[sectionId])
      break
    case "staff":
      renderStaffForCurrentView(lastSectionData[sectionId])
      break
    case "schedule":
      renderScheduleForCurrentView(lastSectionData[sectionId])
      break
    case "bookings":
      renderBookingsForCurrentView(lastSectionData[sectionId])
      break
  }
}

document.addEventListener("DOMContentLoaded", () => {
  isMobileView = checkMobileView()
  updateSidebarForViewport()

  // Add touch feedback for mobile
  if (isMobileView) {
    document.body.classList.add("mobile-view")

    // Add touch feedback to buttons
    document.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.matches("button, .action-btn, .configure-btn")) {
          e.target.style.transform = "scale(0.95)"
        }
      },
      { passive: true },
    )

    document.addEventListener(
      "touchend",
      (e) => {
        if (e.target.matches("button, .action-btn, .configure-btn")) {
          setTimeout(() => {
            e.target.style.transform = ""
          }, 150)
        }
      },
      { passive: true },
    )
  }

  // Add click handlers to sidebar items to close mobile sidebar
  document.querySelectorAll(".sidebar li").forEach((item) => {
    item.addEventListener("click", () => {
      if (isMobileView && isSidebarOpen) {
        setTimeout(() => closeMobileSidebar(), 100)
      }
    })
  })

  showSection("dashboard")
})

// ---------- DASHBOARD ----------
function loadDashboardStats() {
  if (isLoading) return
  isLoading = true

  const agentEmail = document.body.getAttribute("data-email")
  fetch(`/agent/api/stats/${agentEmail}`)
    .then((res) => res.json())
    .then((stats) => {
      document.getElementById("totalTrips").innerText = stats.totalSchedules || 0
      document.getElementById("monthlyRevenue").innerText = "₹" + (stats.totalRevenue || 0)
      document.getElementById("busCount").innerText = stats.totalBuses || 0
      document.getElementById("routeCount").innerText = stats.totalRoutes || 0
      document.getElementById("bookingCount").innerText = stats.totalBookings || 0
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load dashboard stats:", err)
      showToast("Could not load dashboard stats", "error")
      isLoading = false
    })
}

// ---------- BUSES ----------
function loadBusesSection() {
  if (isLoading) return
  isLoading = true

  const agentId = document.body.getAttribute("data-email")
  fetch(`/buses/api/by-operator/${agentId}`)
    .then((res) => res.json())
    .then((buses) => {
      lastSectionData.buses = buses
      renderBusesForCurrentView(buses)
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load buses:", err)
      showToast("Could not load buses", "error")
      isLoading = false
    })
}

function renderBusesForCurrentView(buses) {
  if (isMobileView) {
    renderBusesMobile(buses)
  } else {
    renderBusesDesktop(buses)
  }
}

function renderBusesDesktop(buses) {
  const tableBody = document.getElementById("busTableBody")
  if (!tableBody) return

  tableBody.innerHTML = ""
  buses.forEach((bus) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${bus.busName}</td>
      <td>${bus.busNumber}</td>
      <td>${bus.busType}</td>
      <td>${bus.totalSeats}</td>
      <td class="action-buttons">
        <button class="action-btn edit" onclick="editBus('${bus.id}')">✏️ Edit</button>
        <button class="action-btn delete" onclick="confirmAction('Delete this bus?', () => deleteBus('${bus.id}'))">🗑️ Delete</button>
      </td>
    `
    tableBody.appendChild(row)
  })

  // Show table, hide mobile cards
  const table = document.querySelector("#busesSection table")
  const mobileCards = document.querySelector("#busMobileCards")
  if (table) table.style.display = "table"
  if (mobileCards) mobileCards.style.display = "none"
}

function renderBusesMobile(buses) {
  let container = document.getElementById("busMobileCards")
  if (!container) {
    container = document.createElement("div")
    container.id = "busMobileCards"
    container.className = "mobile-table-cards"
    const tableWrapper = document.querySelector("#busesSection .table-wrapper")
    if (tableWrapper) {
      tableWrapper.appendChild(container)
    }
  }

  container.innerHTML = ""
  buses.forEach((bus) => {
    const card = document.createElement("div")
    card.className = "mobile-table-card"
    card.innerHTML = `
      <div class="mobile-card-header">
        <div class="mobile-card-title">${bus.busName}</div>
        <div class="mobile-card-status">${bus.busType}</div>
      </div>
      <div class="mobile-card-details">
        <div class="mobile-card-detail">
          <div class="mobile-card-label">Bus Number</div>
          <div class="mobile-card-value">${bus.busNumber}</div>
        </div>
        <div class="mobile-card-detail">
          <div class="mobile-card-label">Total Seats</div>
          <div class="mobile-card-value">${bus.totalSeats}</div>
        </div>
      </div>
      <div class="mobile-card-actions">
        <button class="action-btn edit" onclick="editBus('${bus.id}')">✏️ Edit</button>
        <button class="action-btn delete" onclick="confirmAction('Delete this bus?', () => deleteBus('${bus.id}'))">🗑️ Delete</button>
      </div>
    `
    container.appendChild(card)
  })

  // Hide table, show mobile cards
  const table = document.querySelector("#busesSection table")
  if (table) table.style.display = "none"
  container.style.display = "block"
}

function editBus(busId) {
  const buses = lastSectionData.buses || []
  const bus = buses.find((b) => b.id === busId)
  if (!bus) return

  editingBusId = busId
  const form = document.getElementById("busForm")
  if (form) {
    form.busName.value = bus.busName
    form.busNumber.value = bus.busNumber
    form.busType.value = bus.busType
    form.deckType.value = bus.deckType
    form.sleeperSeats.value = bus.sleeperCount
    form.seaterSeats.value = bus.seaterCount
    scrollToForm("busForm")
  }
}

function deleteBus(busId) {
  fetch(`/buses/api/delete/${busId}`, { method: "DELETE" })
    .then((res) => res.text())
    .then((msg) => {
      showToast(msg)
      loadBusesSection()
    })
    .catch((err) => {
      console.error("Delete bus error:", err)
      showToast("Failed to delete bus", "error")
    })
}

// Bus form submission
document.getElementById("busForm")?.addEventListener("submit", (e) => {
  e.preventDefault()
  if (isLoading) return

  const form = e.target
  const bus = {
    operatorId: document.body.getAttribute("data-email"),
    operatorName: document.body.getAttribute("data-name"),
    busName: form.busName.value.trim(),
    busNumber: form.busNumber.value.trim(),
    busType: form.busType.value,
    deckType: form.deckType.value,
    sleeperCount: Number.parseInt(form.sleeperSeats.value || 0),
    seaterCount: Number.parseInt(form.seaterSeats.value || 0),
    totalSeats: Number.parseInt(form.sleeperSeats.value || 0) + Number.parseInt(form.seaterSeats.value || 0),
    hasUpperDeck: form.deckType.value.includes("Upper"),
    hasLowerDeck: true,
  }

  const method = editingBusId ? "PUT" : "POST"
  const url = editingBusId ? `/buses/api/update/${editingBusId}` : "/buses/api/add"

  isLoading = true
  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bus),
  })
    .then((res) => res.text())
    .then((msg) => {
      showToast(msg)
      form.reset()
      editingBusId = null
      loadBusesSection()
      isLoading = false
    })
    .catch((err) => {
      console.error("Save bus error:", err)
      showToast("Failed to save bus", "error")
      isLoading = false
    })
})

// ---------- ROUTES ----------
function loadRoutesSection() {
  if (isLoading) return
  isLoading = true

  const email = document.body.getAttribute("data-email")
  fetch(`/buses/api/by-operator/${email}`)
    .then((res) => res.json())
    .then((buses) => {
      const select = document.getElementById("busSelect")
      if (select) {
        select.innerHTML = '<option value="">Select Bus</option>'
        buses.forEach((bus) => {
          const option = document.createElement("option")
          option.value = bus.id
          option.textContent = `${bus.busName} (${bus.busNumber})`
          select.appendChild(option)
        })

        select.addEventListener("change", () => {
          const selectedId = select.value
          selectedBus = buses.find((b) => b.id === selectedId)
        })
      }

      loadSavedRoutes(buses)
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load routes:", err)
      showToast("Could not load routes", "error")
      isLoading = false
    })
}

function loadSavedRoutes(buses) {
  const routePromises = buses.map((bus) =>
    fetch(`/api/routes/by-bus/${bus.id}`)
      .then((res) => res.json())
      .then((routes) => ({ bus, routes })),
  )

  Promise.all(routePromises)
    .then((results) => {
      const allRoutes = results.filter((r) => r.routes.length > 0)
      lastSectionData.routes = allRoutes
      renderRoutesForCurrentView(allRoutes)
    })
    .catch((err) => {
      console.error("Failed to load saved routes:", err)
      showToast("Could not load saved routes", "error")
    })
}

function renderRoutesForCurrentView(routeData) {
  if (isMobileView) {
    renderRoutesMobile(routeData)
  } else {
    renderRoutesDesktop(routeData)
  }
}

function renderRoutesDesktop(routeData) {
  const routeList = document.getElementById("routeList")
  if (!routeList) return

  routeList.innerHTML = ""
  routeData.forEach(({ bus, routes }) => {
    const section = document.createElement("div")
    section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`
    const table = document.createElement("table")
    table.className = "route-table"
    table.innerHTML = `<thead><tr><th>From</th><th>To</th><th>Stops</th><th>Timings</th><th>Actions</th></tr></thead>`
    const tbody = document.createElement("tbody")

    routes.forEach((route) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${route.from}</td>
        <td>${route.to}</td>
        <td>${route.stops?.join(", ") || ""}</td>
        <td>${route.timings}</td>
        <td class="action-buttons">
          <button class="action-btn edit" onclick='editRoute(${JSON.stringify(route)})'>✏️ Edit</button>
          <button class="action-btn delete" onclick='confirmAction("Delete this route?", () => deleteRoute("${route.id}"))'>🗑️ Delete</button>
        </td>
      `
      tbody.appendChild(row)
    })

    table.appendChild(tbody)
    section.appendChild(table)
    routeList.appendChild(section)
  })
}

function renderRoutesMobile(routeData) {
  const routeList = document.getElementById("routeList")
  if (!routeList) return

  routeList.innerHTML = ""
  routeData.forEach(({ bus, routes }) => {
    const section = document.createElement("div")
    section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`

    routes.forEach((route) => {
      const card = document.createElement("div")
      card.className = "mobile-table-card"
      card.innerHTML = `
        <div class="mobile-card-header">
          <div class="mobile-card-title">${route.from} → ${route.to}</div>
        </div>
        <div class="mobile-card-details">
          <div class="mobile-card-detail">
            <div class="mobile-card-label">Stops</div>
            <div class="mobile-card-value">${route.stops?.join(", ") || "Direct"}</div>
          </div>
          <div class="mobile-card-detail">
            <div class="mobile-card-label">Timings</div>
            <div class="mobile-card-value">${route.timings}</div>
          </div>
        </div>
        <div class="mobile-card-actions">
          <button class="action-btn edit" onclick='editRoute(${JSON.stringify(route)})'>✏️ Edit</button>
          <button class="action-btn delete" onclick='confirmAction("Delete this route?", () => deleteRoute("${route.id}"))'>🗑️ Delete</button>
        </div>
      `
      section.appendChild(card)
    })

    routeList.appendChild(section)
  })
}

function editRoute(route) {
  editingRouteId = route.id
  const form = document.getElementById("routeForm")
  if (form) {
    form.from.value = route.from
    form.to.value = route.to
    form.stops.value = route.stops?.join(", ") || ""
    form.timings.value = route.timings
    document.getElementById("busSelect").value = route.busId
    selectedBus = { id: route.busId }
    scrollToForm("routeForm")
  }
}

function deleteRoute(id) {
  fetch(`/api/routes/delete/${id}`, { method: "DELETE" })
    .then(() => {
      showToast("Route deleted successfully")
      loadRoutesSection()
    })
    .catch((err) => {
      console.error("Delete route error:", err)
      showToast("Failed to delete route", "error")
    })
}

// Route form submission
document.getElementById("routeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()
  if (isLoading) return

  const form = e.target
  if (!selectedBus?.id) {
    showToast("Please select a bus for the route", "error")
    return
  }

  const route = {
    busId: selectedBus.id,
    from: form.from.value,
    to: form.to.value,
    stops: form.stops.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s),
    timings: form.timings.value,
  }

  const url = editingRouteId ? `/api/routes/update/${editingRouteId}` : "/api/routes/add"
  const method = editingRouteId ? "PUT" : "POST"

  isLoading = true
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route),
    })

    if (!res.ok) throw new Error(await res.text())

    showToast("Route saved successfully")
    form.reset()
    editingRouteId = null
    selectedBus = null
    loadRoutesSection()
    isLoading = false
  } catch (err) {
    console.error("Error saving route:", err)
    showToast("Failed to save route", "error")
    isLoading = false
  }
})

// ---------- LAYOUT (SEAT MAP & PRICING) ----------
function loadLayoutSection() {
  if (isLoading) return
  isLoading = true

  const email = document.body.getAttribute("data-email")
  fetch(`/buses/api/by-operator/${email}`)
    .then((res) => res.json())
    .then((buses) => {
      lastSectionData.layout = buses
      renderLayoutForCurrentView(buses)
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load layout:", err)
      showToast("Could not load bus layout", "error")
      isLoading = false
    })
}

function renderLayoutForCurrentView(buses) {
  const container = document.getElementById("seatLayoutBusCards")
  if (!container) return

  container.innerHTML = ""
  buses.forEach((bus) => {
    const card = document.createElement("div")
    card.className = "bus-card"
    card.innerHTML = `
      <h4>${bus.busName}</h4>
      <p>${bus.busNumber} | ${bus.busType}</p>
      <p>Deck: ${bus.deckType}</p>
      <p>Seats: ${bus.totalSeats} (S: ${bus.sleeperCount}, T: ${bus.seaterCount})</p>
      <button class="configure-btn" onclick="selectBusForLayout('${bus.id}')">Configure Seats</button>
    `
    container.appendChild(card)
  })
}

function selectBusForLayout(busId) {
  const buses = lastSectionData.layout || []
  const bus = buses.find((b) => b.id === busId)
  if (bus) {
    selectedBus = bus
    renderRedbusLayout(bus)
  }
}

function renderRedbusLayout(bus) {
  const lowerDeck = document.getElementById("lowerDeck")
  const upperDeck = document.getElementById("upperDeck")
  if (!lowerDeck || !upperDeck) return

  lowerDeck.innerHTML = ""
  upperDeck.innerHTML = ""

  const totalSeats = bus.sleeperCount + bus.seaterCount
  for (let i = 1; i <= totalSeats; i++) {
    const type = i <= bus.sleeperCount ? "sleeper" : "seater"
    const deck = type === "sleeper" ? "upper" : "lower"
    const div = document.createElement("div")
    div.className = `seat ${type}`
    div.innerHTML = `${type === "sleeper" ? "🏋️" : "🛅"} S${i} <input type="number" placeholder="₹" value="500" min="0" />`
    ;(deck === "upper" ? upperDeck : lowerDeck).appendChild(div)
  }

  switchDeck("lower")
}

function switchDeck(deck) {
  const lowerDeck = document.getElementById("lowerDeck")
  const upperDeck = document.getElementById("upperDeck")
  const lowerTab = document.getElementById("lowerTab")
  const upperTab = document.getElementById("upperTab")

  if (lowerDeck) lowerDeck.style.display = deck === "lower" ? "grid" : "none"
  if (upperDeck) upperDeck.style.display = deck === "upper" ? "grid" : "none"
  if (lowerTab) lowerTab.classList.toggle("active", deck === "lower")
  if (upperTab) upperTab.classList.toggle("active", deck === "upper")
}

function saveSeatLayout() {
  if (!selectedBus || !selectedBus.id) {
    showToast("Please select a bus to save seat layout", "error")
    return
  }

  const layout = {
    busId: selectedBus.id,
    seats: [],
  }

  const seatElements = document.querySelectorAll(".seat")
  seatElements.forEach((seat) => {
    const number = seat.innerText.split(" ")[1]
    const type = seat.classList.contains("sleeper") ? "sleeper" : "seater"
    const deck = seat.parentElement.id === "upperDeck" ? "upper" : "lower"
    const priceInput = seat.querySelector("input")
    const price = Number.parseInt(priceInput.value || 0)
    layout.seats.push({ number, type, deck, price })
  })

  fetch("/api/seats/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(layout),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed with HTTP status ${res.status}`)
      return res.json()
    })
    .then(() => showToast("Seat layout saved successfully!"))
    .catch((err) => {
      console.error("Error saving seat layout:", err)
      showToast("Failed to save seat layout", "error")
    })
}

// ---------- STAFF FEATURE ----------
function loadStaffSection() {
  if (isLoading) return
  isLoading = true

  const agentId = document.body.getAttribute("data-email")
  fetch(`/buses/api/by-operator/${agentId}`)
    .then((res) => res.json())
    .then((buses) => {
      const select = document.getElementById("staffBusSelect")
      if (select) {
        select.innerHTML = '<option value="">Select Bus</option>'
        buses.forEach((bus) => {
          const option = document.createElement("option")
          option.value = bus.id
          option.textContent = `${bus.busName} (${bus.busNumber})`
          select.appendChild(option)
        })
      }

      loadStaffData(buses)
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load staff section:", err)
      showToast("Could not load staff section", "error")
      isLoading = false
    })
}

function loadStaffData(buses) {
  const staffPromises = buses.map((bus) =>
    fetch(`/api/staff/by-bus/${bus.id}`)
      .then((res) => res.json())
      .then((staffList) => ({ bus, staffList })),
  )

  Promise.all(staffPromises)
    .then((results) => {
      const allStaff = results.filter((r) => r.staffList.length > 0)
      lastSectionData.staff = allStaff
      renderStaffForCurrentView(allStaff)
    })
    .catch((err) => {
      console.error("Failed to load staff data:", err)
      showToast("Could not load staff data", "error")
    })
}

function renderStaffForCurrentView(staffData) {
  if (isMobileView) {
    renderStaffMobile(staffData)
  } else {
    renderStaffDesktop(staffData)
  }
}

function renderStaffDesktop(staffData) {
  const container = document.getElementById("staffList")
  if (!container) return

  container.innerHTML = ""
  staffData.forEach(({ bus, staffList }) => {
    const section = document.createElement("div")
    section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`
    const table = document.createElement("table")
    table.className = "route-table"
    table.innerHTML = `
      <thead>
        <tr><th>Driver</th><th>Conductor</th><th>Actions</th></tr>
      </thead>
    `
    const tbody = document.createElement("tbody")

    staffList.forEach((staff) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${staff.driverName} <br/>📞 ${staff.driverContact}</td>
        <td>${staff.conductorName || "-"} <br/>📞 ${staff.conductorContact || "-"}</td>
        <td class="action-buttons">
          <button class="action-btn edit" onclick='editStaff(${JSON.stringify(staff)})'>✏️ Edit</button>
          <button class="action-btn delete" onclick='confirmAction("Delete this staff?", () => deleteStaff("${staff.id}"))'>🗑️ Delete</button>
        </td>
      `
      tbody.appendChild(row)
    })

    table.appendChild(tbody)
    section.appendChild(table)
    container.appendChild(section)
  })
}

function renderStaffMobile(staffData) {
  const container = document.getElementById("staffList")
  if (!container) return

  container.innerHTML = ""
  staffData.forEach(({ bus, staffList }) => {
    const section = document.createElement("div")
    section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`

    staffList.forEach((staff) => {
      const card = document.createElement("div")
      card.className = "mobile-table-card"
      card.innerHTML = `
        <div class="mobile-card-header">
          <div class="mobile-card-title">Staff Details</div>
        </div>
        <div class="mobile-card-details">
          <div class="mobile-card-detail">
            <div class="mobile-card-label">Driver</div>
            <div class="mobile-card-value">${staff.driverName}<br/>📞 ${staff.driverContact}</div>
          </div>
          <div class="mobile-card-detail">
            <div class="mobile-card-label">Conductor</div>
            <div class="mobile-card-value">${staff.conductorName || "Not assigned"}<br/>📞 ${staff.conductorContact || "-"}</div>
          </div>
        </div>
        <div class="mobile-card-actions">
          <button class="action-btn edit" onclick='editStaff(${JSON.stringify(staff)})'>✏️ Edit</button>
          <button class="action-btn delete" onclick='confirmAction("Delete this staff?", () => deleteStaff("${staff.id}"))'>🗑️ Delete</button>
        </div>
      `
      section.appendChild(card)
    })

    container.appendChild(section)
  })
}

function editStaff(staff) {
  editingStaffId = staff.id
  const form = document.getElementById("staffForm")
  if (form) {
    form.driverName.value = staff.driverName
    form.driverContact.value = staff.driverContact
    form.conductorName.value = staff.conductorName || ""
    form.conductorContact.value = staff.conductorContact || ""
    document.getElementById("staffBusSelect").value = staff.busId
    scrollToForm("staffForm")
  }
}

function deleteStaff(id) {
  fetch(`/api/staff/delete/${id}`, { method: "DELETE" })
    .then(() => {
      showToast("Staff deleted successfully")
      loadStaffSection()
    })
    .catch((err) => {
      console.error("Delete staff error:", err)
      showToast("Failed to delete staff", "error")
    })
}

// Staff form submission
document.getElementById("staffForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()
  if (isLoading) return

  const form = e.target
  const staff = {
    busId: document.getElementById("staffBusSelect").value,
    driverName: form.driverName.value,
    driverContact: form.driverContact.value,
    conductorName: form.conductorName.value,
    conductorContact: form.conductorContact.value,
  }

  if (!staff.busId) {
    showToast("Please select a bus", "error")
    return
  }

  const url = editingStaffId ? `/api/staff/update/${editingStaffId}` : "/api/staff/add"
  const method = editingStaffId ? "PUT" : "POST"

  isLoading = true
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staff),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    showToast("Staff saved successfully")
    form.reset()
    editingStaffId = null
    loadStaffSection()
    isLoading = false
  } catch (err) {
    console.error("Error saving staff:", err)
    showToast("Failed to save staff", "error")
    isLoading = false
  }
})

// ---------- SCHEDULE FEATURE ----------
function loadScheduleSection() {
  if (isLoading) return
  isLoading = true

  const agentId = document.body.getAttribute("data-email")
  fetch(`/buses/api/by-operator/${agentId}`)
    .then((res) => res.json())
    .then((buses) => {
      const select = document.getElementById("scheduleBusSelect")
      if (select) {
        select.innerHTML = '<option value="">Select Bus</option>'
        buses.forEach((bus) => {
          const option = document.createElement("option")
          option.value = bus.id
          option.textContent = `${bus.busName} (${bus.busNumber})`
          select.appendChild(option)
        })
      }

      loadScheduleData(buses)
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load schedule section:", err)
      showToast("Could not load schedule section", "error")
      isLoading = false
    })
}

function loadScheduleData(buses) {
  const schedulePromises = buses.map((bus) =>
    fetch(`/api/schedule/by-bus/${bus.id}`)
      .then((res) => res.json())
      .then((schedules) => ({ bus, schedules })),
  )

  Promise.all(schedulePromises)
    .then((results) => {
      const allSchedules = results.filter((r) => r.schedules.length > 0)
      lastSectionData.schedule = allSchedules
      renderScheduleForCurrentView(allSchedules)
    })
    .catch((err) => {
      console.error("Failed to load schedule data:", err)
      showToast("Could not load schedule data", "error")
    })
}

function renderScheduleForCurrentView(scheduleData) {
  if (isMobileView) {
    renderScheduleMobile(scheduleData)
  } else {
    renderScheduleDesktop(scheduleData)
  }
}

function renderScheduleDesktop(scheduleData) {
  const container = document.getElementById("tripScheduleList")
  if (!container) return

  container.innerHTML = ""
  scheduleData.forEach(({ bus, schedules }) => {
    const section = document.createElement("div")
    section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`
    const table = document.createElement("table")
    table.className = "route-table"
    table.innerHTML = `
      <thead><tr><th>Date</th><th>Departure</th><th>Arrival</th><th>Actions</th></tr></thead>
    `
    const tbody = document.createElement("tbody")

    schedules.forEach((sch) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${sch.date}</td>
        <td>${sch.departureTime}</td>
        <td>${sch.arrivalTime}</td>
        <td class="action-buttons">
          <button class="action-btn edit" onclick='editSchedule(${JSON.stringify(sch)})'>✏️ Edit</button>
          <button class="action-btn delete" onclick='confirmAction("Delete this schedule?", () => deleteSchedule("${sch.id}"))'>🗑️ Delete</button>
        </td>
      `
      tbody.appendChild(row)
    })

    table.appendChild(tbody)
    section.appendChild(table)
    container.appendChild(section)
  })
}

function renderScheduleMobile(scheduleData) {
  const container = document.getElementById("tripScheduleList")
  if (!container) return

  container.innerHTML = ""
  scheduleData.forEach(({ bus, schedules }) => {
    const section = document.createElement("div")
    section.innerHTML = `<h4>🚌 ${bus.busName}</h4>`

    schedules.forEach((sch) => {
      const card = document.createElement("div")
      card.className = "mobile-table-card"
      card.innerHTML = `
        <div class="mobile-card-header">
          <div class="mobile-card-title">${sch.date}</div>
          <div class="mobile-card-status">Scheduled</div>
        </div>
        <div class="mobile-card-details">
          <div class="mobile-card-detail">
            <div class="mobile-card-label">Departure</div>
            <div class="mobile-card-value">${sch.departureTime}</div>
          </div>
          <div class="mobile-card-detail">
            <div class="mobile-card-label">Arrival</div>
            <div class="mobile-card-value">${sch.arrivalTime}</div>
          </div>
        </div>
        <div class="mobile-card-actions">
          <button class="action-btn edit" onclick='editSchedule(${JSON.stringify(sch)})'>✏️ Edit</button>
          <button class="action-btn delete" onclick='confirmAction("Delete this schedule?", () => deleteSchedule("${sch.id}"))'>🗑️ Delete</button>
        </div>
      `
      section.appendChild(card)
    })

    container.appendChild(section)
  })
}

function editSchedule(schedule) {
  editingScheduleId = schedule.id
  document.getElementById("scheduleDate").value = schedule.date
  document.getElementById("departureTime").value = schedule.departureTime
  document.getElementById("arrivalTime").value = schedule.arrivalTime
  document.getElementById("scheduleBusSelect").value = schedule.busId
  scrollToForm("scheduleSection")
}

function deleteSchedule(id) {
  fetch(`/api/schedule/delete/${id}`, { method: "DELETE" })
    .then(() => {
      showToast("Schedule deleted successfully")
      loadScheduleSection()
    })
    .catch((err) => {
      console.error("Delete schedule error:", err)
      showToast("Failed to delete schedule", "error")
    })
}

// Schedule form submission
document.getElementById("saveScheduleBtn")?.addEventListener("click", async () => {
  if (isLoading) return

  const schedule = {
    busId: document.getElementById("scheduleBusSelect").value,
    date: document.getElementById("scheduleDate").value,
    departureTime: document.getElementById("departureTime").value,
    arrivalTime: document.getElementById("arrivalTime").value,
  }

  if (!schedule.busId || !schedule.date || !schedule.departureTime || !schedule.arrivalTime) {
    showToast("Please fill in all schedule fields", "error")
    return
  }

  const url = editingScheduleId ? `/api/schedule/update/${editingScheduleId}` : "/api/schedule/add"
  const method = editingScheduleId ? "PUT" : "POST"

  isLoading = true
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    showToast("Schedule saved successfully")
    document.getElementById("scheduleDate").value = ""
    document.getElementById("departureTime").value = ""
    document.getElementById("arrivalTime").value = ""
    editingScheduleId = null
    loadScheduleSection()
    isLoading = false
  } catch (err) {
    console.error("Error saving schedule:", err)
    showToast("Failed to save schedule", "error")
    isLoading = false
  }
})

// ---------- BOOKINGS ----------
function loadBookingsSection() {
  if (isLoading) return
  isLoading = true

  const agentId = document.body.getAttribute("data-email")
  fetch(`/agent/api/bookings/by-agent/${agentId}`)
    .then((res) => res.json())
    .then((bookings) => {
      lastSectionData.bookings = bookings
      renderBookingsForCurrentView(bookings)
      isLoading = false
    })
    .catch((err) => {
      console.error("Failed to load bookings:", err)
      showToast("Could not load bookings", "error")
      isLoading = false
    })
}

function renderBookingsForCurrentView(bookings) {
  if (isMobileView) {
    renderBookingsMobile(bookings)
  } else {
    renderBookingsDesktop(bookings)
  }
}

function renderBookingsDesktop(bookings) {
  const container = document.getElementById("bookingList")
  if (!container) return

  container.innerHTML = ""
  if (bookings.length === 0) {
    container.innerHTML = "<p>No bookings found for your buses.</p>"
    return
  }

  const table = document.createElement("table")
  table.className = "route-table"
  table.innerHTML = `
    <thead>
      <tr>
        <th>Passenger</th><th>Email</th><th>Mobile</th>
        <th>From</th><th>To</th>
        <th>Seat</th><th>Fare</th><th>Status</th><th>Date</th>
      </tr>
    </thead>
  `
  const tbody = document.createElement("tbody")

  bookings.forEach((b) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${b.passengerName}</td>
      <td>${b.email}</td>
      <td>${b.passengerMobile}</td>
      <td>${b.routeFrom}</td>
      <td>${b.routeTo}</td>
      <td>${b.seatNumber}</td>
      <td>₹${b.fare}</td>
      <td><span class="status-badge ${b.status.toLowerCase()}">${b.status}</span></td>
      <td>${b.travelDate}</td>
    `
    tbody.appendChild(row)
  })

  table.appendChild(tbody)
  container.appendChild(table)
}

function renderBookingsMobile(bookings) {
  const container = document.getElementById("bookingList")
  if (!container) return

  container.innerHTML = ""
  if (bookings.length === 0) {
    container.innerHTML = "<p>No bookings found for your buses.</p>"
    return
  }

  bookings.forEach((b) => {
    const card = document.createElement("div")
    card.className = "mobile-table-card"
    card.innerHTML = `
      <div class="mobile-card-header">
        <div class="mobile-card-title">${b.passengerName}</div>
        <div class="mobile-card-status ${b.status.toLowerCase()}">${b.status}</div>
      </div>
      <div class="mobile-card-details">
        <div class="mobile-card-detail">
          <div class="mobile-card-label">Route</div>
          <div class="mobile-card-value">${b.routeFrom} → ${b.routeTo}</div>
        </div>
        <div class="mobile-card-detail">
          <div class="mobile-card-label">Contact</div>
          <div class="mobile-card-value">${b.passengerMobile}<br/>${b.email}</div>
        </div>
        <div class="mobile-card-detail">
          <div class="mobile-card-label">Seat & Fare</div>
          <div class="mobile-card-value">Seat ${b.seatNumber} - ₹${b.fare}</div>
        </div>
        <div class="mobile-card-detail">
          <div class="mobile-card-label">Travel Date</div>
          <div class="mobile-card-value">${b.travelDate}</div>
        </div>
      </div>
    `
    container.appendChild(card)
  })
}
