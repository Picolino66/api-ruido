import express from 'express';
import cors from 'cors';
import { ConexaoFirebase } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

const port = 4000;
const db = ConexaoFirebase();
const ruido = db.collection('ruido');

<<<<<<< HEAD
app.post('/api/ruido', async (req, res) => {
=======
app.post('/ruido', async (req, res) => {
>>>>>>> 302855bacc7c8594a57e44c7daa41592656f6c3c
  const { setor, Data, DB, lat, lng } = req.body;

  // Validação básica dos dados recebidos
  if (!setor || !Data || lat === undefined || lng === undefined || DB === undefined) {
    return res.status(400).send({ msg: "Todos os campos (setor, Data, DB, lat, lng) são obrigatórios." });
  }

  try {
    // Conversão de `Data` (timestamp ISO) para data, hora e minuto
    const dateObj = new Date(Data);
    const data = dateObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const hora = String(dateObj.getUTCHours()).padStart(2, '0'); // Hora no formato HH
    const minuto = String(dateObj.getUTCMinutes()).padStart(2, '0'); // Minuto no formato MM

    // Documento do setor (inclui um campo para garantir sua existência)
    const setorDocRef = ruido.doc(setor);
    await setorDocRef.set({ criadoEm: new Date().toISOString() }, { merge: true });

    // Documento da data com as coordenadas e `dB` organizado por hora e minuto
    const dataDocRef = setorDocRef.collection('datas').doc(data);
    await dataDocRef.set({
      coordenadas: { lat, lng },
      createdAt: new Date().toISOString(),
      horas: {
        [hora]: {
          [minuto]: DB
        }
      }
    }, { merge: true });

    res.send({ msg: `Medição de ruído salva com sucesso para o setor ${setor} na data ${data}, às ${hora}:${minuto}.`, coordenadas: { lat, lng } });
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    res.status(500).send({ msg: "Erro ao processar sua solicitação." });
  }
});


app.get('/ruido', async (req, res) => {
  try {
    const setoresSnapshot = await ruido.get();
    if (setoresSnapshot.empty) {
      return res.status(404).send({ msg: "Nenhum setor encontrado." });
    }

    const response = {
      series: [],
      categories: []
    };

    // Iterar por cada setor e coletar os dados
    for (const setorDoc of setoresSnapshot.docs) {
      const setorId = setorDoc.id;
      const setorData = {
        name: setorId,
        data: []
      };

      const datasSnapshot = await setorDoc.ref.collection('datas').get();
      
      // Iterar por cada data no setor
      for (const dataDoc of datasSnapshot.docs) {
        const data = dataDoc.id; // Data no formato YYYY-MM-DD

        const horasData = dataDoc.data().horas;
        if (!horasData) continue; // Pular se não houver dados de horas

        // Iterar por cada hora e minuto
        for (const [hora, minutos] of Object.entries(horasData)) {
          for (const [minuto, dB] of Object.entries(minutos)) {
            // Formatar o timestamp para exibição no eixo X (ex: "15:30 - 2024-11-13")
            const formattedTime = `${hora}:${minuto} - ${data}`;
            
            // Adiciona a categoria apenas uma vez (evita duplicação)
            if (!response.categories.includes(formattedTime)) {
              response.categories.push(formattedTime);
            }

            // Adiciona o valor dB na série do setor
            setorData.data.push(dB);
          }
        }
      }

      // Adiciona o setor à lista de séries
      response.series.push(setorData);
    }

    res.send(response);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    res.status(500).send({ msg: "Erro ao processar sua solicitação." });
  }
});

app.get('/ruido/:data', async (req, res) => {
  const dataFormatada = req.params.data; // Data no formato "YYYY-MM-DD"
  const resultado = []; // Array para armazenar o resultado de cada setor

  try {
    // Obter todos os setores na coleção "ruido"
    const setoresSnapshot = await ruido.get();
    if (setoresSnapshot.empty) {
      return res.status(404).send({ msg: "Nenhum setor encontrado." });
    }

    // Iterar por cada setor para calcular a média de dB para a data especificada
    for (const setorDoc of setoresSnapshot.docs) {
      const setorId = setorDoc.id;
      const coordenadas = setorDoc.data().coordenadas || { lat: null, lng: null }; // Coordenadas ou null

      // Acessar a subcoleção "datas" para o setor e buscar a data fornecida
      const dataDocRef = setorDoc.ref.collection('datas').doc(dataFormatada);
      const dataDocSnapshot = await dataDocRef.get();

      if (dataDocSnapshot.exists) {
        const horasSnapshot = await dataDocRef.collection('horas').get();
        let somaDB = 0; // Soma de dB para o cálculo da média
        let count = 0; // Contador de registros para calcular a média

        // Iterar por cada hora e minuto dentro da data
        for (const horaDoc of horasSnapshot.docs) {
          const minutosSnapshot = await horaDoc.ref.collection('minutos').get();

          for (const minutoDoc of minutosSnapshot.docs) {
            const dados = minutoDoc.data();

            // Acumular o valor de dB se ele existir
            if (dados.dB !== undefined && typeof dados.dB === 'number') {
              somaDB += dados.dB;
              count++;
            }
          }
        }

        // Calcular a média de dB para o setor na data especificada, se houver dados
        const mediaDB = count > 0 ? somaDB / count : null;

        // Adicionar o setor e seus dados ao resultado
        resultado.push({
          setor: setorId,
          mediaDB: mediaDB,
          lat: coordenadas.lat,
          lng: coordenadas.lng
        });
      }
    }

    // Retornar o resultado com todos os setores para a data especificada
    res.send({ data: dataFormatada, resultado });
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    res.status(500).send({ msg: "Erro ao processar sua solicitação." });
  }
});



app.listen(port, () => console.log(`API rest iniciada em http://localhost:${port}`));
