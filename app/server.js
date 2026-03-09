const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/status', (req, res) => {
  res.status(200).json({ status: 'up', timestamp: new Date().toISOString() });
});

app.post('/process', (req, res) => {
  const data = req.body;
  res.status(200).json({ message: 'Data processed successfully', data });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
