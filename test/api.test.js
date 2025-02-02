// test/api.test.js
import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js'; // ajuste o caminho conforme sua estrutura

// Agrupamento geral dos testes para a API de Ruído
describe('API de Ruído - Testes Completos', function() {
  // Aumenta o tempo limite para testes que podem demorar devido às operações no Firebase
  this.timeout(15000);

  describe('POST /api/ruido', function() {
    this.timeout(10000);
  
    it('deve registrar uma medição de ruído com dados válidos', async () => {
      // Monta o payload com todos os campos obrigatórios
      const payload = {
        setor: 'test-setor-post',
        Data: new Date().toISOString(),
        DB: 70,
        lat: -23.5505,
        lng: -46.6333
      };
  
      const res = await request(app)
        .post('/api/ruido')
        .send(payload)
        .expect(200);
      
      // Verifica se a resposta contém uma mensagem e as coordenadas
      expect(res.body).to.have.property('msg');
      expect(res.body).to.have.property('coordenadas');
      expect(res.body.coordenadas).to.have.property('lat');
      expect(res.body.coordenadas).to.have.property('lng');
    });
  
    it('deve retornar erro 400 se algum campo obrigatório estiver faltando', async () => {
      // Monta o payload com um campo faltando (por exemplo, lng)
      const payload = {
        setor: 'test-setor-post',
        Data: new Date().toISOString(),
        DB: 70,
        lat: -23.5505
        // Faltando: lng
      };
  
      const res = await request(app)
        .post('/api/ruido')
        .send(payload)
        .expect(400);
      
      // Verifica se a resposta contém a mensagem de erro esperada
      expect(res.body).to.have.property('msg');
      expect(res.body.msg).to.equal("Todos os campos (setor, Data, DB, lat, lng) são obrigatórios.");
    });
  });

  // Definição de um setor de teste e de dois registros para simular medições
  const setorTeste = 'test-setor';
  
  // Registro 1: data = "2025-01-01T12:34:00.000Z" (resulta em data "2025-01-01", hora "12", minuto "34")
  const record1 = {
    setor: setorTeste,
    Data: "2025-01-01T12:34:00.000Z",
    DB: 50,
    lat: -23.5505,
    lng: -46.6333
  };

  // Registro 2: data = "2025-01-02T14:45:00.000Z" (resulta em data "2025-01-02", hora "14", minuto "45")
  const record2 = {
    setor: setorTeste,
    Data: "2025-01-02T14:45:00.000Z",
    DB: 60,
    lat: -23.5510,
    lng: -46.6335
  };

  // Antes de rodar os testes, insere os registros usando o endpoint POST
  before(async () => {
    await request(app)
      .post('/api/ruido')
      .send(record1)
      .expect(200);

    await request(app)
      .post('/api/ruido')
      .send(record2)
      .expect(200);
  });

  // 1. GET /api/ruido/setores - Lista todos os setores
  describe('GET /api/ruido/setores', () => {
    it('deve retornar uma lista de setores que inclua o setor de teste', async () => {
      const res = await request(app)
        .get('/api/ruido/setores')
        .expect(200);
      expect(res.body).to.be.an('array');
      const setores = res.body.map(s => s.setor);
      expect(setores).to.include(setorTeste);
    });
  });

  // 2. GET /api/ruido/:setor - Retorna informações detalhadas do setor
  describe('GET /api/ruido/:setor', () => {
    it('deve retornar as informações detalhadas do setor', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}`)
        .expect(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('criadoEm');
    });
  });

  // 3. GET /api/ruido/:setor/datas - Lista todas as datas com medições para um setor
  describe('GET /api/ruido/:setor/datas', () => {
    it('deve listar as datas com medições para o setor', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/datas`)
        .expect(200);
      expect(res.body).to.be.an('array');
      // As datas inseridas são "2025-01-01" e "2025-01-02"
      const datas = res.body.map(doc => doc.data || doc.id);
      expect(datas).to.include("2025-01-01");
      expect(datas).to.include("2025-01-02");
    });
  });

  // 4. GET /api/ruido/:setor/datas/:data - Retorna os registros para uma data específica
  describe('GET /api/ruido/:setor/datas/:data', () => {
    it('deve retornar os registros para a data "2025-01-01"', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/datas/2025-01-01`)
        .expect(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('coordenadas');
      expect(res.body).to.have.property('horas');
    });
  });

  // 5. GET /api/ruido/:setor/datas/:data/horas - Lista todas as horas com medições para uma data
  describe('GET /api/ruido/:setor/datas/:data/horas', () => {
    it('deve listar as horas para a data "2025-01-01"', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/datas/2025-01-01/horas`)
        .expect(200);
      // No exemplo, espera-se que o endpoint retorne um objeto com a propriedade "horas" (array de chaves)
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('horas');
      expect(res.body.horas).to.be.an('array');
      // Verifica se a hora "12" está presente (de acordo com record1)
      expect(res.body.horas).to.include("12");
    });
  });

  // 6. GET /api/ruido/:setor/datas/:data/horas/:hora - Retorna os registros por minuto para uma hora específica
  describe('GET /api/ruido/:setor/datas/:data/horas/:hora', () => {
    it('deve retornar os registros por minuto para a hora "12" da data "2025-01-01"', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/datas/2025-01-01/horas/12`)
        .expect(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('mediacoes');
      // Verifica se existe o registro para o minuto "34"
      expect(res.body.mediacoes).to.have.property('34');
    });
  });

  // 7. GET /api/ruido/:setor/datas/:data/horas/:hora/minutos/:minuto - Retorna a medição de um minuto específico
  describe('GET /api/ruido/:setor/datas/:data/horas/:hora/minutos/:minuto', () => {
    it('deve retornar a medição de DB para o minuto "34" na hora "12" da data "2025-01-01"', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/datas/2025-01-01/horas/12/minutos/34`)
        .expect(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('DB', 50);
    });
  });

  // 8. GET /api/ruido/:setor/latest - Retorna a medição mais recente para um setor
  describe('GET /api/ruido/:setor/latest', () => {
    it('deve retornar a medição mais recente (do record2) para o setor', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/latest`)
        .expect(200);
      expect(res.body).to.be.an('object');
      // O registro mais recente foi inserido com data "2025-01-02"
      expect(res.body).to.have.property('data', '2025-01-02');
      expect(res.body).to.have.property('DB', 60);
    });
  });

  // 9. GET /api/ruido/:setor/estatisticas - Retorna estatísticas agregadas para um setor
  describe('GET /api/ruido/:setor/estatisticas', () => {
    it('deve retornar estatísticas agregadas (count, minDB, maxDB, averageDB)', async () => {
      const res = await request(app)
        .get(`/api/ruido/${setorTeste}/estatisticas`)
        .expect(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('count');
      expect(res.body).to.have.property('minDB');
      expect(res.body).to.have.property('maxDB');
      expect(res.body).to.have.property('averageDB');
      // Para os dois registros, espera-se count >= 2, minDB = 50 e maxDB = 60
      expect(res.body.count).to.be.at.least(2);
      expect(res.body.minDB).to.equal(50);
      expect(res.body.maxDB).to.equal(60);
    });
  });

  // 10. GET /api/ruido - Endpoint genérico com filtros via query parameters
  describe('GET /api/ruido with query parameters', () => {
    it('deve retornar medições filtradas pelo setor, intervalo de datas e horas', async () => {
      const res = await request(app)
        .get('/api/ruido')
        .query({
          setor: setorTeste,
          dataInicio: '2025-01-01',
          dataFim: '2025-01-02',
          horaInicio: '12',
          horaFim: '15'
        })
        .expect(200);
      expect(res.body).to.be.an('array');
      // Verifica se cada item retornado pertence ao setor de teste
      res.body.forEach(item => {
        expect(item.setor).to.equal(setorTeste);
      });
    });
  });

  // 11. GET /api/ruido/localizacao - Busca medições por localização
  describe('GET /api/ruido/localizacao', () => {
    it('deve retornar medições dentro do raio especificado', async () => {
      // Define uma posição próxima aos registros inseridos e um raio de 1 km
      const res = await request(app)
        .get('/api/ruido/localizacao')
        .query({
          lat: -23.5505,
          lng: -46.6333,
          raio: 1
        })
        .expect(200);
      expect(res.body).to.be.an('array');
      // Verifica se pelo menos um dos registros retornados contém os campos esperados
      expect(res.body.length).to.be.at.least(1);
      res.body.forEach(item => {
        expect(item).to.have.property('setor');
        expect(item).to.have.property('data');
        expect(item).to.have.property('coordenadas');
      });
    });
  });
});
