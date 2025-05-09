// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://madara_bot:S4xUPFkqxyeq26Nb@cluster0.lq2wx.mongodb.net/nobodyknows?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Session Schema
const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now, expires: '24h' }, // Sessions expire after 24h
    active: { type: Boolean, default: true },
    participants: { type: Number, default: 0 }
});

const Session = mongoose.model('Session', sessionSchema);

// Middleware
app.use(cors());
app.use(express.json());

// API Endpoints
app.post('/api/session/create', async (req, res) => {
    try {
        const sessionId = generateSessionId();
        const newSession = new Session({
            sessionId,
            active: true
        });
        await newSession.save();
        res.json({ success: true, sessionId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/session/join', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await Session.findOne({ sessionId });
        
        if (!session || !session.active) {
            return res.json({ success: false, error: 'Invalid or expired session ID' });
        }
        
        // Increment participant count
        session.participants += 1;
        await session.save();
        
        res.json({ success: true, sessionId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/session/end', async (req, res) => {
    try {
        const { sessionId } = req.body;
        await Session.findOneAndUpdate(
            { sessionId },
            { active: false }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateSessionId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
