// src/server.js
import app from './app.js';
import logger from './utils/logger.js';

const port = process.env.PORT || 4000;

app.listen(port, () => {
  logger.info(`API rest iniciada em http://localhost:${port}`);
});
