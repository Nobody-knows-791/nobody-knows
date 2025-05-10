const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const uri = 'mongodb+srv://madara_bot:S4xUPFkqxyeq26Nb@cluster0.lq2wx.mongodb.net/nobodyknows?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('nobodyknows');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

connectDB();

const sessions = new Map();

app.use(express.json());
app.use(express.static('public'));

app.post('/create-session', async (req, res) => {
    try {
        const chatId = crypto.randomBytes(4).toString('hex');
        const maxUsers = req.body.maxUsers || 2;
        await db.collection('sessions').insertOne({
            chatId,
            status: 'active',
            maxUsers,
            createdAt: new Date()
        });
        sessions.set(chatId, new Set());
        res.status(200).json({ chatId });
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

app.get('/join-session/:chatId', async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const session = await db.collection('sessions').findOne({ chatId });
        if (session && session.status === 'active') {
            const clients = sessions.get(chatId) || new Set();
            if (clients.size < session.maxUsers) {
                res.status(200).json({ success: true });
            } else {
                res.status(400).json({ success: false, message: 'Max users reached' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Session expired or invalid' });
        }
    } catch (err) {
        console.error('Error joining session:', err);
        res.status(500).json({ error: 'Failed to join session' });
    }
});

app.post('/end-session/:chatId', async (req, res) => {
    try {
        const chatId = req.params.chatId;
        await db.collection('sessions').updateOne(
            { chatId },
            { $set: { status: 'expired', endedAt: new Date() } }
        );
        const clients = sessions.get(chatId);
        if (clients) {
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ message: 'Session ended by creator' }));
                    client.close();
                }
            });
            sessions.delete(chatId);
        }
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error ending session:', err);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

wss.on('connection', (ws, req) => {
    const chatId = req.url.split('/').pop();
    db.collection('sessions').findOne({ chatId }).then(session => {
        if (!session || session.status !== 'active') {
            ws.close();
            return;
        }
        const clients = sessions.get(chatId) || new Set();
        if (clients.size >= session.maxUsers) {
            ws.close();
            return;
        }
        clients.add(ws);
        sessions.set(chatId, clients);

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(message));
                    }
                });
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            if (clients.size === 0) {
                sessions.delete(chatId);
            }
        });
    }).catch(err => {
        console.error('WebSocket connection error:', err);
        ws.close();
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
