const axios = require('axios');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

// --- CONFIGURATION ---
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

const ALL_METADATA_FIELDS = [
    "title",
    "subtitle",
    "authors",
    "year",
    "citationsCount",
    "keywords",
    "abstract",
    "documentType",
    "publisher",
    "institution",
    "location",
    "workType",
    "journalTitle",
    "journalQuartile",
    "volume",
    "issue",
    "pages",
    "doi",
    "numbering",
    "qualis",
    "category",
    "soilAndRegionCharacteristics",
    "toolsAndTechniques",
    "nutrients",
    "nutrientSupplyStrategies",
    "cropGroups",
    "cropsPresent",
    "aiFeedback",
    "curatorFeedback",
    "feedbackOnAi",
    "documentUrl",
    "insertedBy",
    "approvedBy",
    "status",
    "scientometricScore",
    "workId",
    "CONTRADICAO_DETECTADA",
    "MOTIVO_CONTRADICAO",
    "EVIDENCIAS_CONTRADICAO"
];

/**
 * Realiza OCR nas primeiras páginas de um PDF.
 */
async function performOCR(pdfBuffer, maxPages = 3) {
    console.log(`Iniciando OCR para as primeiras ${maxPages} páginas...`);
    let fullText = "";
    try {
        const pdfToImgModule = await import('pdf-to-img');
        const images = await pdfToImgModule.pdf(pdfBuffer);
        let pageCount = 0;
        
        for await (const image of images) {
            if (pageCount >= maxPages) break;
            console.log(`Processando página ${pageCount + 1} com OCR...`);
            
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
                title: (item.title && item.title.length > 0) ? item.title[0] : "",
                subtitle: (item["subtitle"] && item["subtitle"].length > 0) ? item["subtitle"][0] : "",
                authors: authors,
                year: (item.created && item.created["date-parts"] && item.created["date-parts"].length > 0) ? String(item.created["date-parts"][0][0]) : "",
                citationsCount: "0",
                keywords: (item.subject && item.subject.length > 0) ? item.subject.map(s => s.trim()).join(', ') : "",
                abstract: (item.abstract) ? item.abstract.replace(/<jats:p>|<\/jats:p>/g, '') : "",
                documentType: item.type ?? "",
                publisher: item.publisher ?? "",
                journalTitle: (item["container-title"] && item["container-title"].length > 0) ? item["container-title"][0] : "",
                volume: item.volume ?? "",
                issue: item.issue ?? "",
                pages: item.page ?? "",
                doi: item.DOI ?? "",
            };
        }
        return { error: "Nenhum metadado encontrado no Crossref." };
    } catch (e) {
        console.error(`Erro na busca do Crossref: ${e.message}`);
        return { error: "Falha ao recuperar metadados do Crossref." };
    }
}

/**
 * Busca metadados no OpenAlex como fallback.
 */
async function getOpenAlexMetadata(query) {
    try {
        console.log(`Buscando no OpenAlex por: ${query}`);
        const url = "https://api.openalex.org/works";
        const params = {
            search: query,
            per_page: 1,
        };
        const response = await axios.get(url, { params });

        if (response.data.results && response.data.results.length > 0) {
            const item = response.data.results[0];
            const authors = (item.authorships || [])
                .map(a => a.author.display_name)
                .join(", ");

            return {
                title: item.title || "",
                authors: authors,
                year: String(item.publication_year || ""),
                citationsCount: String(item.cited_by_count || "0"),
                doi: item.doi || "",
                documentType: item.type || "",
                journalTitle: item.primary_location?.source?.display_name || "",
            };
        }
        return null;
    } catch (e) {
        console.error(`Erro na busca do OpenAlex: ${e.message}`);
        return null;
    }
}

/**
 * Chama o serviço de categorização do LLM.
 */
