import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Instructor Portal account.
//
// Secret fields (password hash, apiKey, private contact info) are marked
// `select: false`, so they are never loaded by a query unless the code asks
// for them explicitly with `.select('+field')`. Even if a filter ever matched
// the wrong document, these values would not reach the response.
const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    // Stores the bcrypt hash, never the plain-text password.
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, enum: ['instructor', 'superadmin'], default: 'instructor' },

    // Private fields: never part of the public directory or search results.
    apiKey: { type: String, select: false },
    privateEmail: { type: String, select: false },
    privatePhone: { type: String, select: false }
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed.
instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

instructorSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
