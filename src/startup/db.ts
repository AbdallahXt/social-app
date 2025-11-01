import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  mongoose.set('strictQuery', true);
  console.log('MongoDB connected');
}
