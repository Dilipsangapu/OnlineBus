// Mobile sidebar state
const isMobileSidebarOpen = false

document.addEventListener("DOMContentLoaded", () => {
  // Initialize mobile sidebar
  initializeMobileSidebar()

  // Original search form functionality
  const fromInput = document.querySelector('input[placeholder="Enter departure city"]')
  const toInput = document.querySelector('input[placeholder="Enter destination city"]')
  const dateInput = document.querySelector('input[type="date"]')
    // Block past dates
    if (dateInput) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, "0")
      const dd = String(today.getDate()).padStart(2, "0")
      const minDate = `${yyyy}-${mm}-${dd}`
      dateInput.setAttribute("min", minDate)
    }

  const searchBtn = document.querySelector(".search-btn")
  const form = document.querySelector(".search-form")
  const resultDiv = document.getElementById("searchResults")

  searchBtn.disabled = true

  function validateInputs() {
    searchBtn.disabled = !(fromInput.value && toInput.value && dateInput.value)
  }

  fromInput.addEventListener("input", validateInputs)
  toInput.addEventListener("input", validateInputs)
  dateInput.addEventListener("change", validateInputs)

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const from = fromInput.value.trim().toLowerCase()
    const to = toInput.value.trim().toLowerCase()
    const date = dateInput.value

    if (!from || !to || !date) return

    // Show loading state
    showLoadingState()

    try {
      const res = await fetch(
        `/user/api/search-buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`,
      )
      if (!res.ok) throw new Error("Failed to fetch buses")

      const buses = await res.json()

      // Clear loading state
      clearResults()

      if (buses.length === 0) {
        showNoResults()
        return
      }

      // Render results for both desktop and mobile
      await renderSearchResults(buses, from, to, date)
    } catch (err) {
      console.error("Error:", err)
      showErrorState()
    }
  })

  // Handle window resize for responsive behavior
  let resizeTimeout
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      updateSearchResultsDisplay()
      updateSidebarForViewport()
    }, 250)
  })
})



// ===== MOBILE SIDEBAR FUNCTIONALITY =====

function initializeMobileSidebar() {
  createMobileMenuToggle()
  createSidebarOverlay()
  updateSidebarForViewport()
}

function createMobileMenuToggle() {
  // Check if toggle already exists
  if (document.querySelector(".mobile-menu-toggle")) return

  const toggle = document.createElement("button")
  toggle.className = "mobile-menu-toggle"
  toggle.innerHTML = '<span class="hamburger-icon">☰</span>'
  toggle.setAttribute("aria-label", "Toggle mobile menu")
  toggle.setAttribute("aria-expanded", "false")

  toggle.addEventListener("click", toggleMobileSidebar)

  document.body.appendChild(toggle)
}

function createSidebarOverlay() {
  // Check if overlay already exists
  if (document.querySelector(".sidebar-overlay")) return

  const overlay = document.createElement("div")
  overlay.className = "sidebar-overlay"
  overlay.addEventListener("click", closeMobileSidebar)

  document.body.appendChild(overlay)
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector(".sidebar") || createSidebar()
  const overlay = document.querySelector(".sidebar-overlay")
  const toggle = document.querySelector(".mobile-menu-toggle")
  const body = document.body

  const isOpen = sidebar.classList.contains("mobile-open")

  if (isOpen) {
    closeMobileSidebar()
  } else {
    openMobileSidebar()
  }
}

function openMobileSidebar() {
  const sidebar = document.querySelector(".sidebar") || createSidebar()
  const overlay = document.querySelector(".sidebar-overlay")
  const toggle = document.querySelector(".mobile-menu-toggle")
  const body = document.body

  sidebar.classList.add("mobile-open")
  overlay.classList.add("active")
  body.classList.add("sidebar-open")

  toggle.innerHTML = '<span class="hamburger-icon">✕</span>'
  toggle.setAttribute("aria-expanded", "true")
}

function closeMobileSidebar() {
  const sidebar = document.querySelector(".sidebar")
  const overlay = document.querySelector(".sidebar-overlay")
  const toggle = document.querySelector(".mobile-menu-toggle")
  const body = document.body

  if (sidebar) sidebar.classList.remove("mobile-open")
  if (overlay) overlay.classList.remove("active")
  body.classList.remove("sidebar-open")

  if (toggle) {
    toggle.innerHTML = '<span class="hamburger-icon">☰</span>'
    toggle.setAttribute("aria-expanded", "false")
  }
}

