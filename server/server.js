const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000

// Middleware
app.use(cors());
app.use(express.json());


app.get("/api", (req, res) => {
    res.json({"users": ["userOne", "userTwo", "userThree", "userFour"]})
})


app.get("/api/health", (req, res) => {
    res.json({ status: 'Server is running!' });
});


app.post('/api/students/upload', (req, res) => {
    console.log('📁 File upload endpoint hit!');
    res.json({ 
        success: true,
        message: 'File received successfully! Backend is working.' 
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`)
})