const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// ✅ REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "An account is already registered with this email" 
      });
    }

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful! You can now log in.",
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server encountered an error during registration" 
    });
  }
});

// ✅ LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ 
        success: false, 
        message: "This account has been deactivated." 
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
      { expiresIn: "7d" }
    );

    // ✅ FIXED: Use updateOne to bypass any other pre-save or subdocument validation rules
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address || []
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server encountered an error during login" 
    });
  }
});

// ✅ LOGOUT
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (token) {
      try {
        const decoded = jwt.verify(
          token, 
          process.env.JWT_SECRET || "your-secret-key-change-in-production"
        );
        
        await User.updateOne(
          { _id: decoded.id },
          { $set: { lastLogout: new Date() } }
        );
      } catch (err) {
        console.log("Token expired during logout cleanup step.");
      }
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server encountered an error during logout" 
    });
  }
});

module.exports = router;