from flow import create_qa_flow
import asyncio
import logging

# Suppress warnings
logging.getLogger('absl').setLevel(logging.ERROR)
logging.getLogger('google').setLevel(logging.ERROR)

# Example main function
# Please replace this with your own main function
async def main():
    shared = {
        "user_id": "default_user",
        "question": None,
        "conversation_history": [],
        "decision": None,
        "refined_question": None,
        "refinement_count": 0,
        "decomposed_queries": [],
        "retrieved_contexts": [],
        "answer": None
    }

    qa_flow = create_qa_flow()
    await qa_flow.run_async(shared)
    print("Question:", shared["question"])
    print("Refinement Count:", shared["refinement_count"])
    print("Decomposed Queries:", shared["decomposed_queries"])
    print("Retrieved Contexts:", shared["retrieved_contexts"])
    print("Answer:", shared["answer"])

if __name__ == "__main__":
    asyncio.run(main())
