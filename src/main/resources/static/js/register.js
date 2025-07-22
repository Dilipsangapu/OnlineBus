// Mobile sidebar state
let isMobileSidebarOpen = false
let form // Declare form variable here

document.addEventListener("DOMContentLoaded", () => {
  // Initialize mobile sidebar
  initializeMobileSidebar()

  // Initialize form validation
  initializeFormValidation()

  // Handle window resize for responsive behavior
  let resizeTimeout
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      updateSidebarForViewport()
    }, 250)
  })

  // Initialize form variable
  form = document.getElementById("registerForm")
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

  isMobileSidebarOpen = true
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

  isMobileSidebarOpen = false
}

function createSidebar() {
  const sidebar = document.createElement("nav")
  sidebar.className = "sidebar"
  sidebar.innerHTML = `
      <div class="sidebar-content">
          <div class="sidebar-header">
              <h3 style="color: #00b39f; margin-bottom: 20px; padding: 0 16px; font-size: 18px;">Menu</h3>
          </div>
          <ul class="sidebar-menu">
              <li><a href="/" class="sidebar-link">🏠 Home</a></li>
              <li><a href="/login" class="sidebar-link">🔑 Login</a></li>
              <li><a href="/register" class="sidebar-link active">📝 Register</a></li>
              <li><a href="/search" class="sidebar-link">🔍 Search Buses</a></li>
              <li><a href="/help" class="sidebar-link">❓ Help</a></li>
              <li><a href="/contact" class="sidebar-link">📞 Contact</a></li>
          </ul>
          <div class="sidebar-footer">
              <p style="font-size: 12px; color: #666; padding: 16px; text-align: center;">
                  © 2024 Bus Booking System
              </p>
          </div>
      </div>
  `

  // Add click event to close sidebar when menu item is clicked
  sidebar.addEventListener("click", (e) => {
    if (e.target.classList.contains("sidebar-link")) {
      setTimeout(closeMobileSidebar, 150)
    }
  })

  document.body.appendChild(sidebar)
  return sidebar
}

function updateSidebarForViewport() {
  const isMobile = window.innerWidth <= 900
  const toggle = document.querySelector(".mobile-menu-toggle")

  if (!isMobile) {
    closeMobileSidebar()
    if (toggle) toggle.style.display = "none"
  } else {
    if (toggle) toggle.style.display = "flex"
  }
}

// ===== FORM VALIDATION =====

function initializeFormValidation() {
  if (!form) return

  // Add real-time validation
  const inputs = form.querySelectorAll("input, select")
  inputs.forEach((input) => {
    input.addEventListener("blur", validateField)
    input.addEventListener("input", clearFieldError)
  })

  // Add form submission handler
  form.addEventListener("submit", (e) => {
    e.preventDefault()
    if (validateForm()) {
      sendOtp()
    }
  })
}

function validateField(e) {
  const field = e.target
  const value = field.value.trim()
  const fieldName = field.name

  clearFieldError(field)

  switch (fieldName) {
    case "name":
      if (!value) {
        showFieldError(field, "Name is required")
      } else if (value.length < 2) {
        showFieldError(field, "Name must be at least 2 characters")
      }
      break

    case "phone":
      if (!value) {
        showFieldError(field, "Phone number is required")
      } else if (!/^\d{10}$/.test(value)) {
        showFieldError(field, "Phone number must be 10 digits")
      }
      break

    case "email":
      if (!value) {
        showFieldError(field, "Email is required")
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        showFieldError(field, "Please enter a valid email")
      }
      break

    case "age":
      if (!value) {
        showFieldError(field, "Age is required")
      } else if (Number.parseInt(value) < 18 || Number.parseInt(value) > 100) {
        showFieldError(field, "Age must be between 18 and 100")
      }
      break

    case "password":
      if (!value) {
        showFieldError(field, "Password is required")
      } else if (value.length < 6) {
        showFieldError(field, "Password must be at least 6 characters")
      }
      break

    case "confirmPassword":
      const password = form.querySelector("input[name='password']").value
      if (!value) {
        showFieldError(field, "Please confirm your password")
      } else if (value !== password) {
        showFieldError(field, "Passwords do not match")
      }
      break
  }
}

function showFieldError(field, message) {
  const formGroup = field.closest(".form-group")
  if (!formGroup) return

  // Remove existing error
  const existingError = formGroup.querySelector(".field-error")
  if (existingError) existingError.remove()

  // Add error styling
  field.classList.add("error")

  // Add error message
  const errorDiv = document.createElement("div")
  errorDiv.className = "field-error"
  errorDiv.textContent = message
  formGroup.appendChild(errorDiv)
}

function clearFieldError(field) {
  if (typeof field === "object" && field.target) {
    field = field.target
  }

  const formGroup = field.closest(".form-group")
  if (!formGroup) return

  field.classList.remove("error")
  const errorDiv = formGroup.querySelector(".field-error")
  if (errorDiv) errorDiv.remove()
}

function validateForm() {
  const inputs = form.querySelectorAll("input, select")
  let isValid = true

  inputs.forEach((input) => {
    validateField({ target: input })
    if (input.classList.contains("error")) {
      isValid = false
    }
  })

  return isValid
}

// ===== ENHANCED OTP FUNCTIONALITY =====

