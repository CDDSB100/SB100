const axios = require('axios');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

const ALL_METADATA_FIELDS = [
    "Autor(es)",
    "Titulo",
    "Subtítulo",
    "Ano",
    "Número de citações recebidas (Google Scholar)",
    "Palavras-chave",
    "Resumo",
    "Tipo de documento",
    "Editora",
    "Instituição",
    "Local",
    "Tipo de trabalho",
    "Título do periódico",
    "Quartil do periódico",
    "Volume",
    "Número/fascículo",
    "Páginas",
    "DOI",
    "Numeração",
    "Qualis",
    "CATEGORIA",
    "Caracteristicas do solo e região (escrever)",
    "ferramentas e técnicas (seleção)",
    "nutrientes (seleção)",
    "estratégias de fornecimento de nutrientes (seleção)",
    "grupos de culturas (seleção)",
    "culturas presentes (seleção)",
    "FEEDBACK DO CURADOR (escrever)",
];

/**
 * Realiza OCR nas primeiras páginas de um PDF.
 * @param {Buffer} pdfBuffer - O buffer do arquivo PDF.
 * @param {number} maxPages - O número máximo de páginas para processar (padrão: 3).
 * @returns {Promise<string>} - O texto extraído via OCR.
 */
async function performOCR(pdfBuffer, maxPages = 3) {
    console.log(`Iniciando OCR para as primeiras ${maxPages} páginas...`);
    let fullText = "";
    try {
        // Carrega o módulo ESM dinamicamente para evitar erro no CommonJS
        const { pdfToImg } = await import('pdf-to-img');
        const images = await pdfToImg(pdfBuffer);
        let pageCount = 0;
        
        for await (const image of images) {
            if (pageCount >= maxPages) break;
            console.log(`Processando página ${pageCount + 1} com OCR...`);
            
            // O tesseract.js pode receber o buffer da imagem diretamente
            const { data: { text } } = await Tesseract.recognize(image, 'por+eng', {
                logger: m => console.log(`OCR Progress (página ${pageCount + 1}):`, m.status, (m.progress * 100).toFixed(2) + "%")
            });
            
            fullText += text + "\n";
            pageCount++;
        }
        
        console.log("OCR concluído com sucesso.");
        return fullText;
    } catch (error) {
        console.error("Erro durante o OCR:", error.message);
        return "";
    }
}


/**
 * Busca metadados no Crossref.
 * @param {string} query - O título do artigo para buscar.
 * @returns {object} - Um objeto com os metadados encontrados.
 */
