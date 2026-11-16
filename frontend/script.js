const API = "/api";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The request could not be completed.");
  return data;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function setMessage(selector, message, isError = false) {
  const element = $(selector);
  element.textContent = message;
  element.style.color = isError ? "#c9364b" : "#188b68";
}

async function loadHealth() {
  try {
    await api("/health");
    $("#apiStatus").textContent = "System connected";
    $(".system-status").classList.add("online");
  } catch {
    $("#apiStatus").textContent = "Server unavailable";
    $(".system-status").classList.remove("online");
  }
}

async function loadBloodGroups() {
  const groups = await api("/blood-groups");
  $$(".blood-options").forEach(select => {
    select.innerHTML = '<option value="">Select blood group</option>' +
      groups.map(group => `<option value="${safe(group.group_name)}">${safe(group.group_name)}</option>`).join("");
  });
}

async function loadStats() {
  const stats = await api("/stats");
  $("#totalDonors").textContent = stats.donors;
  $("#totalRequests").textContent = stats.requests;
  $("#pendingRequests").textContent = stats.pendingRequests;
  $("#totalUnits").textContent = stats.bloodUnits;
}

async function loadInventory() {
  const rows = await api("/inventory");
  $("#inventoryGrid").innerHTML = rows.map(row => `
    <div class="inventory-card">
      <span class="blood-type">${safe(row.blood_group)}</span>
      <p>Recorded units available</p>
      <div class="inventory-control">
        <input type="number" min="0" step="1" value="${Number(row.units_available)}" id="units-${safe(row.blood_group)}" aria-label="Units for ${safe(row.blood_group)}">
        <button type="button" data-save-inventory="${safe(row.blood_group)}">Save</button>
      </div>
    </div>`).join("");

  $("#dashboardInventory").innerHTML = rows.map(row => `
    <div class="mini-blood"><span class="blood-type">${safe(row.blood_group)}</span><small>${Number(row.units_available)} units</small></div>
  `).join("");
}

async function loadDonors() {
  const donors = await api("/donors");
  $("#donorsTable").innerHTML = donors.length ? donors.map(donor => `
    <tr>
      <td><strong>${safe(donor.full_name)}</strong></td>
      <td><span class="badge">${safe(donor.blood_group)}</span></td>
      <td>${safe(donor.phone)}</td>
      <td>${safe(donor.email || "—")}</td>
      <td>${new Date(donor.created_at).toLocaleDateString()}</td>
      <td><button class="delete-btn" data-delete-donor="${donor.id}">Delete</button></td>
    </tr>`).join("") : '<tr><td colspan="6" class="empty">No donor records yet.</td></tr>';
}

async function loadRequests() {
  const requests = await api("/requests");
  $("#requestsTable").innerHTML = requests.length ? requests.map(request => `
    <tr>
      <td><strong>${safe(request.patient_name)}</strong></td>
      <td>${safe(request.hospital_name)}</td>
      <td><span class="badge">${safe(request.blood_group)}</span></td>
      <td>${Number(request.units_requested)}</td>
      <td>${safe(request.urgency)}</td>
      <td><span class="badge ${safe(request.status)}">${safe(request.status)}</span></td>
      <td><select class="small-select" data-request-status="${request.id}" aria-label="Update request ${request.id}">
        ${["Pending", "Approved", "Rejected", "Fulfilled"].map(status =>
          `<option ${request.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select></td>
    </tr>`).join("") : '<tr><td colspan="7" class="empty">No blood requests yet.</td></tr>';
}

async function refreshDashboard() {
  await Promise.all([loadStats(), loadInventory()]);
}

$("#donorForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api("/donors", { method: "POST", body: JSON.stringify(formObject(form)) });
    form.reset();
    setMessage("#donorMessage", "Donor saved successfully.");
    showToast("Donor registered.");
    await Promise.all([loadDonors(), refreshDashboard()]);
  } catch (error) {
    setMessage("#donorMessage", error.message, true);
  }
});

$("#requestForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api("/requests", { method: "POST", body: JSON.stringify(formObject(form)) });
    form.reset();
    setMessage("#requestMessage", "Blood request submitted.");
    showToast("Request submitted.");
    await Promise.all([loadRequests(), refreshDashboard()]);
  } catch (error) {
    setMessage("#requestMessage", error.message, true);
  }
});

document.addEventListener("click", async event => {
  const deleteButton = event.target.closest("[data-delete-donor]");
  const inventoryButton = event.target.closest("[data-save-inventory]");

  if (deleteButton) {
    const id = deleteButton.dataset.deleteDonor;
    if (!confirm("Delete this donor record?")) return;
    try {
      await api(`/donors/${id}`, { method: "DELETE" });
      showToast("Donor deleted.");
      await Promise.all([loadDonors(), refreshDashboard()]);
    } catch (error) { showToast(error.message); }
  }

  if (inventoryButton) {
    const group = inventoryButton.dataset.saveInventory;
    const input = $(`#units-${CSS.escape(group)}`);
    try {
      await api(`/inventory/${encodeURIComponent(group)}`, {
        method: "PATCH",
        body: JSON.stringify({ units_available: Number(input.value) })
      });
      showToast(`${group} inventory updated.`);
      await refreshDashboard();
    } catch (error) { showToast(error.message); }
  }
});

document.addEventListener("change", async event => {
  const select = event.target.closest("[data-request-status]");
  if (!select) return;
  try {
    await api(`/requests/${select.dataset.requestStatus}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value })
    });
    showToast("Request status updated.");
    await refreshDashboard();
    await loadRequests();
  } catch (error) { showToast(error.message); }
});

$("#refreshDonors").addEventListener("click", () => loadDonors().catch(e => showToast(e.message)));
$("#refreshRequests").addEventListener("click", () => loadRequests().catch(e => showToast(e.message)));
$("#refreshInventory").addEventListener("click", () => loadInventory().catch(e => showToast(e.message)));

function navigate() {
  const hash = location.hash || "#dashboard";
  $$(".page-section").forEach(section => section.classList.toggle("hidden", `#${section.id}` !== hash));
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.getAttribute("href") === hash));
  const titles = { "#dashboard": "Dashboard", "#donors": "Donors", "#requests": "Blood requests", "#inventory": "Blood inventory" };
  $("#pageTitle").textContent = titles[hash] || "Dashboard";

  if (hash === "#donors") loadDonors().catch(e => showToast(e.message));
  if (hash === "#requests") loadRequests().catch(e => showToast(e.message));
  if (hash === "#inventory") loadInventory().catch(e => showToast(e.message));
  if (hash === "#dashboard") refreshDashboard().catch(e => showToast(e.message));
}
window.addEventListener("hashchange", navigate);

(async function init() {
  try {
    await loadBloodGroups();
    await Promise.all([loadHealth(), loadStats(), loadInventory()]);
    navigate();
  } catch (error) {
    $("#apiStatus").textContent = "Connection error";
    showToast(error.message + " Check the server and database settings.");
  }
})();
