const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');

// Get message history between two users
router.get('/messages/:receiverId', authMiddleware, async (req, res) => {
    try {
        const senderId = req.user; // From authMiddleware
        const { receiverId } = req.params;

        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId },
            ],
        })
            .sort({ timestamp: 1 }) // Sort by timestamp (oldest first)
            .populate('sender', 'name profilePic') // Populate sender details
            .populate('receiver', 'name profilePic'); // Populate receiver details

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error });
    }
});

// Get list of all users
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }) // Exclude the current user
            .select('name email profilePic');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

// Create a new chat room
router.post('/rooms', authMiddleware, async (req, res) => {
    try {
        const { name, memberIds } = req.body; // memberIds is an array of user IDs
        const members = [req.user._id, ...memberIds]; // Include creator

        const room = new Room({ name, members });
        await room.save();

        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ message: 'Error creating room', error });
    }
});

// Get all rooms the user is part of
router.get('/rooms', authMiddleware, async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.user._id });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rooms', error });
    }
});

// Mark messages as read
router.put('/messages/:messageId/read', authMiddleware, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (message.receiver?.toString() !== req.user._id.toString() && !message.room) {
            return res.status(403).json({ message: 'Not authorized to mark this message as read' });
        }
        message.read = true;
        await message.save();
        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error marking message as read', error });
    }
});

module.exports = router;