async function callCategorizationApi(pdfBuffer, documentText = "") {
    const base64_content = pdfBuffer ? pdfBuffer.toString("base64") : Buffer.from(documentText).toString("base64");
    const content_type = pdfBuffer ? "pdf" : "text";

    const payload = {
        encoded_content: base64_content,
        content_type: content_type,
        headers: [],
    };
    try {
        const res = await axios.post(`${API_BASE_URL}/categorize`, payload, {
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
 */
async function callLLMService(documentText) {
    if (!documentText || documentText.trim().length < 10) {
        return { error: "Texto do documento insuficiente para análise LLM." };
    }

    try {
        const llmPayload = {
            encoded_content: Buffer.from(documentText).toString('base64'),
            content_type: 'text',
            headers: ALL_METADATA_FIELDS.filter(f => !["category", "status", "insertedBy", "approvedBy"].includes(f)),
        };

        const llmResponse = await axios.post(`${API_BASE_URL}/curadoria`, llmPayload);
        return llmResponse.data;
    } catch (e) {
        console.error(`Erro ao chamar o serviço LLM:`, e.message);
        return { error: `Falha ao extrair metadados via LLM: ${e.message}` };
    }
}

/**
 * Função principal para orquestrar a extração de metadados.
 */
async function runExtractionAgent(query, documentText = null, file = null) {
    try {
        let combinedData = ALL_METADATA_FIELDS.reduce((acc, field) => ({ ...acc, [field]: "" }), {});
        let crossrefData = {};
        let openAlexData = {};
        let llmResult = {};
        let category = "N/A";

        // 1. Buscar em fontes externas (Crossref)
        if (query) {
            crossrefData = await getCrossrefMetadata(query);
            if (crossrefData && !crossrefData.error) {
                Object.assign(combinedData, crossrefData);
            }
            
            // 2. Fallback para OpenAlex se Crossref falhar ou retornar pouco dado
            if (!combinedData.doi || !combinedData.authors) {
                openAlexData = await getOpenAlexMetadata(query);
                if (openAlexData) {
                    Object.keys(openAlexData).forEach(key => {
                        if (!combinedData[key] || combinedData[key] === "N/A") {
                            combinedData[key] = openAlexData[key];
                        }
                    });
                }
            }
        }

        // 3. Categorização via LLM
        if (file && file.buffer) {
            category = await callCategorizationApi(file.buffer, documentText);
            combinedData.category = category;
        } else if (documentText) {
            category = await callCategorizationApi(null, documentText);
            combinedData.category = category;
        }

        // 4. Extração profunda via LLM usando o texto extraído
        if (documentText && documentText.trim().length > 50) {
            llmResult = await callLLMService(documentText);
            if (llmResult && !llmResult.error) {
                Object.keys(llmResult).forEach(key => {
                    // Priorizar dados do LLM para campos técnicos complexos
                    if (ALL_METADATA_FIELDS.includes(key)) {
                        const val = llmResult[key];
                        if (val && val !== "N/A" && val !== "---") {
                             combinedData[key] = val;
                        }
                    }
                });
                
                if (llmResult.aiFeedback) combinedData.aiFeedback = llmResult.aiFeedback;
            }
        }

        combinedData.curatorFeedback = "";
        combinedData.feedbackOnAi = {
            is_accurate: true,
            is_useful: true,
            human_correction_notes: "Extraído automaticamente via Agente de Metadados.",
            ai_performance_rating: 4,
            adjustment_required: false
        };
        combinedData.status = 'Pendente';

        return combinedData;
    } catch (e) {
        console.error(`Erro na execução do agente: ${e.message}`);
        throw new Error(`Ocorreu um erro durante a extração de metadados: ${e.message}`);
    }
}

async function extractMetadata(req, res) {
    const title = req.body.title;
    const file = req.file;
    let documentFullText = null;

    if (!title && !file) {
        return res.status(400).json({ error: "Forneça um 'title' ou faça upload de um 'file'." });
    }

    let queryTitle = title;

    if (file) {
        try {
            const data = await pdf(file.buffer);
            documentFullText = data.text;
            
            // Fallback para OCR se o texto extraído for muito curto (PDF de imagem)
            if (!documentFullText || documentFullText.trim().length < 200) {
                console.log("Texto insuficiente no PDF. Iniciando OCR...");
                documentFullText = await performOCR(file.buffer);
            }
            
            queryTitle = title || data.info.Title || (documentFullText || '').split('\n')[0].trim();
        } catch (e) {
            console.error("Erro ao processar PDF:", e.message)
            return res.status(500).json({ error: `Falha ao processar o arquivo PDF: ${e.message}` });
        }
    }

    try {
        const result = await runExtractionAgent(queryTitle, documentFullText, file);
        if (result.error) return res.status(404).json(result);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = {
    ALL_METADATA_FIELDS,
    extractMetadata,
    performOCR,
};
