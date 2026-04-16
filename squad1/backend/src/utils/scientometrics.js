/**
 * Calcula o Score Cientométrico de um artigo com base em diversos fatores.
 * @param {Object} article - O objeto do artigo.
 * @returns {number} - O score calculado.
 */
function calculateScientometricScore(article) {
    let score = 0;

    // 1. Pontuação baseada em citações (Ex: 1 ponto por citação, limitado a 50)
    const citations = parseInt(article.citationsCount || 0, 10);
    score += Math.min(citations, 50);

    // 2. Pontuação baseada no Qualis (Ex: A1=40, A2=35, B1=30, etc.)
    const qualisMap = {
        'A1': 40, 'A2': 35, 'B1': 30, 'B2': 25, 'B3': 20, 'B4': 15, 'B5': 10, 'C': 5
    };
    if (article.qualis && qualisMap[article.qualis]) {
        score += qualisMap[article.qualis];
    }

    // 3. Pontuação baseada no Quartil do Periódico (Ex: Q1=30, Q2=20, Q3=10, Q4=5)
    const quartileMap = {
        'Q1': 30, 'Q2': 20, 'Q3': 10, 'Q4': 5
    };
    if (article.journalQuartile && quartileMap[article.journalQuartile]) {
        score += quartileMap[article.journalQuartile];
    }

    // 4. Bônus por possuir DOI (Ex: 5 pontos)
    if (article.doi && article.doi !== 'N/A') {
        score += 5;
    }

    // 5. Bônus por possuir resumo e palavras-chave (Ex: 5 pontos)
    if (article.abstract && article.abstract !== 'N/A' && article.keywords && article.keywords !== 'N/A') {
        score += 5;
    }

    return score;
}

module.exports = { calculateScientometricScore };
