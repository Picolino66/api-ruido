// src/routes/ruido.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import * as ruidoController from '../controllers/ruido.controller.js';

const router = Router();

router.post(
  '/ruido',
  [
    body('setor').notEmpty().withMessage('Setor é obrigatório.'),
    body('Data').isISO8601().withMessage('Data deve ser uma string ISO válida.'),
    body('DB').isNumeric().withMessage('DB deve ser um número.'),
    body('lat').isNumeric().withMessage('Lat deve ser um número.'),
    body('lng').isNumeric().withMessage('Lng deve ser um número.')
  ],
  ruidoController.createRuido
);

router.get('/ruido/setores', ruidoController.getSetores);
router.get('/ruido/:setor', ruidoController.getSetor);
router.get('/ruido/:setor/datas', ruidoController.getDatas);
router.get('/ruido/:setor/datas/:data', ruidoController.getData);
router.get('/ruido/:setor/datas/:data/horas', ruidoController.getHoras);
router.get('/ruido/:setor/datas/:data/horas/:hora', ruidoController.getHoraDetails);
router.get('/ruido/:setor/datas/:data/horas/:hora/minutos/:minuto', ruidoController.getMinuto);
router.get('/ruido/:setor/latest', ruidoController.getLatestMeasurement);
router.get('/ruido/:setor/estatisticas', ruidoController.getEstatisticas);
router.get('/ruido', ruidoController.getMediacoes);
router.get('/ruido/localizacao', ruidoController.getMediacoesPorLocalizacao);

export default router;
