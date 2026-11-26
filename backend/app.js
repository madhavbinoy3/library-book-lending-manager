const express = require('express');
const cors = require('cors');
const bookRoutes = require('./routes/bookRoutes');
const loanRoutes = require('./routes/loanRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { sendResponse } = require('./utils/apiResponse');

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  return sendResponse(res, 200, true, 'Library Book Lending Manager API is running', {
    status: 'ok',
  });
});

app.use('/api/books', bookRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/stats', statsRoutes);

app.use((req, res) => {
  return sendResponse(res, 404, false, `Route not found: ${req.method} ${req.originalUrl}`);
});

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const firstMsg = Object.values(err.errors)[0]?.message || 'Validation failed';
    return sendResponse(res, 400, false, firstMsg);
  }
  if (err.name === 'CastError') {
    return sendResponse(res, 400, false, 'Invalid resource identifier');
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendResponse(res, 400, false, 'Invalid JSON request body');
  }

  console.error('Unhandled API Error:', err);
  return sendResponse(res, 500, false, 'Internal server error');
});

module.exports = app;
