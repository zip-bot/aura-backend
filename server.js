// server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// اتصال MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// نموذج المستخدم
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verificationCode: String,
});
const User = mongoose.model("User", userSchema);

// إعداد Brevo عبر Nodemailer
const transporter = nodemailer.createTransport({
  service: "Brevo",
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_API_KEY,
  },
});

// تسجيل حساب جديد
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already registered" });

  const code = uuidv4().split("-")[0];
  const user = new User({ username, email, password, verificationCode: code });
  await user.save();

  await transporter.sendMail({
    from: process.env.BREVO_EMAIL,
    to: email,
    subject: "Aura Verification Code",
    text: `Your Aura verification code is: ${code}`,
  });

  res.json({ message: "Verification code sent" });
});

// التحقق من الكود
app.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.verificationCode !== code)
    return res.status(400).json({ message: "Invalid code" });

  user.verified = true;
  await user.save();

  res.json({ message: "Account verified successfully" });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Server running on port 3000")
);
