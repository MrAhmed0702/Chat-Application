const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken'); // For Socket.IO auth
const User = require('./models/User'); 
const Message = require('./models/Message');
const Room = require('./models/Room');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.json());
app.use(cors());

connectDB();

app.get('/', (req, res) => {
    res.send('🚀 Chat App Backend is Running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/uploads', express.static('uploads/ProfileImage/UserImage'));

// Socket.IO authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token; // Expect token in handshake
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        socket.user = user; // Attach user to socket object
        next();
    } catch (error) {
        console.error('Socket.IO Auth Error:', error);
        next(new Error('Authentication error: Invalid token'));
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.user.name, socket.id);

    // Join a direct message room
    socket.on('joinDM', ({ receiverId }) => {
        const senderId = socket.user._id.toString();
        const room = [senderId, receiverId].sort().join('_');
        socket.join(room);
        console.log(`User ${socket.user.name} joined DM room: ${room}`);
    });

     // Join a group chat room
     socket.on('joinRoom', ({ roomId }) => {
        socket.join(roomId);
        console.log(`User ${socket.user.name} joined room: ${roomId}`);
    });

    // Handle sending a message (DM or group)
    socket.on('sendMessage', async ({ receiverId, roomId, content }) => {
        try {
            const senderId = socket.user._id.toString();
            let message;

            if (roomId) {
                // Group message
                message = { sender: senderId, room: roomId, content, timestamp: new Date() };
                const room = await Room.findById(roomId);
                if (!room || !room.members.includes(senderId)) {
                    throw new Error('User not in room');
                }
                const newMessage = await Message.create(message);
                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'name profilePic');
                io.to(roomId).emit('receiveMessage', populatedMessage);
            } else if (receiverId) {
                // DM message
                const room = [senderId, receiverId].sort().join('_');
                message = { sender: senderId, receiver: receiverId, content, timestamp: new Date() };
                const newMessage = await Message.create(message);
                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'name profilePic')
                    .populate('receiver', 'name profilePic');
                io.to(room).emit('receiveMessage', populatedMessage);
            } else {
                throw new Error('Must specify receiverId or roomId');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    socket.on('markMessageRead', async ({ messageId, roomId }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message || (message.receiver && message.receiver.toString() !== socket.user._id.toString())) {
                return;
            }
            message.read = true;
            await message.save();
            const populatedMessage = await Message.findById(messageId)
                .populate('sender', 'name profilePic')
                .populate('receiver', 'name profilePic');
            if (roomId) {
                io.to(roomId).emit('messageRead', populatedMessage);
            } else {
                const room = [socket.user._id.toString(), message.sender.toString()].sort().join('_');
                io.to(room).emit('messageRead', populatedMessage);
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    });

     // Typing indicator
     socket.on('typing', ({ receiverId, roomId }) => {
        if (roomId) {
            socket.to(roomId).emit('typing', { userId: socket.user._id, name: socket.user.name });
        } else if (receiverId) {
            const room = [socket.user._id.toString(), receiverId].sort().join('_');
            socket.to(room).emit('typing', { userId: socket.user._id, name: socket.user.name });
        }
    });

    socket.on('stopTyping', ({ receiverId, roomId }) => {
        if (roomId) {
            socket.to(roomId).emit('stopTyping', { userId: socket.user._id });
        } else if (receiverId) {
            const room = [socket.user._id.toString(), receiverId].sort().join('_');
            socket.to(room).emit('stopTyping', { userId: socket.user._id });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.name, socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});