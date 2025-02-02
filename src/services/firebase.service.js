// src/services/firebase.service.js
import { ConexaoFirebase } from '../config.js';

const db = ConexaoFirebase();
const ruidoCollection = db.collection('ruido');

export { db, ruidoCollection };
