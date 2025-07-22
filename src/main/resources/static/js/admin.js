document.addEventListener("DOMContentLoaded", () => {
  // ✅ Enhanced Mobile-specific optimizations
  let isLoading = false
  let touchStartY = 0
  let touchEndY = 0
  const pullToRefreshThreshold = 100
  const isPulling = false

  // ✅ Prevent zoom on input focus (mobile) - Enhanced
  const preventZoom = () => {
    const viewport = document.querySelector("meta[name=viewport]")
    const inputs = document.querySelectorAll("input, select, textarea")

    // Create viewport meta if it doesn't exist
    if (!viewport) {
      const meta = document.createElement("meta")
      meta.name = "viewport"
      meta.content = "width=device-width, initial-scale=1.0"
      document.head.appendChild(meta)
    }

    inputs.forEach((input) => {
      input.addEventListener("focus", (e) => {
        if (window.innerWidth < 768) {
          // Prevent zoom on focus
          document
            .querySelector("meta[name=viewport]")
            ?.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")

          // Scroll input into view with better positioning
          setTimeout(() => {
            e.target.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            })
          }, 300)
        }
      })

      input.addEventListener("blur", () => {
        if (window.innerWidth < 768) {
          // Restore zoom capability
          setTimeout(() => {
            document
              .querySelector("meta[name=viewport]")
              ?.setAttribute("content", "width=device-width, initial-scale=1.0")
          }, 100)
        }
      })
    })
  }

  // ✅ Enhanced loading state management with better UX
  const setLoadingState = (isLoadingState, element = null) => {
    isLoading = isLoadingState

    if (element) {
      if (isLoadingState) {
        element.disabled = true
        element.setAttribute("aria-busy", "true")
        const originalText = element.textContent
        element.dataset.originalText = originalText

        element.innerHTML = `
          <span class="loading-spinner" aria-hidden="true"></span>
          <span class="sr-only">Loading...</span>
          ${originalText.includes("Submit") ? "Submitting..." : "Loading..."}
        `
        element.classList.add("loading")
      } else {
        element.disabled = false
        element.setAttribute("aria-busy", "false")
        element.innerHTML = element.dataset.originalText || element.textContent
        element.classList.remove("loading")
      }
    }
  }

  // ✅ Enhanced mobile-friendly toast notifications with better accessibility
  const showToast = (message, type = "info", duration = 5000) => {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll(".mobile-toast")
    existingToasts.forEach((toast) => toast.remove())

    const toast = document.createElement("div")
    toast.className = `mobile-toast mobile-toast-${type}`
    toast.setAttribute("role", "alert")
    toast.setAttribute("aria-live", "polite")

    const iconMap = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    }

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon" aria-hidden="true">${iconMap[type] || iconMap.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()" aria-label="Close notification">×</button>
      </div>
    `

    document.body.appendChild(toast)

    // Enhanced auto-remove with fade out
    const timeoutId = setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("fade-out")
        setTimeout(() => toast.remove(), 300)
      }
    }, duration)

    // Enhanced swipe to dismiss with better touch handling
    let startY = 0
    let startTime = 0
    let isDragging = false

    toast.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY
        startTime = Date.now()
        isDragging = false
      },
      { passive: true },
    )

    toast.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) isDragging = true
        const currentY = e.touches[0].clientY
        const diff = startY - currentY

        if (diff > 0) {
          // Swipe up
          const progress = Math.min(diff / 100, 1)
          toast.style.transform = `translateX(-50%) translateY(-${diff}px)`
          toast.style.opacity = Math.max(0.3, 1 - progress)
        }
      },
      { passive: true },
    )

    toast.addEventListener(
      "touchend",
      (e) => {
        const currentY = e.changedTouches[0].clientY
        const diff = startY - currentY
        const duration = Date.now() - startTime

        // Quick swipe or long distance = dismiss
        if ((diff > 50 && duration < 300) || diff > 100) {
          clearTimeout(timeoutId)
          toast.style.transition = "all 0.3s ease"
          toast.style.transform = "translateX(-50%) translateY(-100px)"
          toast.style.opacity = "0"
          setTimeout(() => toast.remove(), 300)
        } else {
          // Reset position
          toast.style.transition = "all 0.3s ease"
          toast.style.transform = "translateX(-50%) translateY(0)"
          toast.style.opacity = "1"
          setTimeout(() => (toast.style.transition = ""), 300)
        }
      },
      { passive: true },
    )

    // Haptic feedback for mobile
    if ("vibrate" in navigator && type === "error") {
      navigator.vibrate([100, 50, 100])
    } else if ("vibrate" in navigator && type === "success") {
      navigator.vibrate(100)
    }
  }

  // ✅ Enhanced form validation with better mobile UX
  const validateForm = (form) => {
    const errors = []
    const formData = new FormData(form)

    // Get values
    const name = formData.get("name")?.toString().trim() || ""
    const contactPerson = formData.get("contactPerson")?.toString().trim() || ""
    const email = formData.get("email")?.toString().trim().toLowerCase() || ""
    const phone = formData.get("phone")?.toString().trim() || ""
    const password = formData.get("password")?.toString().trim() || ""
    const confirmPassword = formData.get("confirmPassword")?.toString().trim() || ""

    // Clear previous error states
    form.querySelectorAll(".error").forEach((el) => el.classList.remove("error"))
    form.querySelectorAll(".error-message").forEach((el) => el.remove())

    // Validation rules
    const validations = [
      { field: "name", value: name, message: "Agency name is required", test: (v) => v.length > 0 },
      {
        field: "contactPerson",
        value: contactPerson,
        message: "Contact person is required",
        test: (v) => v.length > 0,
      },
      { field: "email", value: email, message: "Email is required", test: (v) => v.length > 0 },
      {
        field: "email",
        value: email,
        message: "Please enter a valid email",
        test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      },
      { field: "phone", value: phone, message: "Phone number is required", test: (v) => v.length > 0 },
      {
        field: "phone",
        value: phone,
        message: "Please enter a valid phone number",
        test: (v) => /^[\d\s\-+()]{10,}$/.test(v),
      },
      { field: "password", value: password, message: "Password is required", test: (v) => v.length > 0 },
      {
        field: "password",
        value: password,
        message: "Password must be at least 6 characters",
        test: (v) => v.length >= 6,
      },
      {
        field: "confirmPassword",
        value: confirmPassword,
        message: "Please confirm your password",
        test: (v) => v.length > 0,
      },
      {
        field: "confirmPassword",
        value: confirmPassword,
        message: "Passwords do not match",
        test: (v) => v === password,
      },
    ]

    // Run validations
    validations.forEach((validation) => {
      if (!validation.test(validation.value)) {
        errors.push({ field: validation.field, message: validation.message })
      }
    })

    // Display errors with enhanced mobile styling
    errors.forEach((error, index) => {
      const field = form.querySelector(`[name="${error.field}"]`)
      if (field && !field.classList.contains("error")) {
        field.classList.add("error")
        field.setAttribute("aria-invalid", "true")

        const errorDiv = document.createElement("div")
        errorDiv.className = "error-message"
        errorDiv.textContent = error.message
        errorDiv.setAttribute("role", "alert")
        field.parentNode.appendChild(errorDiv)

        // Scroll to first error on mobile with better positioning
        if (index === 0 && window.innerWidth < 768) {
          setTimeout(() => {
            field.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            })
            field.focus()
          }, 100)
        }
      }
    })

    return errors.length === 0
  }

  // ✅ Enhanced network status detection
  const checkNetworkStatus = () => {
    if (!navigator.onLine) {
      showToast("No internet connection. Please check your network.", "error")
      return false
    }
    return true
  }

  // ✅ Enhanced section switching with better mobile UX
  window.showSection = (sectionId) => {
    if (isLoading) return

    // Add loading state for section switching
    const sections = document.querySelectorAll(".content-section")
    sections.forEach((section) => {
      section.style.opacity = "0.5"
      section.style.pointerEvents = "none"
    })

    setTimeout(() => {
      // Hide all sections
      document.getElementById("addAgentSection").style.display = sectionId === "addAgent" ? "block" : "none"
      document.getElementById("viewAgentsSection").style.display = sectionId === "viewAgents" ? "block" : "none"

      // Update active menu item
      document.querySelectorAll(".sidebar-menu li").forEach((li) => li.classList.remove("active"))

      // Find and activate the clicked menu item
      const menuItems = document.querySelectorAll(".sidebar-menu li")
      menuItems.forEach((item) => {
        if (
          (sectionId === "addAgent" && item.textContent.includes("Add")) ||
          (sectionId === "viewAgents" && item.textContent.includes("View"))
        ) {
          item.classList.add("active")
        }
      })

      if (sectionId === "viewAgents") {
        window.loadAgents()
      }

      // Restore sections
      sections.forEach((section) => {
        section.style.opacity = "1"
        section.style.pointerEvents = "auto"
      })

      // Scroll to top on mobile with smooth animation
      if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }, 150)
  }

  // ✅ Enhanced form submission with better mobile optimizations
  document.getElementById("agentForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    if (isLoading) return
    if (!checkNetworkStatus()) return

    const form = e.target
    const submitBtn = form.querySelector('button[type="submit"]')

    // Validate form
    if (!validateForm(form)) {
      // Haptic feedback for validation errors
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100])
      }
      return
    }

    setLoadingState(true, submitBtn)

    const formData = new FormData(form)
    const agent = {
      name: formData.get("name").toString().trim(),
      contactPerson: formData.get("contactPerson").toString().trim(),
      email: formData.get("email").toString().trim().toLowerCase(),
      phone: formData.get("phone").toString().trim(),
      password: formData.get("password").toString().trim(),
      role: "AGENT",
    }

    try {
      // Enhanced timeout for mobile networks
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch("/agent/api/agents/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Server error: ${response.status}`)
      }

      const successMessage = await response.text()
      showToast(successMessage || "Agent added successfully!", "success")
      form.reset()

      // Clear any remaining error states
      form.querySelectorAll(".error").forEach((el) => {
        el.classList.remove("error")
        el.setAttribute("aria-invalid", "false")
      })
      form.querySelectorAll(".error-message").forEach((el) => el.remove())

      // Success haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(100)
      }
    } catch (err) {
      let errorMessage = "An error occurred. Please try again."

      if (err.name === "AbortError") {
        errorMessage = "Request timed out. Please check your connection and try again."
      } else if (err.message) {
        errorMessage = err.message
      }

      showToast(errorMessage, "error")

      // Error haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } finally {
      setLoadingState(false, submitBtn)
    }
  })

  // ✅ Enhanced loadAgents with better mobile optimizations
  window.loadAgents = async () => {
    if (!checkNetworkStatus()) return

    const container = document.getElementById("agentList")
    const loadingHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading agents...</p>
      </div>
    `
    container.innerHTML = loadingHTML

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch("/agent/api/agents/all", {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      container.innerHTML = ""

      if (!data.length) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No agents registered yet.</p>
            <button onclick="showSection('addAgent')" class="btn-submit">Add First Agent</button>
          </div>
        `
        return
      }

      data.forEach((agent, index) => {
        const card = document.createElement("div")
        card.className = "agent-card fade-in"
        card.style.animationDelay = `${index * 0.1}s`
        card.innerHTML = `
          <h4>${agent.name}</h4>
          <p><strong>Contact:</strong> ${agent.contactPerson}</p>
          <p><strong>Email:</strong> <a href="mailto:${agent.email}">${agent.email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${agent.phone}">${agent.phone}</a></p>
          <div class="agent-actions">
            <button class="btn-edit" onclick="window.editAgent('${agent.id || index}')">Edit</button>
            <button class="btn-delete" onclick="window.deleteAgent('${agent.id || index}')">Delete</button>
          </div>
        `
        container.appendChild(card)
      })
    } catch (err) {
      let errorMessage = "Error loading agents. Please try again."

      if (err.name === "AbortError") {
        errorMessage = "Request timed out. Please check your connection."
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`
      }

      container.innerHTML = `
        <div class="error-state">
          <p>${errorMessage}</p>
          <button onclick="window.loadAgents()" class="btn-submit">Retry</button>
        </div>
      `
    }
  }

  // ✅ Enhanced pull-to-refresh for mobile
  if (window.innerWidth < 768) {
    let pullDistance = 0
    let refreshTriggered = false

    document.addEventListener(
      "touchstart",
      (e) => {
        touchStartY = e.touches[0].clientY
        pullDistance = 0
        refreshTriggered = false
      },
      { passive: true },
    )

    document.addEventListener(
      "touchmove",
      (e) => {
        if (window.scrollY > 0) return

        touchEndY = e.touches[0].clientY
        pullDistance = touchEndY - touchStartY

        if (pullDistance > pullToRefreshThreshold && !refreshTriggered) {
          refreshTriggered = true
          showToast("Release to refresh", "info", 2000)

          if ("vibrate" in navigator) {
            navigator.vibrate(50)
          }
        }
      },
      { passive: true },
    )

    document.addEventListener(
      "touchend",
      () => {
        if (refreshTriggered && pullDistance > pullToRefreshThreshold) {
          showToast("Refreshing...", "info", 1000)
          setTimeout(() => {
            location.reload()
          }, 500)
        }
        pullDistance = 0
        refreshTriggered = false
      },
      { passive: true },
    )
  }

  // ✅ Initialize mobile optimizations
  preventZoom()

  // ✅ Enhanced orientation change handling
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      window.scrollTo(0, 0)
      // Recalculate viewport
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }, 500)
  })

  // ✅ Enhanced network status listeners
  window.addEventListener("online", () => {
    showToast("Connection restored", "success", 3000)
  })

  window.addEventListener("offline", () => {
    showToast("Connection lost. Some features may not work.", "warning", 5000)
  })

  // ✅ Set initial viewport height for mobile
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty("--vh", `${vh}px`)

  console.log("✅ Enhanced mobile-optimized admin.js loaded")
})

// ✅ Enhanced global functions for agent management
window.editAgent = (agentId) => {
  // Remove any existing edit forms
  const existingForms = document.querySelectorAll(".edit-agent-form")
  existingForms.forEach((form) => form.remove())

  const card = document
    .querySelector(`.agent-card button[onclick="window.editAgent('${agentId}')"]`)
    ?.closest(".agent-card")
  if (!card) return

  // Extract data from card with better parsing
  const name = card.querySelector("h4")?.textContent?.trim() || ""
  const contactPerson = card.querySelector("p:nth-of-type(1)")?.textContent?.split(":")[1]?.trim() || ""
  const email = card.querySelector("p:nth-of-type(2) a")?.textContent?.trim() || ""
  const phone = card.querySelector("p:nth-of-type(3) a")?.textContent?.trim() || ""

  // Create enhanced edit form
  const formHTML = `
    <div class="edit-agent-form">
      <h4>Edit Agent</h4>
      <form onsubmit="return window.updateAgent(event, '${agentId}')">
        <div class="form-row">
          <label>Agency Name</label>
          <input type="text" name="name" value="${name}" placeholder="Agency Name" required />
        </div>
        <div class="form-row">
          <label>Contact Person</label>
          <input type="text" name="contactPerson" value="${contactPerson}" placeholder="Contact Person" required />
        </div>
        <div class="form-row">
          <label>Email</label>
          <input type="email" name="email" value="${email}" placeholder="Email" required />
        </div>
        <div class="form-row">
          <label>Phone</label>
          <input type="tel" name="phone" value="${phone}" placeholder="Phone" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-submit">Update Agent</button>
          <button type="button" class="btn-cancel" onclick="this.closest('.edit-agent-form').remove()">Cancel</button>
        </div>
      </form>
    </div>
  `

  card.insertAdjacentHTML("afterend", formHTML)

  // Focus first input and scroll into view on mobile
  const firstInput = card.nextElementSibling?.querySelector("input")
  if (firstInput && window.innerWidth < 768) {
    setTimeout(() => {
      firstInput.focus()
      firstInput.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }
}

window.updateAgent = async (event, agentId) => {
  event.preventDefault()

  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')

  // Set loading state
  submitBtn.disabled = true
  submitBtn.textContent = "Updating..."

  try {
    const formData = new FormData(form)
    const updatedAgent = {
      name: formData.get("name").toString().trim(),
      contactPerson: formData.get("contactPerson").toString().trim(),
      email: formData.get("email").toString().trim(),
      phone: formData.get("phone").toString().trim(),
    }

    const response = await fetch(`/agent/api/agents/update/${agentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedAgent),
    })

    const message = await response.text()

    if (response.ok) {
      window.showToast(message || "Agent updated successfully!", "success")
      form.closest(".edit-agent-form").remove()
      window.loadAgents() // Reload the agents list
    } else {
      throw new Error(message || "Failed to update agent")
    }
  } catch (error) {
    window.showToast(error.message || "Error updating agent", "error")
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = "Update Agent"
  }

  return false
}

window.deleteAgent = async (agentId) => {
  // Enhanced confirmation dialog
  const confirmed = confirm("Are you sure you want to delete this agent? This action cannot be undone.")
  if (!confirmed) return

  try {
    const response = await fetch(`/agent/api/agents/delete/${agentId}`, {
      method: "DELETE",
    })

    const message = await response.text()
    window.showToast(message, response.ok ? "success" : "error")

    if (response.ok) {
      // Haptic feedback for successful deletion
      if ("vibrate" in navigator) {
        navigator.vibrate(100)
      }
      window.loadAgents()
    }
  } catch (error) {
    window.showToast("Error deleting agent. Please try again.", "error")
  }
}
