// models/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  attendanceType: {
    type: String,
    enum: ["MORNING_ENTRY", "LUNCH_EXIT", "LUNCH_ENTRY", "END_EXIT"],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    accuracy: {
      type: Number
    }
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    ipAddress: String
  },
  isWithinGeofence: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceSchema.index({ employee: 1, timestamp: -1 });
attendanceSchema.index({ employee: 1, attendanceType: 1, timestamp: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);