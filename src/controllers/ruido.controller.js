// src/controllers/ruido.controller.js
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { parseDateParts } from '../utils/dateUtils.js';
import { getDistanceFromLatLonInKm } from '../utils/geoUtils.js';
import { db, ruidoCollection } from '../services/firebase.service.js';

export const createRuido = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Erros de validação:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { setor, Data, DB, lat, lng } = req.body;
  const dateParts = parseDateParts(Data);
  if (!dateParts) {
    logger.warn('Data inválida recebida:', Data);
    return res.status(400).json({ msg: "Data inválida." });
  }
  const { data, hora, minuto } = dateParts;

  const batch = db.batch();
  const setorDocRef = ruidoCollection.doc(setor);
  const dataDocRef = setorDocRef.collection('datas').doc(data);

  try {
    // Cria ou atualiza o documento do setor
    batch.set(setorDocRef, { criadoEm: new Date().toISOString() }, { merge: true });

    // Prepara os dados para a data (com medições organizadas por hora e minuto)
    const dataPayload = {
      coordenadas: { lat, lng },
      createdAt: new Date().toISOString(),
      horas: {
        [hora]: {
          [minuto]: DB
        }
      }
    };

    batch.set(dataDocRef, dataPayload, { merge: true });
    await batch.commit();

    return res.send({
      msg: `Medição de ruído salva com sucesso para o setor ${setor} na data ${data}, às ${hora}:${minuto}.`,
      coordenadas: { lat, lng }
    });
  } catch (error) {
    logger.error("Erro ao salvar dados:", error);
    return res.status(500).json({ msg: "Erro ao processar sua solicitação." });
  }
};

export const getSetores = async (req, res) => {
  try {
    const setoresSnapshot = await ruidoCollection.get();
    let setores = [];
    setoresSnapshot.forEach(doc => {
      setores.push({ setor: doc.id, ...doc.data() });
    });
    return res.json(setores);
  } catch (error) {
    logger.error("Erro ao buscar setores:", error);
    return res.status(500).json({ msg: "Erro ao buscar setores" });
  }
};

export const getSetor = async (req, res) => {
  const { setor } = req.params;
  try {
    const setorDoc = await ruidoCollection.doc(setor).get();
    if (!setorDoc.exists) {
      return res.status(404).json({ msg: "Setor não encontrado." });
    }
    return res.json({ setor: setorDoc.id, ...setorDoc.data() });
  } catch (error) {
    logger.error("Erro ao buscar setor:", error);
    return res.status(500).json({ msg: "Erro ao buscar setor." });
  }
};

export const getDatas = async (req, res) => {
  const { setor } = req.params;
  try {
    const datasSnapshot = await ruidoCollection.doc(setor).collection('datas').get();
    let datas = [];
    datasSnapshot.forEach(doc => {
      datas.push({ data: doc.id, ...doc.data() });
    });
    return res.json(datas);
  } catch (error) {
    logger.error("Erro ao buscar datas:", error);
    return res.status(500).json({ msg: "Erro ao buscar datas." });
  }
};

export const getData = async (req, res) => {
  const { setor, data } = req.params;
  try {
    const docSnapshot = await ruidoCollection.doc(setor).collection('datas').doc(data).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ msg: "Data não encontrada para este setor." });
    }
    return res.json({ data: docSnapshot.id, ...docSnapshot.data() });
  } catch (error) {
    logger.error("Erro ao buscar dados da data:", error);
    return res.status(500).json({ msg: "Erro ao buscar dados da data." });
  }
};

export const getHoras = async (req, res) => {
  const { setor, data } = req.params;
  try {
    const docSnapshot = await ruidoCollection.doc(setor).collection('datas').doc(data).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ msg: "Data não encontrada para este setor." });
    }
    const dataContent = docSnapshot.data();
    const horas = dataContent.horas ? Object.keys(dataContent.horas) : [];
    return res.json({ horas });
  } catch (error) {
    logger.error("Erro ao buscar horas:", error);
    return res.status(500).json({ msg: "Erro ao buscar horas." });
  }
};

