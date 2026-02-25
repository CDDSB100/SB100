from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
import asyncio

from fastapi.middleware.cors import CORSMiddleware

from flow import create_qa_flow

# App metadata improves the generated OpenAPI / Swagger UI
app = FastAPI(
    title="Pocket B100 QA API",
    description="Agentic QA service that decides between direct answer, query refinement, or RAG retrieval.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your frontend's origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a single flow instance to reuse across requests
flow = create_qa_flow()


class ChatRequest(BaseModel):
    user_id: Optional[str] = "default_user"
    question: str


class ChatResponse(BaseModel):
    answer: Optional[str]
    decision: Optional[str]
    refined_question: Optional[str]
    retrieved_contexts: Optional[List[Any]]


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, cultura: str):
    """Run the agentic QA flow for a given user and question.

    The flow is async; we construct a shared dict, provide the question and user_id,
    and run the flow. The flow's `InputNode` uses the pre-supplied question so it
    won't prompt for input.
    """
    try:
        shared = {
            "user_id": req.user_id,
            "question": req.question,
            "cultura": cultura,
            "conversation_history": [],
            "decision": None,
            "refined_question": None,
            "decomposed_queries": [],
            "retrieved_contexts": [],
            "answer": None,
        }

        # run the async flow
        await flow.run_async(shared)

        return ChatResponse(
            answer=shared.get("answer"),
            decision=shared.get("decision"),
            refined_question=shared.get("refined_question"),
            retrieved_contexts=shared.get("retrieved_contexts"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
