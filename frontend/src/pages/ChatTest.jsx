import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const ChatTest = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [socket, setSocket] = useState(null);

    const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZWM1ODFiNjIyZGIxODdjNWZhMTVmYSIsImlhdCI6MTc0MzU0NjkwNSwiZXhwIjoxNzQ0MTUxNzA1fQ.GUjzB1zqr8tHIzVMKZeMGJq9gkiCABlIWMOY8HQUJ7E"; // Assume token is stored after login
    const userId = "67ec581b622db187c5fa15fa"; // Replace with logged-in user ID
    const receiverId = "67ec5728e07370b199a1c398"; // Replace with chat partner's ID
    const API_URL = "http://localhost:5001";

    // ✅ Fetch chat messages from API
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await fetch(`${API_URL}/api/chat/messages/${receiverId}`, {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                });
                const data = await response.json();
                setMessages(data);
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };

        fetchMessages();
    }, [receiverId, userToken]);

    // ✅ Connect to WebSocket server
    useEffect(() => {
        const socketInstance = io(API_URL, {
            auth: { token: userToken },
        });

        socketInstance.on("connect", () => {
            console.log("Connected to WebSocket");

            // Join a DM chat room
            socketInstance.emit("joinDM", { receiverId });
        });

        // ✅ Listen for incoming messages
        socketInstance.on("receiveMessage", (message) => {
            setMessages((prev) => [...prev, message]);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [userToken, receiverId]);

    // ✅ Send message
    const sendMessage = () => {
        if (newMessage.trim() === "") return;

        const messageData = {
            receiverId,
            content: newMessage,
        };

        socket.emit("sendMessage", messageData);
        setNewMessage("");
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-5 border rounded shadow-lg">
            <h2 className="text-xl font-bold mb-3">Chat Test</h2>
            <div className="h-60 overflow-y-auto border p-3 mb-3 bg-gray-100">
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-2 p-2 rounded ${msg.sender._id === userId ? "bg-blue-300 text-white" : "bg-gray-300"}`}>
                        <strong>{msg.sender.name}: </strong> {msg.content}
                    </div>
                ))}
            </div>
            <input
                type="text"
                className="border p-2 w-full mb-2"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
            />
            <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" onClick={sendMessage}>
                Send Message
            </button>
        </div>
    );
};

export default ChatTest;