export const getHoraDetails = async (req, res) => {
  const { setor, data, hora } = req.params;
  try {
    const docSnapshot = await ruidoCollection.doc(setor).collection('datas').doc(data).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ msg: "Data não encontrada para este setor." });
    }
    const dataContent = docSnapshot.data();
    const hourData = dataContent.horas ? dataContent.horas[hora] : null;
    if (!hourData) {
      return res.status(404).json({ msg: "Hora não encontrada para esta data." });
    }
    return res.json({ hora, mediacoes: hourData });
  } catch (error) {
    logger.error("Erro ao buscar detalhes da hora:", error);
    return res.status(500).json({ msg: "Erro ao buscar detalhes da hora." });
  }
};

export const getMinuto = async (req, res) => {
  const { setor, data, hora, minuto } = req.params;
  try {
    const docSnapshot = await ruidoCollection.doc(setor).collection('datas').doc(data).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ msg: "Data não encontrada para este setor." });
    }
    const dataContent = docSnapshot.data();
    const hourData = dataContent.horas ? dataContent.horas[hora] : null;
    if (!hourData || hourData[minuto] === undefined) {
      return res.status(404).json({ msg: "Medição não encontrada para este minuto." });
    }
    return res.json({ setor, data, hora, minuto, DB: hourData[minuto] });
  } catch (error) {
    logger.error("Erro ao buscar a medição:", error);
    return res.status(500).json({ msg: "Erro ao buscar a medição." });
  }
};

export const getLatestMeasurement = async (req, res) => {
  const { setor } = req.params;
  try {
    const datasSnapshot = await ruidoCollection.doc(setor).collection('datas').get();
    if (datasSnapshot.empty) {
      return res.status(404).json({ msg: "Nenhuma medição encontrada para este setor." });
    }
    let latestDataDoc = null;
    let latestDate = null;
    datasSnapshot.forEach(doc => {
      const currentDate = new Date(doc.id);
      if (!latestDate || currentDate > latestDate) {
        latestDate = currentDate;
        latestDataDoc = doc;
      }
    });
    if (!latestDataDoc) {
      return res.status(404).json({ msg: "Nenhuma medição encontrada para este setor." });
    }
    const dataContent = latestDataDoc.data();
    if (!dataContent.horas) {
      return res.status(404).json({ msg: "Nenhuma medição encontrada para este setor." });
    }
    const horas = Object.keys(dataContent.horas);
    if (!horas.length) {
      return res.status(404).json({ msg: "Nenhuma medição encontrada para este setor." });
    }
    horas.sort((a, b) => Number(b) - Number(a));
    let latestHora = horas[0];
    const minutosObj = dataContent.horas[latestHora];
    const minutos = Object.keys(minutosObj);
    minutos.sort((a, b) => Number(b) - Number(a));
    let latestMinuto = minutos[0];
    return res.json({
      setor,
      data: latestDataDoc.id,
      hora: latestHora,
      minuto: latestMinuto,
      DB: minutosObj[latestMinuto],
      coordenadas: dataContent.coordenadas
    });
  } catch (error) {
    logger.error("Erro ao buscar medição mais recente:", error);
    return res.status(500).json({ msg: "Erro ao buscar medição mais recente." });
  }
};

