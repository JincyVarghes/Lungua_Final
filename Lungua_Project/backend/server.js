import express from "express";
import mongoose from "mongoose";
import cors from "cors";

console.log("Starting Lungua backend...");

const app = express();

/* =======================
   Middleware
======================= */
app.use(cors());
app.use(express.json());

/* =======================
   MongoDB Connection
======================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

/* =======================
   Health & Root Routes
======================= */
app.get("/", (req, res) => {
  res.send("ROOT OK");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =======================
   Patient Schema & Model
======================= */
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  caregiverPhone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Patient = mongoose.model("Patient", patientSchema);

/* =======================
   API Routes
======================= */
const router = express.Router();

/* Test GET */
router.get("/patients", (req, res) => {
  res.json({ message: "GET works" });
});

/* Add Patient */
router.post("/patients", async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json({
      message: "Patient added successfully",
      patient
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/api", router);

/* =======================
   Start Server
======================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
