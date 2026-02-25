const { google } = require("googleapis");
const path = require("path");
const fs = require("fs").promises;

// Use as mesmas constantes do seu api_logic.js
const SCRIPT_ID = "1N87k7BiU2rZPig_q6VKVyfWXzPTHOboIL1o3rPScqZFHNf9B";
const TOKEN_FILE = "token.json";

async function runDebug() {
  try {
    console.log("--- Iniciando Diagnóstico ---");

    // 1. Carregar Token
    const content = await fs.readFile(path.join(__dirname, TOKEN_FILE));
    const auth = google.auth.fromJSON(JSON.parse(content));
    const script = google.script({ version: "v1", auth });

    console.log("Token carregado. Tentando chamar a função...");

    // 2. Tentar execução
    const response = await script.scripts.run({
      scriptId: SCRIPT_ID,
      resource: {
        function: "processarTodasPendentes",
        devMode: true, // Tenta rodar a versão mais recente salva
      },
    });

    console.log("Resposta da API:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("\n--- ERRO DETALHADO ENCONTRADO ---");
    if (err.response) {
      console.error("Status do Erro:", err.response.status);
      console.error(
        "Dados do Erro:",
        JSON.stringify(err.response.data, null, 2),
      );

      if (err.response.status === 404) {
        console.error(
          "\nCausa provável: O Google Cloud não encontra o Script ID ou a função não está acessível via API.",
        );
      }
    } else {
      console.error("Mensagem:", err.message);
    }
  }
}

runDebug();
