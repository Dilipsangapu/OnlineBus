document.addEventListener("DOMContentLoaded", () => {
  const fromInput = document.querySelector('input[placeholder="Enter departure city"]');
  const toInput = document.querySelector('input[placeholder="Enter destination city"]');
  const dateInput = document.querySelector('input[type="date"]');
  const searchBtn = document.querySelector(".search-btn");
  const form = document.querySelector(".search-form");

  searchBtn.disabled = true;

  function checkInputs() {
    searchBtn.disabled = !(fromInput.value && toInput.value && dateInput.value);
  }

  fromInput.addEventListener("input", checkInputs);
  toInput.addEventListener("input", checkInputs);
  dateInput.addEventListener("change", checkInputs);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const from = fromInput.value.trim().toLowerCase();
    const to = toInput.value.trim().toLowerCase();
    const date = dateInput.value;

    try {
      const response = await fetch(`/user/api/search-buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
      const buses = await response.json();

      renderSearchResults(buses, from, to, date);
    } catch (err) {
      console.error("Search error:", err);
      document.getElementById("searchResults").innerHTML = "<p>❌ Failed to fetch search results.</p>";
    }
  });
});

async function renderSearchResults(buses, userFrom, userTo, date) {
  const resultDiv = document.getElementById("searchResults");
  resultDiv.innerHTML = "";

  if (!buses || buses.length === 0) {
    resultDiv.innerHTML = "<p>🚫 No buses found for your search.</p>";
    return;
  }

  for (const bus of buses) {
    const stops = await fetchRouteStops(bus.busId);
    const fare = await calculateFareBetweenStops(bus.busId, stops, userFrom, userTo);

    const card = document.createElement("div");
    card.className = "bus-card";

    card.innerHTML = `
      <h3>${bus.busName} (${bus.busType})</h3>
      <p><strong>Bus No:</strong> ${bus.busNumber}</p>
      <p><strong>From:</strong> ${capitalize(userFrom)} → <strong>To:</strong> ${capitalize(userTo)}</p>
      <p><strong>Estimated Fare:</strong> ₹${fare}</p>
      <button class="book-btn" onclick="handleBooking('${bus.busId}', '${date}')">🚌 Book Now</button>
    `;

    resultDiv.appendChild(card);
  }
}

async function fetchRouteStops(busId) {
  try {
    const response = await fetch(`/user/api/route/stops/${busId}`);
    return await response.json(); // array of lowercased stop names
  } catch (error) {
    console.error(`Error fetching stops for bus ${busId}:`, error);
    return [];
  }
}

async function calculateFareBetweenStops(busId, stops, from, to) {
  const fromIndex = stops.indexOf(from);
  const toIndex = stops.indexOf(to);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return "Invalid Stops";
  }

  const segmentRatio = (toIndex - fromIndex) / (stops.length - 1);

  try {
    const response = await fetch(`/api/seats/by-bus/${busId}`);
    const data = await response.json();

    let minFare = Infinity;

    for (const seat of data.seats || []) {
      const seatFare = seat.price || 0;
      const dynamicFare = Math.round(seatFare * segmentRatio * 100) / 100;
      if (dynamicFare > 0) {
        minFare = Math.min(minFare, dynamicFare);
      }
    }

    return isFinite(minFare) ? minFare : "N/A";
  } catch (error) {
    console.error(`Error calculating fare for bus ${busId}:`, error);
    return "Error";
  }
}

function handleBooking(busId, date) {
  const userEmail = document.querySelector('meta[name="user-email"]')?.content;

  if (!userEmail || userEmail.trim() === "") {
    alert("⚠️ Please login to book a bus.");
    window.location.href = "/login";
    return;
  }

  window.location.href = `/user/booking?busId=${busId}&date=${date}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