function createSidebar() {
  const sidebar = document.createElement("nav")
  sidebar.className = "sidebar"
  sidebar.innerHTML = `
      <div class="sidebar-content">
          <h3 style="color: #007bff; margin-bottom: 20px; padding: 0 16px;">Menu</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
              <li><a href="/" style="display: block; padding: 12px 16px; color: #333; text-decoration: none; border-radius: 8px; margin-bottom: 4px; transition: background 0.3s ease;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='transparent'">🏠 Home</a></li>
              <li><a href="/search" style="display: block; padding: 12px 16px; color: #333; text-decoration: none; border-radius: 8px; margin-bottom: 4px; transition: background 0.3s ease;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='transparent'">🔍 Search Buses</a></li>
              <li><a href="/bookings" style="display: block; padding: 12px 16px; color: #333; text-decoration: none; border-radius: 8px; margin-bottom: 4px; transition: background 0.3s ease;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='transparent'">🎫 My Bookings</a></li>
              <li><a href="/profile" style="display: block; padding: 12px 16px; color: #333; text-decoration: none; border-radius: 8px; margin-bottom: 4px; transition: background 0.3s ease;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='transparent'">👤 Profile</a></li>
              <li><a href="/help" style="display: block; padding: 12px 16px; color: #333; text-decoration: none; border-radius: 8px; margin-bottom: 4px; transition: background 0.3s ease;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='transparent'">❓ Help</a></li>
          </ul>
      </div>
  `

  // Add click event to close sidebar when menu item is clicked
  sidebar.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      setTimeout(closeMobileSidebar, 150)
    }
  })

  document.body.appendChild(sidebar)
  return sidebar
}

function updateSidebarForViewport() {
  const isMobile = window.innerWidth <= 768
  const toggle = document.querySelector(".mobile-menu-toggle")
  const sidebar = document.querySelector(".sidebar")

  if (!isMobile) {
    closeMobileSidebar()
    if (toggle) toggle.style.display = "none"
  } else {
    if (toggle) toggle.style.display = "flex"
  }
}

// ===== SEARCH RESULTS FUNCTIONALITY =====

async function renderSearchResults(buses, from, to, date) {
  const resultDiv = document.getElementById("searchResults")
  const isMobile = window.innerWidth <= 768

  // Clear existing results
  resultDiv.innerHTML = ""

  if (isMobile) {
    // Create mobile results container
    const mobileContainer = document.createElement("div")
    mobileContainer.className = "mobile-search-results"

    for (const bus of buses) {
      const stops = await getStops(bus.busId)
      const estimatedFare = await estimateFare(bus.busId, from, to, stops)

      const mobileCard = createMobileBusCard(bus, from, to, estimatedFare, date)
      mobileContainer.appendChild(mobileCard)
    }

    resultDiv.appendChild(mobileContainer)
  } else {
    // Desktop horizontal layout
    for (const bus of buses) {
      const stops = await getStops(bus.busId)
      const estimatedFare = await estimateFare(bus.busId, from, to, stops)

      const card = createDesktopBusCard(bus, from, to, estimatedFare, date)
      resultDiv.appendChild(card)
    }
  }
}

function createMobileBusCard(bus, from, to, estimatedFare, date) {
  const card = document.createElement("div")
  card.className = "mobile-bus-search-card"

  card.innerHTML = `
      <div class="mobile-bus-header">
          <div class="mobile-bus-name">${bus.busName}</div>
          <div class="mobile-bus-type">${bus.busType}</div>
      </div>
      <div class="mobile-bus-details">
          <div class="mobile-bus-detail">
              <div class="mobile-bus-label">Bus Number</div>
              <div class="mobile-bus-value">${bus.busNumber}</div>
          </div>
          <div class="mobile-bus-detail">
              <div class="mobile-bus-label">Estimated Fare</div>
              <div class="mobile-bus-value">₹${estimatedFare}</div>
          </div>
          <div class="mobile-bus-detail">
              <div class="mobile-bus-label">Departure</div>
              <div class="mobile-bus-value">${bus.departureTime}</div>
          </div>
          <div class="mobile-bus-detail">
              <div class="mobile-bus-label">Arrival</div>
              <div class="mobile-bus-value">${bus.arrivalTime}</div>
          </div>
          <div class="mobile-bus-detail mobile-bus-route">
              <div class="mobile-bus-label">Route</div>
              <div class="mobile-bus-value">${capitalize(from)} → ${capitalize(to)}</div>
          </div>
      </div>
      <div class="mobile-bus-actions">
          <button class="mobile-book-btn" onclick="redirectToBooking('${bus.busId}', '${date}')">
              🎫 Book Now
          </button>
      </div>
  `

  return card
}

