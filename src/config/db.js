import mongoose from 'mongoose';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: true
  });
  console.log('MongoDB connected');
}