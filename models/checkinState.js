import mongoose from "mongoose";

const checkinStateSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    dateKey: { type: String, required: true },
    checkInId: { type: String, required: true },
  },
  { timestamps: true }
);

checkinStateSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model(
  "CheckinState",
  checkinStateSchema,
  "checkin_state"
);