function createDesktopBusCard(bus, from, to, estimatedFare, date) {
  const card = document.createElement("div")
  card.className = "bus-card"

  card.innerHTML = `
      <h3>${bus.busName} (${bus.busType})</h3>
      <p><strong>Bus Number:</strong> ${bus.busNumber}</p>
      <p><strong>From:</strong> ${capitalize(from)} → <strong>To:</strong> ${capitalize(to)}</p>
      <p><strong>Estimated Fare:</strong> ₹${estimatedFare}</p>
      <p><strong>Departure:</strong> ${bus.departureTime} | <strong>Arrival:</strong> ${bus.arrivalTime}</p>
      <button class="book-btn" onclick="redirectToBooking('${bus.busId}', '${date}')">Book Now</button>
  `

  return card
}

function updateSearchResultsDisplay() {
  const resultDiv = document.getElementById("searchResults")
  if (!resultDiv || !resultDiv.children.length) return

  const isMobile = window.innerWidth <= 768
  const mobileResults = resultDiv.querySelector(".mobile-search-results")
  const desktopResults = Array.from(resultDiv.children).filter((child) => child.classList.contains("bus-card"))

  if (isMobile) {
    // Show mobile, hide desktop
    if (mobileResults) mobileResults.style.display = "flex"
    desktopResults.forEach((card) => (card.style.display = "none"))
  } else {
    // Show desktop, hide mobile
    if (mobileResults) mobileResults.style.display = "none"
    desktopResults.forEach((card) => (card.style.display = "block"))
  }
}

function showLoadingState() {
  const resultDiv = document.getElementById("searchResults")
  resultDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #007bff;">
          <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e3f2fd; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
          <p style="font-size: 16px; margin: 0;">🔄 Searching buses...</p>
      </div>
  `
}

function clearResults() {
  const resultDiv = document.getElementById("searchResults")
  resultDiv.innerHTML = ""
}

function showNoResults() {
  const resultDiv = document.getElementById("searchResults")
  resultDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>
          <p style="font-size: 16px; margin: 0;">No buses found for the selected route and date.</p>
          <p style="font-size: 14px; color: #888; margin-top: 8px;">Try different cities or dates.</p>
      </div>
  `
}

function showErrorState() {
  const resultDiv = document.getElementById("searchResults")
  resultDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #dc3545;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <p style="font-size: 16px; margin: 0;">Could not load bus data. Please try again later.</p>
          <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
      </div>
  `
}

// ===== ORIGINAL HELPER FUNCTIONS =====

async function getStops(busId) {
  try {
    const res = await fetch(`/user/api/route/stops/${busId}`)
    return await res.json() // already lowercase
  } catch (err) {
    console.error("Failed to fetch route stops:", err)
    return []
  }
}

async function estimateFare(busId, from, to, stops) {
  const fromIndex = stops.indexOf(from)
  const toIndex = stops.indexOf(to)
  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) return "N/A"

  const segmentRatio = (toIndex - fromIndex) / (stops.length - 1)

  try {
    const res = await fetch(`/api/seats/by-bus/${busId}`)
    const seatLayout = await res.json()
    const seats = seatLayout.seats || []

    let minFare = Number.POSITIVE_INFINITY
    for (const seat of seats) {
      const price = seat.price || 0
      const dynamicFare = Math.round(price * segmentRatio * 100) / 100
      if (dynamicFare > 0) {
        minFare = Math.min(minFare, dynamicFare)
      }
    }

    return isFinite(minFare) ? minFare : "N/A"
  } catch (err) {
    console.error("Error estimating fare:", err)
    return "Error"
  }
}

function redirectToBooking(busId, date) {
  window.location.href = `/user/dashboard?busId=${busId}&date=${date}`
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ===== KEYBOARD NAVIGATION =====

document.addEventListener("keydown", (e) => {
  // ESC key to close mobile sidebar
  if (e.key === "Escape") {
    closeMobileSidebar()
  }

  // Ctrl/Cmd + M to toggle mobile sidebar
  if ((e.ctrlKey || e.metaKey) && e.key === "m") {
    e.preventDefault()
    toggleMobileSidebar()
  }
})

// ===== TOUCH GESTURES (Basic) =====

let touchStartX = 0
let touchEndX = 0

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX
})

document.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX
  handleSwipeGesture()
})

function handleSwipeGesture() {
  const swipeThreshold = 100
  const swipeDistance = touchEndX - touchStartX

  // Swipe right to open sidebar (only if starting from left edge)
  if (swipeDistance > swipeThreshold && touchStartX < 50) {
    if (window.innerWidth <= 768) {
      openMobileSidebar()
    }
  }

  // Swipe left to close sidebar
  if (swipeDistance < -swipeThreshold) {
    closeMobileSidebar()
  }
}
