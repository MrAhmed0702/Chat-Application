import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const ChatTest = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [socket, setSocket] = useState(null);
    const [typingUser, setTypingUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messageEndRef = useRef(null);

    const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZWM1NzI4ZTA3MzcwYjE5OWExYzM5OCIsImlhdCI6MTc0MzYyMzU3NSwiZXhwIjoxNzQ0MjI4Mzc1fQ.7TaY_kGEKRNLgwzjYKg-R45FRFgGc-xyghCNRGc0-3o"; // Replace with dynamic token
    const userId = "67ec5728e07370b199a1c398";
    const receiverId = "67ec581b622db187c5fa15fa";
    const API_URL = "http://localhost:5001";

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${API_URL}/api/chat/users`, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                setError("Failed to load users");
            }
        };
        fetchUsers();
    }, [userToken]);

    // Fetch rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await fetch(`${API_URL}/api/chat/rooms`, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
                const data = await res.json();
                setRooms(data);
            } catch (err) {
                setError("Failed to load rooms");
            }
        };
        fetchRooms();
    }, [userToken]);

    // Fetch messages (DM or room)
    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const url = selectedRoom
                    ? `${API_URL}/api/chat/rooms/${selectedRoom}/messages`
                    : `${API_URL}/api/chat/messages/${receiverId}`;
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
                const data = await res.json();
                setMessages(data);
            } catch (err) {
                setError("Failed to load messages");
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [receiverId, selectedRoom, userToken]);

    // Socket.IO setup
    useEffect(() => {
        const socketInstance = io(API_URL, { auth: { token: userToken } });

        socketInstance.on("connect", () => {
            console.log("Connected to WebSocket");
            if (selectedRoom) {
                socketInstance.emit("joinRoom", { roomId: selectedRoom });
            } else {
                socketInstance.emit("joinDM", { receiverId });
            }
        });

        socketInstance.on("receiveMessage", (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socketInstance.on("messageRead", (message) => {
            setMessages((prev) =>
                prev.map(m => m._id === message._id ? message : m)
            );
        });

        socketInstance.on("typing", ({ name }) => setTypingUser(name));
        socketInstance.on("stopTyping", () => setTypingUser(null));

        setSocket(socketInstance);

        return () => socketInstance.disconnect();
    }, [userToken, receiverId, selectedRoom]);

    const sendMessage = () => {
        if (!newMessage.trim()) return;
        socket.emit("sendMessage", {
            receiverId: selectedRoom ? null : receiverId,
            roomId: selectedRoom,
            content: newMessage,
        });
        setNewMessage("");
    };

    const markRead = (messageId) => {
        socket.emit("markMessageRead", { messageId, roomId: selectedRoom });
    };

    const handleTyping = () => {
        socket.emit("typing", { receiverId, roomId: selectedRoom });
        setTimeout(() => socket.emit("stopTyping", { receiverId, roomId: selectedRoom }), 2000);
    };

    // Auto-scroll to the latest message
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="max-w-xl mx-auto mt-10 p-5 border rounded shadow-lg">
            <h2 className="text-xl font-bold mb-3">Chat Test</h2>

            {error && <p className="text-red-500">{error}</p>}

            <div>
                <h3 className="font-semibold mb-2">Users</h3>
                {users.map(user => (
                    <div key={user._id} className="p-2 border rounded mb-1">
                        {user.name}
                    </div>
                ))}
                <h3 className="font-semibold mt-3 mb-2">Rooms</h3>
                {rooms.map(room => (
                    <button
                        key={room._id}
                        className={`p-2 border rounded mb-1 w-full ${selectedRoom === room._id ? "bg-blue-500 text-white" : ""}`}
                        onClick={() => setSelectedRoom(room._id)}
                    >
                        {room.name}
                    </button>
                ))}
            </div>

            <div className="h-60 overflow-y-auto border p-3 mb-3 bg-gray-100">
                {loading ? (
                    <p>Loading messages...</p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg._id}
                            className={`mb-2 p-2 rounded ${msg.sender._id === userId ? "bg-blue-300 text-white" : "bg-gray-300"}`}
                            onClick={() => !msg.read && markRead(msg._id)}
                        >
                            <strong>{msg.sender.name}: </strong> {msg.content} {msg.read ? "(read)" : "(unread)"}
                        </div>
                    ))
                )}
                <div ref={messageEndRef} />
            </div>

            {typingUser && <p className="text-sm text-gray-500">{typingUser} is typing...</p>}

            <input
                type="text"
                className="border p-2 w-full mb-2"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            />
            <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" onClick={sendMessage}>
                Send Message
            </button>
        </div>
    );
};

export default ChatTest;