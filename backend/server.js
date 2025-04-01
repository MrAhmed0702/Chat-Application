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

    // Handle sending a message
    socket.on('sendMessage', async ({ receiverId, content }) => {
        try {
            const senderId = socket.user._id.toString();
            const room = [senderId, receiverId].sort().join('_');
            const message = {
                sender: senderId,
                receiver: receiverId,
                content,
                timestamp: new Date(),
            };

            const newMessage = await Message.create(message);
            const populatedMessage = await Message.findById(newMessage._id)
                .populate('sender', 'name profilePic')
                .populate('receiver', 'name profilePic');

            io.to(room).emit('receiveMessage', populatedMessage);
        } catch (error) {
            console.error('Error sending message:', error);
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