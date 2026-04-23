const axios = require('axios');
const path = require('path');

// Garante que o dotenv carregue as variáveis de ambiente corretas
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../env/.env.dev') });
require('dotenv').config({ path: path.join(__dirname, '../../env/.env.prod') });

const API_URL = `http://localhost:${process.env.PORT || 5001}/api/trigger-curation`;
const JWT_TOKEN = process.env.VITE_JWT_TOKEN;

async function triggerCuration() {
  if (!JWT_TOKEN) {
    console.error('ERRO: A variável de ambiente VITE_JWT_TOKEN não está definida.');
    console.error('Para executar este script, você precisa de um token de autenticação válido.');
    console.error('1. Faça login na aplicação através da interface web.');
    console.error('2. Abra o console do desenvolvedor (F12) -> Application -> Local Storage.');
    console.error('3. Copie o valor da chave "accessToken".');
    console.error('4. Adicione VITE_JWT_TOKEN="seu-token-copiado-aqui" em seu arquivo .env (ex: env/.env.dev).');
    return;
  }

  console.log(`[+] Disparando processo de curadoria na API: ${API_URL}`);
  try {
    const response = await axios.post(API_URL, {}, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    console.log('[SUCCESS] Processo de curadoria iniciado com sucesso.');
    console.log('=> Resposta do servidor:', response.data);
  } catch (error) {
    console.error('[ERROR] Falha ao disparar o processo de curadoria.');
    if (error.response) {
      console.error(`  - Status: ${error.response.status}`);
      console.error('  - Resposta:', error.response.data);
    } else {
      console.error('  - Mensagem:', error.message);
    }
  }
}

triggerCuration();
