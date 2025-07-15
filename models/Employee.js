// models/Employee.js
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  faceId: {
    type: [Number],  // descriptor vector
    required: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
employeeSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Employee", employeeSchema);
// models/Employee.js
// This model represents an employee with a name and a unique face ID.
// It can be used to store employee data in the MongoDB database.
// The faceId can be a hash of the image, a name, or any unique identifier used in face recognition systems.
// This model can be extended with more fields as needed, such as department, position, etc.
// This file defines the Employee model for the application, which is used to manage employee data in the MongoDB database.
// It includes fields for the employee's name and a unique face ID, which can be used for face recognition purposes.
// The model is exported for use in other parts of the application, such as routes or controllers