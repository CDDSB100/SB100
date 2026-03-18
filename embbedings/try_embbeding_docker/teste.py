import requests

# 1. Certifique-se de que a API está rodando em http://127.0.0.1:8000
API_URL = "http://127.0.0.1:8000"

def test_api_status():
    try:
        response = requests.get(API_URL)
        print(f"GET / Status: {response.status_code}")
        print(f"GET / Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("Erro: A API não está rodando. Por favor, inicie o Uvicorn primeiro.")

def test_search_endpoint():
    payload = {
        "query": "Por que e preferível aplicar nitrato de amônio ao invés de ureia?",
        "n_results": 10
    }
    
    response = requests.post(f"{API_URL}/search", json=payload)
    
    if response.status_code == 200:
        print(f"POST /search Status: {response.status_code}")
        print("--- Resultados ---")
        for result in response.json()["results"]:
            print(f"- Texto: {result['text']}... | Score: {result['score']:.4f}")
    else:
        print(f"POST /search Falhou. Status: {response.status_code}")
        print(f"POST /search Detalhe: {response.json()}")

if __name__ == "__main__":
    test_api_status()
    # Se a API estiver rodando e você tiver dados no ChromaDB:
    test_search_endpoint()