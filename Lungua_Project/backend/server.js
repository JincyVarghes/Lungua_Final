import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ROOT OK");
});

app.post("/ping", (req, res) => {
  res.json({ message: "PING OK" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("SERVER STARTED");
});
