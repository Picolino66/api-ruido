// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ruidoRoutes from './routes/ruido.routes.js';

dotenv.config();

const app = express();

// Configuração do CORS (a variável ALLOWED_ORIGIN pode restringir as origens)
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

app.use(express.json());

// Prefixo "/api" para todas as rotas do módulo "ruido"
app.use('/api', ruidoRoutes);

export default app;
