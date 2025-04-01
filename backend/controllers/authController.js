const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { validationResult } = require('express-validator');
const fs = require('fs').promises;

require("dotenv").config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/ProfileImage/UserImage");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

// User Registration
const registerUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, phone } = req.body;
        const profilePic = req.file ? req.file.path : null;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            profilePic,
        });

        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error });
    }
};

// User Login
const loginUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profilePic: user.profilePic,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error });
    }
};

// Update User Profile
const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, phone } = req.body;
        const profilePic = req.file ? req.file.path : null;

        // Get the authenticated user ID from the middleware
        const userId = req.user;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the new email is already taken by another user
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ message: "Email is already in use" });
            }
        }

        // Check if the new phone is already taken by another user
        if (phone && phone !== user.phone) {
            const phoneExists = await User.findOne({ phone });
            if (phoneExists) {
                return res.status(400).json({ message: "Phone number is already in use" });
            }
        }

        // Delete old profile picture if a new one is uploaded (skip default image)
        if (profilePic && user.profilePic && user.profilePic !== "https://icon-library.com/images/default-user-icon/default-user-icon-8.jpg") {
            await fs.unlink(user.profilePic).catch(err => console.error("Error deleting old image:", err));
        }

        // Update fields if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (profilePic) user.profilePic = profilePic;

        // Save the updated user
        await user.save();

        res.json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profilePic: user.profilePic,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error });
    }
};

module.exports = { registerUser, loginUser, updateProfile, upload };