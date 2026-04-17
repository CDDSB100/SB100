const { pool } = require('../src/services/database');

async function fixFeedbacks() {
  console.log("--- INICIANDO CORREÇÃO DE FEEDBACKS (IA VS HUMANO) ---");
  
  try {
    const [articles] = await pool.execute("SELECT _id, curatorFeedback, aiFeedback FROM articles WHERE status = 'Aprovado por IA'");
    console.log(`🔍 Analisando ${articles.length} registros...`);

    let updatedCount = 0;

    for (const art of articles) {
      const { _id, curatorFeedback, aiFeedback } = art;

      // Se curatorFeedback estiver preenchido, movemos para aiFeedback
      if (curatorFeedback && curatorFeedback !== 'N/A' && curatorFeedback !== '---') {
        let aiFeedbackObj = {};

        // Tenta parsear aiFeedback existente
        if (aiFeedback) {
          try {
            const parsed = JSON.parse(aiFeedback);
            if (typeof parsed === 'object') aiFeedbackObj = parsed;
          } catch (e) {
            // Se não for JSON, o texto existente pode ser o sumário
            aiFeedbackObj = { technical_summary: aiFeedback };
          }
        }

        // Define o sumário técnico como o texto que estava no curatorFeedback (que o usuário diz ser da IA)
        aiFeedbackObj.technical_summary = curatorFeedback;
        
        // Se não houver score, coloca um default para aprovação de IA
        if (!aiFeedbackObj.relevance_score) aiFeedbackObj.relevance_score = 6.0;

        const updatedAiFeedback = JSON.stringify(aiFeedbackObj);
        
        // Limpamos o curatorFeedback e o feedbackOnAi (avaliação sobre a IA, que só o humano faz)
        await pool.execute(
          "UPDATE articles SET aiFeedback = ?, curatorFeedback = NULL, feedbackOnAi = NULL WHERE _id = ?",
          [updatedAiFeedback, _id]
        );
        updatedCount++;
      }
    }

    console.log(`\n--- RESUMO DA CORREÇÃO ---`);
    console.log(`✅ Registros atualizados: ${updatedCount}`);
    console.log(`✨ Total de registros analisados: ${articles.length}`);

  } catch (err) {
    console.error("❌ Erro ao corrigir feedbacks:", err.message);
  } finally {
    process.exit(0);
  }
}

fixFeedbacks();
