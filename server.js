const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://madara_bot:S4xUPFkqxyeq26Nb@cluster0.lq2wx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

// Create a new chat session
app.post('/create-session', async (req, res) => {
    const { chatId } = req.body;
    try {
        const session = new ChatSession({ chatId });
        await session.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
});

// Validate a chat session
app.get('/validate-session/:chatId', async (req, res) => {
    const { chatId } = req.params;
    try {
        const session = await ChatSession.findOne({ chatId });
        if (session) {
            res.json({ success: true, session });
        } else {
            res.json({ success: false, error: 'Session not found' });
        }
    } catch (error) {
        console.error('Error validating session:', error);
        res.status(500).json({ success: false, error: 'Failed to validate session' });
    }
});

// End a chat session
app.post('/end-session', async (req, res) => {
    const { chatId } = req.body;
    try {
        await ChatSession.updateOne({ chatId }, { status: 'expired' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ success: false, error: 'Failed to end session' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
