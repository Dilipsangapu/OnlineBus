document.addEventListener("DOMContentLoaded", () => {
  // ✅ Make showSection globally accessible for inline onclick in HTML
  window.showSection = function (sectionId) {
    document.getElementById("addAgentSection").style.display = sectionId === "addAgent" ? "block" : "none";
    document.getElementById("viewAgentsSection").style.display = sectionId === "viewAgents" ? "block" : "none";

    if (sectionId === "viewAgents") loadAgents();
  };

  console.log("✅ admin.js loaded");

  // Submit agent form
  document.getElementById("agentForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;

    const name = form.name.value.trim();
    const contactPerson = form.contactPerson.value.trim();
    const email = form.email.value.trim().toLowerCase();  // ✅ Normalize email
    const phone = form.phone.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    if (!name || !contactPerson || !email || !phone || !password || !confirmPassword) {
      alert("❌ All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      alert("❌ Passwords do not match.");
      return;
    }

    const agent = {
      name,
      contactPerson,
      email,
      phone,
      password,
      role: "AGENT"  // ✅ Explicit role
    };

    fetch("/agent/api/agents/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agent)
    })
      .then(res => res.ok ? res.text() : res.text().then(msg => { throw new Error(msg); }))
      .then(msg => {
        alert(msg);
        form.reset();
      })
      .catch(err => alert(err.message));
  });

  function loadAgents() {
    fetch("/agent/api/agents/all")
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById("agentList");
        container.innerHTML = "";

        if (!data.length) {
          container.innerHTML = "<p>No agents registered yet.</p>";
          return;
        }

        data.forEach(agent => {
          const card = document.createElement("div");
          card.className = "agent-card";
          card.innerHTML = `
            <h4>${agent.name}</h4>
            <p>Contact Person: ${agent.contactPerson}</p>
            <p>Email: ${agent.email}</p>
            <p>Phone: ${agent.phone}</p>
          `;
          container.appendChild(card);
        });
      })
      .catch(err => {
        document.getElementById("agentList").innerHTML = `<p>Error loading agents: ${err.message}</p>`;
      });
  }
});
