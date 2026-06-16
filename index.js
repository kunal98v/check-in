import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const STATE_FILE = path.join(process.cwd(), "state.json");

const CONFIG = {
  apiBase: "https://brained-leaveledger-api.brained.in/api/forms",
  projectName: "brained-leaveledger",
  communityName: "brained-leaveledger",
  employeeId: process.env.EMPLOYEE_ID || "6a1d1a2b2fda7700aab156ac",
  bearerToken: process.env.BEARER_TOKEN,
  latitude: 19.116206394276563,
  longitude: 72.85555719673278,
  attendanceWorkMode: "WFO",
  checkInBeforeHour: 11,
  checkOutAfterHour: 18,
};

app.use(express.json());

function getISTNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function getDateKey(date = getISTNow()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function locationString() {
  return `${CONFIG.latitude}, ${CONFIG.longitude}`;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getHeaders() {
  if (!CONFIG.bearerToken) {
    throw new Error("BEARER_TOKEN environment variable is not set");
  }

  return {
    accept: "application/json",
    authorization: `Bearer ${CONFIG.bearerToken}`,
    "community-name": CONFIG.communityName,
    "content-type": "application/json",
  };
}

function extractRecordId(data) {
  return data?._id || data?.data?._id || data?.result?._id;
}

async function createCheckIn() {
  const now = new Date();
  const dateKey = getDateKey();
  const payload = {
    projectName: CONFIG.projectName,
    employeeid: CONFIG.employeeId,
    dateKey,
    checkIn: now.toISOString(),
    isDeleted: false,
    from: locationString(),
    location: locationString(),
    latitude: CONFIG.latitude,
    longitude: CONFIG.longitude,
    attendanceWorkMode: CONFIG.attendanceWorkMode,
  };

  const response = await fetch(`${CONFIG.apiBase}/create/checkin_checkout`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Check-in API failed: ${JSON.stringify(data)}`);
  }

  const recordId = extractRecordId(data);
  if (recordId) {
    saveState({ checkInId: recordId, dateKey });
  }

  return data;
}

async function updateCheckOut() {
  const state = loadState();
  const today = getDateKey();

  if (!state.checkInId || state.dateKey !== today) {
    throw new Error("No check-in record found for today");
  }

  const now = new Date();
  const payload = {
    _id: state.checkInId,
    checkOut: now.toISOString(),
    projectName: CONFIG.projectName,
    checkOutFrom: locationString(),
    checkOutLatitude: CONFIG.latitude,
    checkOutLongitude: CONFIG.longitude,
  };

  const response = await fetch(`${CONFIG.apiBase}/update/checkin_checkout`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Check-out API failed: ${JSON.stringify(data)}`);
  }

  saveState({});
  return data;
}

app.post("/checkin", async (req, res) => {
  const istNow = getISTNow();
  const hour = istNow.getHours();
  const timeLabel = istNow.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  console.log("Triggered from MacroDroid");
  console.log("Time:", timeLabel);

  if (hour >= CONFIG.checkInBeforeHour && hour < CONFIG.checkOutAfterHour) {
    console.log("Ignored: outside check-in/check-out window");
    return res.json({
      success: false,
      action: "ignored",
      reason: "Only check-in before 11 AM or check-out after 6 PM IST",
      receivedAt: new Date().toISOString(),
    });
  }

  try {
    if (hour < CONFIG.checkInBeforeHour) {
      const state = loadState();
      const today = getDateKey();

      if (state.checkInId && state.dateKey === today) {
        console.log("Check-in already recorded for today");
        return res.json({
          success: true,
          action: "skipped",
          reason: "Check-in already recorded for today",
          receivedAt: new Date().toISOString(),
        });
      }

      const data = await createCheckIn();
      console.log("Check-in recorded");
      return res.json({
        success: true,
        action: "checkin",
        data,
        receivedAt: new Date().toISOString(),
      });
    }

    const data = await updateCheckOut();
    console.log("Check-out recorded");
    return res.json({
      success: true,
      action: "checkout",
      data,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      receivedAt: new Date().toISOString(),
    });
  }
});

app.listen(3000, () => {
  console.log("Running on port 3000");
});
