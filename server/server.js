import express from 'express';
import cors from 'cors';
import studentRoutes from './routes/students.js';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/students', studentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Routes: /api/students, /api/teachers`);
});

