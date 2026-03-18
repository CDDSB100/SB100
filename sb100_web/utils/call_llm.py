import litellm
from dotenv import load_dotenv
import logging
import os

load_dotenv()

# Suppress warnings
logging.getLogger('absl').setLevel(logging.ERROR)
logging.getLogger('google').setLevel(logging.ERROR)

# Configure LiteLLM
# litellm.api_key = os.getenv("GOOGLE_API_KEY")
litellm.api_key = os.getenv("GROQ_API_KEY")

def call_llm(prompt):
    response = litellm.completion(
        # model="gemini/gemini-2.0-flash-lite-001",
        model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": prompt}],
        # api_key=os.getenv("GOOGLE_API_KEY"),
        api_key=os.getenv("GROQ_API_KEY"),
    )
    return response.choices[0].message.content
    
if __name__ == "__main__":
    prompt = "What is the meaning of life?"
    print(call_llm(prompt))
