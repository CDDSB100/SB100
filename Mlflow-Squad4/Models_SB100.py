# %%
import mlflow
import pandas as pd
import requests
import json
import textstat
import numpy as np
from sentence_transformers import SentenceTransformer, util
import textstat
from sklearn.metrics import precision_score, recall_score, accuracy_score


# %%
import os
os.environ["MLFLOW_ENABLE_SYSTEM_METRICS_LOGGING"] = "true"

# %%
mlflow.set_tracking_uri(uri="http://localhost:5000")

# %%
def ollama_predict(df, PROMPT_TEMPLATE):
    outputs = []
    url = "http://localhost:11434/api/generate"

    for _, row in df.iterrows():
        payload = {
            "model": "gemma3:4b",
            "prompt": PROMPT_TEMPLATE.format(pergunta=row["inputs"])
        }

        r = requests.post(url, json=payload)
        r.raise_for_status()

        completion = ""
        for line in r.text.strip().split("\n"):
            completion += json.loads(line).get("response", "")

        outputs.append(completion)

    return outputs

# %%
eval_data = pd.DataFrame(
       {
    "inputs": [
        "Qual é a participação da citricultura no volume das oito principais frutíferas brasileiras?",
        "A que gênero pertencem as principais espécies cítricas cultivadas comercialmente?",
        "Qual a faixa de exportação de nitrogênio por tonelada de fruto colhido?",
        "Qual é a faixa adequada de fósforo foliar em citros?",
        "Qual profundidade deve ser amostrada para recomendações de adubação e calagem?",
        "Descreva o procedimento correto de amostragem foliar para citros.",
        "Por que é necessário aguardar 30 dias após pulverizações antes da coleta foliar?",
        "Quais camadas do solo devem ser amostradas para diagnóstico de fertilidade em pomares?",
        "Qual a meta de saturação por bases recomendada na calagem para citros?",
        "Qual teor mínimo de magnésio deve ser mantido na camada de 0–20 cm?",
        "Para laranjas destinadas à indústria com produtividade de 51–60 t ha⁻¹ e N foliar entre 25–30 g kg⁻¹, qual a dose recomendada de N?",
        "Para laranjas destinadas ao consumo in natura com produtividade de 41–50 t ha⁻¹ e K trocável entre 1,6–3,0 mmolc dm⁻³, qual a dose recomendada de K₂O?",
        "Para lima ácida Tahiti com produtividade acima de 60 t ha⁻¹ e N foliar entre 20–24 g kg⁻¹, qual a dose recomendada de N?",
        "O que deve ser feito quando o teor de fósforo no solo for superior a 80 mg dm⁻³?",
        "Por que a análise foliar é considerada essencial para diagnóstico de nitrogênio em citros?"
    ],
    "ground_truth": [
        "A citricultura representa cerca de 55% do volume das oito principais frutíferas brasileiras.",
        "Pertencem ao gênero Citrus spp.",
        "De 1,9 a 2,4 kg por tonelada de fruto colhido.",
        "De 1,2 a 1,6 g kg⁻¹.",
        "De 0–20 cm.",
        "Deve-se coletar a 3ª ou 4ª folha do ramo com fruto terminal, gerada na primavera, com aproximadamente seis meses de idade, normalmente entre fevereiro e março, em ramos com frutos de 2 a 4 cm de diâmetro, amostrando pelo menos 20 árvores por talhão e coletando quatro folhas por árvore, uma em cada quadrante da copa.",
        "Porque pulverizações podem deixar nutrientes aderidos à superfície das folhas e causar erro na interpretação da análise.",
        "0–20 cm para recomendações de adubação e calagem e 20–40 cm para diagnóstico de barreiras químicas e movimentação de nutrientes.",
        "Elevar a saturação por bases a 70%.",
        "Pelo menos 8 mmolc dm⁻³.",
        "200 kg ha⁻¹ de N.",
        "180 kg ha⁻¹ de K₂O.",
        "180 kg ha⁻¹ de N.",
        "Não aplicar fósforo para evitar desequilíbrios nutricionais.",
        "Porque a análise de solo para nitrogênio não é consistente, sendo o teor foliar o critério direto de avaliação da disponibilidade do nutriente."
    ]
}

)

# %%
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def simple_token_metrics(pred, gt):
    pred_tokens = set(pred.lower().split())
    gt_tokens = set(gt.lower().split())

    tp = len(pred_tokens & gt_tokens)

    precision = tp / len(pred_tokens) if pred_tokens else 0
    recall = tp / len(gt_tokens) if gt_tokens else 0
    accuracy = 1 if pred.strip().lower() == gt.strip().lower() else 0

    return precision, recall, accuracy


# %%
PROMPT_VERSION = "v2"

PROMPTS = {
    "v1": "{pergunta}",
    "v2": "Responda de forma técnica e objetiva:\n\n{pergunta}",
    "v3": "Você é um engenheiro agrônomo especialista. Responda com precisão técnica:\n\n{pergunta}"
}

PROMPT_TEMPLATE = PROMPTS[PROMPT_VERSION]

# %%
with mlflow.start_run(run_name="gemma3:4b_DataReduzido-Citrus"):

    mlflow.log_param("model_name", "gemma3:4b")
    mlflow.log_param("prompt_version", PROMPT_VERSION)

    predictions = ollama_predict(eval_data, PROMPT_TEMPLATE)

    similarities = []
    ari_scores = []
    precisions = []
    recalls = []
    accuracies = []

    for pred, gt in zip(predictions, eval_data["ground_truth"]):

        emb_p = embed_model.encode(pred, convert_to_tensor=True)
        emb_g = embed_model.encode(gt, convert_to_tensor=True)
        similarities.append(util.cos_sim(emb_p, emb_g).item())

        ari_scores.append(textstat.automated_readability_index(pred))

        p, r, a = simple_token_metrics(pred, gt)
        precisions.append(p)
        recalls.append(r)
        accuracies.append(a)

    mlflow.log_metric("answer_similarity", float(np.mean(similarities)))
    mlflow.log_metric("ari_grade", float(np.mean(ari_scores)))
    mlflow.log_metric("precision", float(np.mean(precisions)))
    mlflow.log_metric("recall", float(np.mean(recalls)))
    mlflow.log_metric("accuracy", float(np.mean(accuracies)))

    eval_table = pd.DataFrame({
        "inputs": eval_data["inputs"],
        "ground_truth": eval_data["ground_truth"],
        "prediction": predictions,
        "answer_similarity": similarities,
        "ari_grade": ari_scores,
        "precision": precisions,
        "recall": recalls,
        "accuracy": accuracies
    })

    mlflow.log_table(eval_table, "eval/evaluation_table.json")

    for i, out in enumerate(predictions):
        mlflow.log_text(out, f"outputs/output_{i}.txt")