export const getEstatisticas = async (req, res) => {
  const { setor } = req.params;
  const { dataInicio, dataFim } = req.query;
  try {
    const datasSnapshot = await ruidoCollection.doc(setor).collection('datas').get();
    if (datasSnapshot.empty) {
      return res.status(404).json({ msg: "Nenhuma medição encontrada para este setor." });
    }
    let totalDB = 0;
    let count = 0;
    let minDB = Infinity;
    let maxDB = -Infinity;
    datasSnapshot.forEach(doc => {
      const dateKey = doc.id;
      if ((dataInicio && dateKey < dataInicio) || (dataFim && dateKey > dataFim)) {
        return;
      }
      const dataContent = doc.data();
      if (dataContent.horas) {
        Object.values(dataContent.horas).forEach(minutosObj => {
          Object.values(minutosObj).forEach(dbValue => {
            const value = Number(dbValue);
            totalDB += value;
            count++;
            if (value < minDB) minDB = value;
            if (value > maxDB) maxDB = value;
          });
        });
      }
    });
    if (count === 0) {
      return res.status(404).json({ msg: "Nenhuma medição encontrada no período especificado." });
    }
    const averageDB = totalDB / count;
    return res.json({
      setor,
      count,
      minDB,
      maxDB,
      averageDB
    });
  } catch (error) {
    logger.error("Erro ao calcular estatísticas:", error);
    return res.status(500).json({ msg: "Erro ao calcular estatísticas." });
  }
};

export const getMediacoes = async (req, res) => {
  const { setor, dataInicio, dataFim, horaInicio, horaFim } = req.query;
  try {
    let setoresQuery = [];
    if (setor) {
      setoresQuery.push(setor);
    } else {
      const setoresSnapshot = await ruidoCollection.get();
      setoresSnapshot.forEach(doc => {
        setoresQuery.push(doc.id);
      });
    }

    let results = [];
    for (let s of setoresQuery) {
      const datasSnapshot = await ruidoCollection.doc(s).collection('datas').get();
      datasSnapshot.forEach(doc => {
        const dateKey = doc.id;
        if ((dataInicio && dateKey < dataInicio) || (dataFim && dateKey > dataFim)) {
          return;
        }
        const dataContent = doc.data();
        if (dataContent.horas) {
          Object.entries(dataContent.horas).forEach(([horaKey, minutosObj]) => {
            if ((horaInicio && horaKey < horaInicio) || (horaFim && horaKey > horaFim)) {
              return;
            }
            Object.entries(minutosObj).forEach(([minutoKey, dbValue]) => {
              results.push({
                setor: s,
                data: dateKey,
                hora: horaKey,
                minuto: minutoKey,
                DB: dbValue,
                coordenadas: dataContent.coordenadas
              });
            });
          });
        }
      });
    }

    return res.json(results);
  } catch (error) {
    logger.error("Erro ao buscar medições:", error);
    return res.status(500).json({ msg: "Erro ao buscar medições." });
  }
};

export const getMediacoesPorLocalizacao = async (req, res) => {
  const { lat, lng, raio } = req.query;
  if (lat === undefined || lng === undefined || raio === undefined) {
    return res.status(400).json({ msg: "Parâmetros lat, lng e raio são obrigatórios." });
  }
  const latQuery = Number(lat);
  const lngQuery = Number(lng);
  const raioQuery = Number(raio);

  try {
    const setoresSnapshot = await ruidoCollection.get();
    let results = [];
    for (let doc of setoresSnapshot.docs) {
      const setor = doc.id;
      const datasSnapshot = await ruidoCollection.doc(setor).collection('datas').get();
      datasSnapshot.forEach(dataDoc => {
        const dataContent = dataDoc.data();
        if (dataContent.coordenadas && dataContent.coordenadas.lat !== undefined && dataContent.coordenadas.lng !== undefined) {
          const distance = getDistanceFromLatLonInKm(
            latQuery,
            lngQuery,
            dataContent.coordenadas.lat,
            dataContent.coordenadas.lng
          );
          if (distance <= raioQuery) {
            results.push({
              setor,
              data: dataDoc.id,
              coordenadas: dataContent.coordenadas,
              distance,
              mediacoes: dataContent.horas || {}
            });
          }
        }
      });
    }
    return res.json(results);
  } catch (error) {
    logger.error("Erro ao buscar medições por localização:", error);
    return res.status(500).json({ msg: "Erro ao buscar medições por localização." });
  }
};