async function getCrossrefMetadata(query) {
    try {
        console.log(`Buscando no Crossref por: ${query}`);
        const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=1`;
        const response = await axios.get(url);

        if (response.data.message && response.data.message.items && response.data.message.items.length > 0) {
            const item = response.data.message.items[0];
            const authors = (item.author || [])
                .map(author => `${author.given || ''} ${author.family || ''}`.trim())
                .join(', ');

            return {
                "Autor(es)": authors,
                "Titulo": (item.title && item.title.length > 0) ? item.title[0] : "",
                "Subtítulo": (item["subtitle"] && item["subtitle"].length > 0) ? item["subtitle"][0] : "",
                "Ano": (item.created && item.created["date-parts"] && item.created["date-parts"].length > 0) ? String(item.created["date-parts"][0][0]) : "",
                "Número de citações recebidas (Google Scholar)": "", // Not available from Crossref
                "Palavras-chave": (item.subject && item.subject.length > 0) ? item.subject.map(s => s.trim()).join(', ') : "",
                "Resumo": (item.abstract) ? item.abstract.replace(/<jats:p>|<\/jats:p>/g, '') : "",
                "Tipo de documento": item.type ?? "",
                "Editora": item.publisher ?? "",
                "Instituição": "", // Not directly available from Crossref
                "Local": "", // Not directly available from Crossref
                "Tipo de trabalho": "", // Not directly available from Crossref
                "Título do periódico": (item["container-title"] && item["container-title"].length > 0) ? item["container-title"][0] : "",
                "Quartil do periódico": "", // Not available from Crossref
                "Volume": item.volume ?? "",
                "Número/fascículo": item.issue ?? "",
                "Páginas": item.page ?? "",
                "DOI": item.DOI ?? "",
                "Numeração": "", // Not available from Crossref
                "Qualis": "", // Not available from Crossref
            };
        }
        return { error: "Nenhum metadado encontrado no Crossref para a consulta fornecida." };
    } catch (e) {
        console.error(`Erro na busca do Crossref: ${e.message}`);
        return { error: "Falha ao recuperar metadados do Crossref." };
    }
}



/**
 * Chama o serviço de categorização do LLM.
 * @param {Buffer} pdfBuffer - O buffer do arquivo PDF.
 * @returns {Promise<string>} - A categoria identificada.
 */
async function callCategorizationApi(pdfBuffer) {
    const payload = {
        encoded_content: pdfBuffer.toString("base64"),
        content_type: "pdf",
        headers: [], // Requerido pelo modelo Pydantic
    };
    try {
        const res = await axios.post('https://curadoria-llm-curadoria.hf.space/categorize', payload, {
            timeout: 60000,
            headers: { "Content-Type": "application/json" },
        });
        return res.data.category;
    } catch (error) {
        console.error("Erro na API de Categorização:", error.message);
        return "N/A";
    }
}


/**
 * Chama o serviço LLM para extrair metadados adicionais.
 * @param {string} documentText - O texto completo do documento (ou o título, se não houver PDF).
 * @returns {object} - Os metadados extraídos pelo LLM.
 */
async function callLLMService(documentText, file = null) {
    if (!documentText && !file) {
        return { error: "Nenhum documento ou texto fornecido para o LLM." };
    }

    let base64_content;
    let content_type;

    if (file && file.buffer) {
        base64_content = file.buffer.toString('base64');
        content_type = 'pdf';
    } else {
        base64_content = Buffer.from(documentText).toString('base64');
        content_type = 'text';
    }

    try {
        const llmPayload = {
            encoded_content: base64_content,
            content_type: content_type,
            headers: ALL_METADATA_FIELDS.filter(f => f !== "CATEGORIA"), // Não envia CATEGORIA para o /curadoria
        };

        console.log(`Chamando o serviço LLM com content_type: ${content_type} em ${'https://curadoria-llm-curadoria.hf.space/curadoria'}...`);
        const llmResponse = await axios.post('https://curadoria-llm-curadoria.hf.space/curadoria', llmPayload);

        // O LLM retorna um objeto JSON com os campos preenchidos
        return llmResponse.data;
    } catch (e) {
        console.error(`Erro ao chamar o serviço LLM:`, e);
        // Detalhar o erro se for uma resposta HTTP do LLM
        if (e.response) {
            console.error("LLM Service Error Response:", e.response.data);
            return { error: `Falha ao extrair metadados via LLM: ${e.response.data.detail || e.message}` };
        } else if (e.request) {
            console.error("LLM Service No Response:", e.request);
             return { error: `Falha ao extrair metadados via LLM: Nenhuma resposta do serviço. Verifique se ele está rodando na porta 8000.` };
        } else {
             return { error: `Falha ao extrair metadados via LLM: ${e.message}` };
        }
    }
}


/**
 * Função principal para orquestrar a extração de metadados.
 * @param {string} query - O título para a busca.
 * @returns {object} - Os metadados combinados.
 */
async function runExtractionAgent(query, documentText = null, file = null) {
    try {
        let combinedData = ALL_METADATA_FIELDS.reduce((acc, field) => ({ ...acc, [field]: "" }), {});
        let crossrefData = {};
        let llmResult = {};
        let category = "N/A";

        if (query) {
            crossrefData = await getCrossrefMetadata(query);
            if (crossrefData && !crossrefData.error) {
                Object.assign(combinedData, crossrefData);
            } else {
                console.warn(`Crossref metadata search failed for query "${query}": ${crossrefData.error}`);
            }
        }

        // Categorização se houver arquivo
        if (file && file.buffer) {
            category = await callCategorizationApi(file.buffer);
            combinedData["CATEGORIA"] = category;
        }

        // If documentText is available, call the LLM service for richer extraction
        if (documentText) {
            llmResult = await callLLMService(documentText, file);
            if (llmResult && !llmResult.error) {
                // Combine LLM results, but Crossref data takes precedence for overlapping fields
                Object.keys(llmResult).forEach(key => {
                    if (ALL_METADATA_FIELDS.includes(key) && !combinedData[key]) {
                        combinedData[key] = llmResult[key];
                    }
                });
                // Specifically for Subtítulo, if LLM found one and Crossref didn't
                if (llmResult["Subtítulo"] && !combinedData["Subtítulo"]) {
                    combinedData["Subtítulo"] = llmResult["Subtítulo"];
                }
                 // Specifically for Palavras-chave, if LLM found one and Crossref didn't
                 if (llmResult["Palavras-chave"] && !combinedData["Palavras-chave"]) {
                    combinedData["Palavras-chave"] = llmResult["Palavras-chave"];
                }
                // Specifically for Resumo, if LLM found one and Crossref didn't
                if (llmResult["Resumo"] && !combinedData["Resumo"]) {
                    combinedData["Resumo"] = llmResult["Resumo"];
                }
                // Specifically for Tipo de documento, if LLM found one and Crossref didn't
                if (llmResult["Tipo de documento"] && !combinedData["Tipo de documento"]) {
                    combinedData["Tipo de documento"] = llmResult["Tipo de documento"];
                }
                 // Specifically for Instituição, if LLM found one and Crossref didn't
                if (llmResult["Instituição"] && !combinedData["Instituição"]) {
                    combinedData["Instituição"] = llmResult["Instituição"];
                }
                // Specifically for Local, if LLM found one and Crossref didn't
                if (llmResult["Local"] && !combinedData["Local"]) {
                    combinedData["Local"] = llmResult["Local"];
                }
                // Specifically for Tipo de trabalho, if LLM found one and Crossref didn't
                if (llmResult["Tipo de trabalho"] && !combinedData["Tipo de trabalho"]) {
                    combinedData["Tipo de trabalho"] = llmResult["Tipo de trabalho"];
                }
                // Specifically for Quartil do periódico, if LLM found one and Crossref didn't
                if (llmResult["Quartil do periódico"] && !combinedData["Quartil do periódico"]) {
                    combinedData["Quartil do periódico"] = llmResult["Quartil do periódico"];
                }
                // Specifically for Numeração, if LLM found one and Crossref didn't
                if (llmResult["Numeração"] && !combinedData["Numeração"]) {
                    combinedData["Numeração"] = llmResult["Numeração"];
                }
                // Specifically for Qualis, if LLM found one and Crossref didn't
                if (llmResult["Qualis"] && !combinedData["Qualis"]) {
                    combinedData["Qualis"] = llmResult["Qualis"];
                }

                // If LLM returned "APROVAÇÃO CURADOR (marcar)" and "FEEDBACK DO CURADOR (escrever)", include them
                if (llmResult["APROVAÇÃO CURADOR (marcar)"] !== undefined) {
                    combinedData["APROVAÇÃO CURADOR (marcar)"] = llmResult["APROVAÇÃO CURADOR (marcar)"];
                }
                if (llmResult["FEEDBACK DO CURADOR (escrever)"] !== undefined) {
                    combinedData["FEEDBACK DO CURADOR (escrever)"] = llmResult["FEEDBACK DO CURADOR (escrever)"];
                }

            } else {
                console.warn(`LLM service call failed: ${llmResult.error}`);
            }
        }

        if (Object.keys(combinedData).every(key => combinedData[key] === "")) {
            return { error: "Não foi possível encontrar nenhum metadado para a consulta fornecida de nenhuma fonte." };
        }

        return combinedData;

    } catch (e) {
        console.error(`Erro na execução do agente: ${e.message}`);
        throw new Error(`Ocorreu um erro durante a extração de metadados: ${e.message}`);
    }
}


/**
 * Handler do Express para o endpoint de extração de metadados.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
async function extractMetadata(req, res) {
    const title = req.body.title;
    const file = req.file;
    let documentFullText = null;

    if (!title && !file) {
        return res.status(400).json({ error: "Forneça um 'title' ou faça upload de um 'file'." });
    }

    let queryTitle = title;

    if (file) {
        if (file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: "Tipo de arquivo inválido. Por favor, envie um PDF." });
        }
        try {
            const data = await pdf(file.buffer);
            documentFullText = data.text; // Store the full text
            
            // Lógica de fallback para OCR:
            // Se o texto extraído for muito curto (ex: < 500 caracteres), pode ser imagem.
            if (!documentFullText || documentFullText.trim().length < 500) {
                console.warn("Texto extraído via pdf-parse é insuficiente (< 500 chars). Tentando OCR...");
                const ocrText = await performOCR(file.buffer);
                if (ocrText && ocrText.trim().length > 0) {
                   documentFullText = (documentFullText || "") + "\n\n--- OCR Extraído ---\n" + ocrText;
                   console.log("OCR adicionado ao texto do documento.");
                } else {
                   console.warn("OCR não retornou texto adicional significativo.");
                }
            }

            // Tenta extrair o título dos metadados do PDF, senão usa a primeira linha
            queryTitle = data.info.Title || (documentFullText || '').split('\n')[0].trim();

            if (!queryTitle && !documentFullText) { // If no title and no text, it's an issue
                return res.status(404).json({ error: "Não foi possível extrair um título ou texto do PDF enviado." });
            }
        } catch (e) {
            console.error("Erro ao processar PDF:", e.message)
            return res.status(500).json({ error: `Falha ao processar o arquivo PDF: ${e.message}` });
        }
    }

    console.log(`Título extraído da consulta: ${queryTitle}`);

    try {
        // Pass documentFullText to runExtractionAgent
        const result = await runExtractionAgent(queryTitle, documentFullText, file);
        if (result.error) {
             return res.status(404).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = {
    ALL_METADATA_FIELDS,
    extractMetadata,
};
