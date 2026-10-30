import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const daysAgo = (n) => new Date(Date.now() - n * 864e5 - Math.random() * 864e5);

const specs = ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Oncology', 'Gynecology', 'ENT'];
const hospitals = ['Chittagong Medical College Hospital', 'Evercare Hospital Chattogram', 'Max Hospital Chattogram', 'Dhaka Central Hospital'];
const doctorNames = ['Rahim Uddin', 'Nusrat Jahan', 'Tanvir Ahmed', 'Sadia Karim', 'Imran Hossain', 'Farhana Akter', 'Mahmud Hasan', 'Sumaiya Rahman', 'Arif Chowdhury', 'Nabila Islam', 'Kamal Hossen', 'Tasnim Sultana'];
const first = ['Abdul', 'Mizanur', 'Shirin', 'Rafiq', 'Jannat', 'Hasan', 'Mitu', 'Sajib', 'Rumana', 'Nayeem', 'Lubna', 'Faisal', 'Tania', 'Shakib', 'Mim'];
const last = ['Karim', 'Begum', 'Islam', 'Khan', 'Das', 'Roy', 'Mia', 'Sarkar', 'Ali', 'Chowdhury'];
const conditions = ['Hypertension', 'Diabetes', 'Migraine', 'Asthma', 'Fracture', 'Skin allergy', 'Anemia', 'Fever'];

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([User.deleteMany({}), Doctor.deleteMany({}), Patient.deleteMany({})]);

await User.create({
  name: 'Admin',
  email: process.env.ADMIN_EMAIL || 'admin@doctortracker.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
});

const doctors = await Doctor.insertMany(
  doctorNames.map((name, i) => ({
    name: `Dr. ${name}`,
    specialization: specs[i % specs.length],
    hospital: pick(hospitals),
    phone: `+88017${String(10000000 + Math.floor(Math.random() * 89999999))}`,
    email: `${name.toLowerCase().replace(/\s/g, '.')}@clinic.com`,
    createdAt: daysAgo(Math.floor(Math.random() * 60) + 30),
  }))
);

const patients = Array.from({
  length: 140
}, () => ({
  name: `${pick(first)} ${pick(last)}`,
  age: 3 + Math.floor(Math.random() * 85),
  gender: pick(['Male', 'Female', 'Other']),
  phone: `+88018${String(10000000 + Math.floor(Math.random() * 89999999))}`,
  condition: pick(conditions),
  notes: '',
  // Skewed so some doctors are busier than others
  doctor: doctors[Math.floor(Math.pow(Math.random(), 1.6) * doctors.length)]._id,
  createdAt: daysAgo(Math.floor(Math.random() * 45)),
}));
await Patient.insertMany(patients);

console.log(`Seeded ${doctors.length} doctors, ${patients.length} patients`);
console.log(`Login: ${process.env.ADMIN_EMAIL || 'admin@doctortracker.com'} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
await mongoose.disconnect();