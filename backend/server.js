require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", asyncHandler(async (req, res) => {
  await db.query("SELECT 1");
  res.json({ status: "OK", message: "API and database are connected." });
}));

app.get("/api/stats", asyncHandler(async (req, res) => {
  const [[donorCount]] = await db.query("SELECT COUNT(*) AS total FROM donors");
  const [[requestCount]] = await db.query("SELECT COUNT(*) AS total FROM blood_requests");
  const [[pendingCount]] = await db.query(
    "SELECT COUNT(*) AS total FROM blood_requests WHERE status = 'Pending'"
  );
  const [[inventoryCount]] = await db.query(
    "SELECT COALESCE(SUM(units_available), 0) AS total FROM blood_inventory"
  );

  res.json({
    donors: donorCount.total,
    requests: requestCount.total,
    pendingRequests: pendingCount.total,
    bloodUnits: inventoryCount.total
  });
}));

app.get("/api/blood-groups", asyncHandler(async (req, res) => {
  const [rows] = await db.query("SELECT id, group_name FROM blood_groups ORDER BY id");
  res.json(rows);
}));

app.get("/api/donors", asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT d.id, d.full_name, d.gender, d.phone, d.email, d.address,
           d.created_at, bg.group_name AS blood_group
    FROM donors d
    JOIN blood_groups bg ON bg.id = d.blood_group_id
    ORDER BY d.created_at DESC
  `);
  res.json(rows);
}));

app.post("/api/donors", asyncHandler(async (req, res) => {
  const { full_name, phone, email, gender, date_of_birth, address, blood_group } = req.body;

  if (!String(full_name || "").trim() || !String(phone || "").trim() || !blood_group) {
    return res.status(400).json({ message: "Full name, phone and blood group are required." });
  }

  const [groups] = await db.query(
    "SELECT id FROM blood_groups WHERE group_name = ?",
    [blood_group]
  );
  if (!groups.length) return res.status(400).json({ message: "Please select a valid blood group." });

  const [result] = await db.query(
    `INSERT INTO donors
      (full_name, phone, email, gender, date_of_birth, address, blood_group_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      String(full_name).trim(),
      String(phone).trim(),
      email || null,
      gender || null,
      date_of_birth || null,
      address || null,
      groups[0].id
    ]
  );

  res.status(201).json({ message: "Donor registered successfully.", id: result.insertId });
}));

app.delete("/api/donors/:id", asyncHandler(async (req, res) => {
  const [result] = await db.query("DELETE FROM donors WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Donor not found." });
  res.json({ message: "Donor deleted." });
}));

app.get("/api/inventory", asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT bg.group_name AS blood_group, bi.units_available, bi.last_updated
    FROM blood_inventory bi
    JOIN blood_groups bg ON bg.id = bi.blood_group_id
    ORDER BY bg.id
  `);
  res.json(rows);
}));

app.patch("/api/inventory/:group", asyncHandler(async (req, res) => {
  const units = Number(req.body.units_available);
  if (!Number.isInteger(units) || units < 0) {
    return res.status(400).json({ message: "Units must be a whole number of zero or more." });
  }

  const [result] = await db.query(`
    UPDATE blood_inventory bi
    JOIN blood_groups bg ON bg.id = bi.blood_group_id
    SET bi.units_available = ?
    WHERE bg.group_name = ?
  `, [units, req.params.group]);

  if (!result.affectedRows) return res.status(404).json({ message: "Blood group not found." });
  res.json({ message: "Inventory updated." });
}));

app.get("/api/requests", asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT r.id, r.patient_name, r.hospital_name, r.contact_phone,
           r.units_requested, r.urgency, r.status, r.requested_at,
           bg.group_name AS blood_group
    FROM blood_requests r
    JOIN blood_groups bg ON bg.id = r.blood_group_id
    ORDER BY r.requested_at DESC
  `);
  res.json(rows);
}));

app.post("/api/requests", asyncHandler(async (req, res) => {
  const { patient_name, hospital_name, contact_phone, blood_group, units_requested, urgency } = req.body;
  const units = Number(units_requested);

  if (!patient_name || !hospital_name || !contact_phone || !blood_group ||
      !Number.isInteger(units) || units < 1) {
    return res.status(400).json({ message: "Complete all required fields and enter at least one unit." });
  }

  const [groups] = await db.query("SELECT id FROM blood_groups WHERE group_name = ?", [blood_group]);
  if (!groups.length) return res.status(400).json({ message: "Please select a valid blood group." });

  const [result] = await db.query(
    `INSERT INTO blood_requests
      (patient_name, hospital_name, contact_phone, blood_group_id, units_requested, urgency)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patient_name.trim(), hospital_name.trim(), contact_phone.trim(),
      groups[0].id, units, urgency || "Medium"]
  );

  res.status(201).json({ message: "Blood request submitted.", id: result.insertId });
}));

app.patch("/api/requests/:id/status", asyncHandler(async (req, res) => {
  const allowed = ["Pending", "Approved", "Rejected", "Fulfilled"];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid request status." });
  }

  const [result] = await db.query(
    "UPDATE blood_requests SET status = ? WHERE id = ?",
    [req.body.status, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Request not found." });
  res.json({ message: "Request status updated." });
}));

app.get("/api", (req, res) => {
  res.json({ message: "Blood Donation Management System API is running." });
});

// Serve the app for unknown non-API paths.
app.get("*path", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API endpoint not found." });
  }
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`Blood Donation System running at http://localhost:${PORT}`);
});
