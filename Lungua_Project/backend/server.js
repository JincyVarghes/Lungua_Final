import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Test root route
app.get("/", (req, res) => {
  res.send("ROOT OK");
});

// Patient schema
const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  caregiverPhone: String,
  createdAt: { type: Date, default: Date.now }
});

const Patient = mongoose.model("Patient", patientSchema);

// GET /api/patients - test if route works
app.get("/api/patients", (req, res) => {
  console.log("GET /api/patients hit"); // logs request in Render
  res.json({ message: "GET works" });
});

// POST /api/patients - add a patient
app.post("/api/patients", async (req, res) => {
  console.log("POST /api/patients hit:", req.body); // logs request in Render
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json({ message: "Patient added successfully", patient });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