function sendOtp() {
  const sendOtpBtn = document.querySelector(".register-btn")

  // Get form values
  const name = form.querySelector("input[name='name']").value.trim()
  const phone = form.querySelector("input[name='phone']").value.trim()
  const email = form.querySelector("input[name='email']").value.trim()
  const age = form.querySelector("input[name='age']").value.trim()
  const gender = form.querySelector("select[name='gender']").value.trim()
  const password = form.querySelector("input[name='password']").value.trim()
  const confirmPassword = form.querySelector("input[name='confirmPassword']").value.trim()

  // Validate all fields
  if (!name || !phone || !email || !age || !gender || !password || !confirmPassword) {
    showToast("❌ Please fill all fields before sending OTP.", "error")
    return
  }

  if (password !== confirmPassword) {
    showToast("❌ Passwords do not match.", "error")
    return
  }

  // Show loading state
  sendOtpBtn.disabled = true
  sendOtpBtn.innerHTML = '<span class="loading-spinner"></span> Sending OTP...'

  fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) =>
      res.text().then((text) => {
        if (!res.ok) throw new Error(text)
        showToast("✅ " + text, "success")
        showOtpSection()
      }),
    )
    .catch((err) => {
      showToast("❌ " + err.message, "error")
    })
    .finally(() => {
      sendOtpBtn.disabled = false
      sendOtpBtn.innerHTML = "Send OTP"
    })
}

function verifyOtp() {
  const email = form.querySelector("input[name='email']").value
  const otp = document.getElementById("otpInput").value.trim()
  const verifyBtn = document.getElementById("verifyBtn")

  if (!otp) {
    showToast("❌ Please enter the OTP sent to your email.", "error")
    return
  }

  // Show loading state
  verifyBtn.disabled = true
  verifyBtn.innerHTML = '<span class="loading-spinner"></span> Verifying...'

  fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  })
    .then((res) =>
      res.text().then((text) => {
        if (!res.ok) throw new Error(text)
        showToast("✅ " + text, "success")
        showFinalRegisterButton()
      }),
    )
    .catch((err) => {
      showToast("❌ " + err.message, "error")
    })
    .finally(() => {
      verifyBtn.disabled = false
      verifyBtn.innerHTML = "Verify OTP"
    })
}

function registerUser() {
  const finalRegisterBtn = document.getElementById("finalRegisterBtn")

  const user = {
    name: form.name.value,
    phone: form.phone.value,
    email: form.email.value,
    age: Number.parseInt(form.age.value),
    gender: form.gender.value,
    password: form.password.value,
  }

  // Show loading state
  finalRegisterBtn.disabled = true
  finalRegisterBtn.innerHTML = '<span class="loading-spinner"></span> Creating Account...'

  fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  })
    .then((res) =>
      res.text().then((text) => {
        if (!res.ok) throw new Error(text)
        showToast("✅ " + text, "success")
        setTimeout(() => {
          window.location.href = "/login"
        }, 1500)
      }),
    )
    .catch((err) => {
      showToast("❌ " + err.message, "error")
      finalRegisterBtn.disabled = false
      finalRegisterBtn.innerHTML = "Complete Registration"
    })
}

// ===== UI HELPER FUNCTIONS =====

function showOtpSection() {
  let otpSection = document.getElementById("otpSection")

  if (!otpSection) {
    otpSection = document.createElement("div")
    otpSection.id = "otpSection"
    otpSection.className = "otp-section"
    otpSection.innerHTML = `
          <div class="form-group">
              <input type="text" id="otpInput" placeholder=" " maxlength="6" />
              <label for="otpInput">Enter OTP</label>
          </div>
          <button type="button" id="verifyBtn" class="register-btn otp-btn">
              Verify OTP
          </button>
      `

    form.appendChild(otpSection)

    // Add event listener for verify button
    document.getElementById("verifyBtn").addEventListener("click", verifyOtp)

    // Add OTP input formatting
    const otpInput = document.getElementById("otpInput")
    otpInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6)
    })

    // Auto-submit on 6 digits
    otpInput.addEventListener("input", (e) => {
      if (e.target.value.length === 6) {
        setTimeout(verifyOtp, 500)
      }
    })
  }

  otpSection.style.display = "block"
  otpSection.scrollIntoView({ behavior: "smooth" })
}

function showFinalRegisterButton() {
  let finalRegisterBtn = document.getElementById("finalRegisterBtn")

  if (!finalRegisterBtn) {
    finalRegisterBtn = document.createElement("button")
    finalRegisterBtn.id = "finalRegisterBtn"
    finalRegisterBtn.type = "button"
    finalRegisterBtn.className = "register-btn final-register-btn"
    finalRegisterBtn.textContent = "Complete Registration"
    finalRegisterBtn.addEventListener("click", registerUser)

    const otpSection = document.getElementById("otpSection")
    otpSection.appendChild(finalRegisterBtn)
  }

  finalRegisterBtn.style.display = "block"
  document.getElementById("verifyBtn").style.display = "none"
}

function showToast(message, type = "info") {
  // Remove existing toast
  const existingToast = document.querySelector(".toast")
  if (existingToast) existingToast.remove()

  // Create toast
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.textContent = message

  // Add to page
  document.body.appendChild(toast)

  // Show toast
  setTimeout(() => toast.classList.add("show"), 100)

  // Hide toast
  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => toast.remove(), 300)
  }, 4000)
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

// ===== TOUCH GESTURES =====

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
    if (window.innerWidth <= 900) {
      openMobileSidebar()
    }
  }

  // Swipe left to close sidebar
  if (swipeDistance < -swipeThreshold) {
    closeMobileSidebar()
  }
}

// ===== FORM ENHANCEMENT =====

document.addEventListener("DOMContentLoaded", () => {
  // Add floating label animation
  const inputs = document.querySelectorAll(".form-group input, .form-group select")
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      input.parentElement.classList.add("focused")
    })

    input.addEventListener("blur", () => {
      if (!input.value) {
        input.parentElement.classList.remove("focused")
      }
    })

    // Check if input has value on load
    if (input.value) {
      input.parentElement.classList.add("focused")
    }
  })
})
