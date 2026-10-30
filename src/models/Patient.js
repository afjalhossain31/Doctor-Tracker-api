import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 120
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  condition: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
}, {
  timestamps: true
});

patientSchema.index({
  doctor: 1,
  createdAt: -1
}); // doctor's patients + patients-per-doctor
patientSchema.index({
  condition: 1,
  createdAt: -1
}); // condition filter + distribution
patientSchema.index({
  createdAt: -1
}); // date filter, time-series stats
patientSchema.index({
  name: 1
});

export default mongoose.model('Patient', patientSchema);