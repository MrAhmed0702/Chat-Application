const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');

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

module.exports = router;