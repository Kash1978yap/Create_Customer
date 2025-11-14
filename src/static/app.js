document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Handle customer creation
  const customerForm = document.getElementById("customer-form");
  const customerMessage = document.getElementById("customer-message");

  async function fetchCustomers() {
    const listContainer = document.getElementById("customer-list");
    listContainer.innerHTML = "";
    try {
      const resp = await fetch("/customers");
      if (!resp.ok) {
        listContainer.innerHTML = "<p>Failed to load customers.</p>";
        return;
      }
      const customers = await resp.json();
      if (!customers || customers.length === 0) {
        listContainer.innerHTML = "<p>No customers yet.</p>";
        return;
      }

      const ul = document.createElement("ul");
      customers.forEach((c) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${escapeHtml(c.first_name)} ${escapeHtml(c.middle_name || "")} ${escapeHtml(c.last_name)}</strong> — ${escapeHtml(c.dob)}<br/>${escapeHtml(c.address_line_1)}, ${escapeHtml(c.city)} ${escapeHtml(c.zip_code)} ${escapeHtml(c.state)}, ${escapeHtml(c.country)}`;
        ul.appendChild(li);
      });
      listContainer.appendChild(ul);
    } catch (err) {
      document.getElementById("customer-list").innerHTML = "<p>Error loading customers.</p>";
      console.error("Error fetching customers:", err);
    }
  }

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  customerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      first_name: document.getElementById("first_name").value,
      middle_name: document.getElementById("middle_name").value || null,
      last_name: document.getElementById("last_name").value,
      dob: document.getElementById("dob").value,
      address_line_1: document.getElementById("address_line_1").value,
      zip_code: document.getElementById("zip_code").value,
      city: document.getElementById("city").value,
      state: document.getElementById("state").value,
      country: document.getElementById("country").value,
    };

    try {
      const response = await fetch("/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        customerMessage.textContent = result.message || "Customer created";
        customerMessage.className = "success";
        customerForm.reset();
        // refresh the customer list
        fetchCustomers();
      } else {
        customerMessage.textContent = result.detail || "Failed to create customer";
        customerMessage.className = "error";
      }

      customerMessage.classList.remove("hidden");

      setTimeout(() => {
        customerMessage.classList.add("hidden");
      }, 5000);
    } catch (error) {
      customerMessage.textContent = "Failed to create customer. Please try again.";
      customerMessage.className = "error";
      customerMessage.classList.remove("hidden");
      console.error("Error creating customer:", error);
    }
  });

  // Wire refresh button
  const refreshBtn = document.getElementById("refresh-customers");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fetchCustomers();
    });
  }

  // Load customers initially
  fetchCustomers();
});
