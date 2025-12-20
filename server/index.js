const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/auth.routes');
const noticesRoutes = require('./src/routes/notices.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const pollsRoutes = require('./src/routes/polls.routes');
const propertiesRoutes = require('./src/routes/properties.routes');
const usersRoutes = require('./src/routes/users.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/communities', require('./src/routes/communities.routes'));
app.use('/api/payments', require('./src/routes/payments.routes'));
app.use('/api/maintenance', require('./src/routes/maintenance.routes')); // New Maintenance Routes

// Base route
app.get('/', (req, res) => {
    res.send('Admin Comunidad API is running');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
