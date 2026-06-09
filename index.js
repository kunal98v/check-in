import express from "express";

const app = express();

app.use(express.json());

app.post("/checkin", (req, res) => {
  const now = new Date();

  console.log("Triggered from MacroDroid Success");
  console.log("Time:", now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  }));


  res.json({
    success: true,
    receivedAt: now.toISOString()
  });
});

app.listen(3000, () => {
  console.log("Running on port 3000");
});