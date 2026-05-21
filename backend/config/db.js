import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB Connection Error: MONGO_URI is not set (add it in Render Environment).');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('whitelist') || error.message.includes('IP')) {
      console.error(
        'Atlas fix: Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)'
      );
    }
    process.exit(1);
  }
};
