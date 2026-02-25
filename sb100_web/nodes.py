from pocketflow import Node, AsyncNode
from utils.call_llm import call_llm
from utils.vectordb import retrieve_documents
from utils.memory import load_conversation, add_message_to_conversation
import json
import asyncio

class InputNode(Node):
    def prep(self, shared):
        # Load conversation history from Redis and detect if a question was pre-supplied (API mode)
        user_id = shared.get("user_id", "default_user")
        history = load_conversation(user_id)
        existing_question = shared.get("question")
        # Return both history and any pre-supplied question so exec() can choose
        return history, existing_question
    
    def exec(self, prep_res):
        # prep_res is (history, existing_question)
        history, existing_question = prep_res
        # If an external caller (API) pre-supplied a question, use it. Otherwise fallback to interactive input.
        if existing_question:
            return existing_question
        # Interactive fallback for CLI usage
        user_question = input("Enter your question: ")
        return user_question
    
    def post(self, shared, prep_res, exec_res):
        # Store the user's question and history
        shared["question"] = exec_res
        # prep_res is (history, existing_question) from prep(); store only the history list
        if isinstance(prep_res, tuple) and len(prep_res) >= 1:
            shared["conversation_history"] = prep_res[0]
        else:
            shared["conversation_history"] = prep_res
        return "default"  # Go to the next node

class DecisionNode(Node):
    def prep(self, shared):
        # Read question and history from shared
        return shared["question"], shared["conversation_history"]
    
    def exec(self, data):
        question, history = data
        # Normalize history entries to dicts if necessary
        def _normalize_history(hist):
            if not hist:
                return []
            normalized = []
            for item in hist:
                if isinstance(item, dict):
                    normalized.append(item)
                elif isinstance(item, str):
                    try:
                        parsed = json.loads(item)
                        if isinstance(parsed, dict):
                            normalized.append(parsed)
                        else:
                            normalized.append({"role": "user", "content": item})
                    except Exception:
                        normalized.append({"role": "user", "content": item})
                else:
                    normalized.append({"role": "user", "content": str(item)})
            return normalized

        history = _normalize_history(history)
        # Create prompt for decision
        history_str = "\n".join([f"{msg.get('role','user')}: {msg.get('content','')}" for msg in history[-5:]])  # last 5 messages
        prompt = f"""
        Based on the conversation history and the current question, decide the best action.

        Actions:
        - direct_answer: Answer directly without RAG if the question is simple or can be answered from history
        - refine: The question needs clarification or refinement before proceeding
        - rag: Proceed with RAG (query decomposition and retrieval) for complex questions requiring external knowledge

        Conversation History:
        {history_str}

        Current Question: {question}

        Respond with only the action: direct_answer, refine, or rag
        """
        response = call_llm(prompt).strip().lower()
        if response not in ["direct_answer", "refine", "rag"]:
            response = "rag"  # default
        return response
    
    def post(self, shared, prep_res, exec_res):
        # Store decision in shared
        shared["decision"] = exec_res
        # Initialize refinement count if not present
        shared["refinement_count"] = 0
        return exec_res  # return the action

class QueryRefinementNode(Node):
    def prep(self, shared):
        # Read question and history
        return shared["question"], shared["conversation_history"]
    
    def exec(self, data):
        question, history = data
        # Normalize history and create prompt for refinement
        try:
            history = [h if isinstance(h, dict) else json.loads(h) if isinstance(h, str) and h.strip().startswith('{') else {"role":"user","content":h} for h in history]
        except Exception:
            # fallback normalization
            history = [{"role":"user","content":str(h)} for h in history]
        history_str = "\n".join([f"{msg.get('role','user')}: {msg.get('content','')}" for msg in history[-5:]])
        prompt = f"""
        The current question needs refinement. Based on the conversation history, generate a clearer, more specific question.

        Conversation History:
        {history_str}

        Original Question: {question}

        Provide a refined question that is more precise and answerable.
        """
        refined = call_llm(prompt).strip()
        return refined
    
    def post(self, shared, prep_res, exec_res):
        # Store refined question
        shared["refined_question"] = exec_res
        shared["question"] = exec_res  # update the question
        # Increment refinement count
        shared["refinement_count"] += 1
        # Limit to 3 loops, then force RAG
        if shared["refinement_count"] >= 3:
            return "rag"
        return "decide"  # loop back to decision

class DirectAnswerNode(Node):
    def prep(self, shared):
        # Read question and history
        return shared["question"], shared["conversation_history"]
    
    def exec(self, data):
        question, history = data
        # Normalize history and include in prompt
        try:
            history = [h if isinstance(h, dict) else json.loads(h) if isinstance(h, str) and h.strip().startswith('{') else {"role":"user","content":h} for h in history]
        except Exception:
            history = [{"role":"user","content":str(h)} for h in history]
        history_str = "\n".join([f"{msg.get('role','user')}: {msg.get('content','')}" for msg in history[-10:]])
        # Create prompt for direct answering
        prompt = f"""
        #### Personalidade do Assistente:
        Você é um assistente agronômico especializado em fornecer recomendações agronômicas detalhadas com base no conhecimento que for provido.
        Seu objetivo é ajudar os usuários com informações precisas e práticas para melhorar suas práticas agrícolas.
        Sempre que possível, utilize o conhecimento disponível para fundamentar suas respostas.
        Se o conhecimento não for suficiente, admita que não sabe a resposta.

        Seu conhecimento vem de documentos técnicos, artigos científicos e manuais agrícolas. Fornecidos pela curadoria do Instituto Agronômico de Campinas (IAC).

        #### REGRAS IMPORTANTES:
        - Responda SEMPRE em português.
        - Utilize tabelas para explicar e fundamentar suas respostas quando necessário.
        - Adicione fonte para todas as respostas baseadas no conhecimento.
        - Evite termos técnicos complexos, a menos que solicitado.
        - Seja claro e conciso, mas detalhado quando necessário.
        - Mantenha um tom amigável e profissional.

        #### Caso seja solicitado alguma recomendação agronômica, além da tabela você deve fornecer um passo a passo detalhado de como implementar a recomendação.
        E o valor especifico para o caso informado pelo usuário.

        Conversation History:
        {history_str}

        Pergunta: {question}

        Resposta:
        """
        return call_llm(prompt)
    
    def post(self, shared, prep_res, exec_res):
        # Store the answer in shared
        shared["answer"] = exec_res
        # Save conversation to Redis
        user_id = shared.get("user_id", "default_user")
        question = shared["question"]
        # Add user message
        add_message_to_conversation(user_id, {"role": "user", "content": question})
        # Add assistant message
        add_message_to_conversation(user_id, {"role": "assistant", "content": exec_res})

class QueryDecompositionNode(Node):
    def prep(self, shared):
        # Read question and history from shared
        return shared["question"], shared["conversation_history"]
    
    def exec(self, data):
        question, history = data
        # Create prompt for decomposition including history
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-10:]])  # last 10 messages
        prompt = f"""
        Given the conversation history and the following question, decompose it into multiple simpler queries if needed.
        If the question is simple, return it as a single query.
        Return the queries as a JSON list.

        Conversation History:
        {history_str}

        Question: {question}

        Response format: ["query1", "query2", ...]
        """
        response = call_llm(prompt)
        # Parse the response (assuming LLM returns valid JSON)
        import json
        try:
            queries = json.loads(response)
            if isinstance(queries, list):
                return queries
            else:
                return [question]
        except:
            return [question]
    
    def post(self, shared, prep_res, exec_res):
        # Store decomposed queries in shared
        shared["decomposed_queries"] = exec_res
        print(f"Decomposition post: stored queries {exec_res}")
        return "default"

class RetrieveDocumentsNode(Node):
    def prep(self, shared):
        # Read decomposed queries from shared
        queries = shared["decomposed_queries"]
        print(f"RetrieveDocumentsNode prep: queries {queries}")
        # Return both queries and shared so exec() has access to filters like 'cultura'
        return queries, shared
    
    def exec(self, data):
        # data is (queries, shared)
        queries, shared = data
        print(f"RetrieveDocumentsNode exec called with queries: {queries}")
        # Retrieve documents for each query, using cultura filter from shared if present
        results = []
        for query in queries:
            res = retrieve_documents(query, 4, filtro={"cultura": shared.get("cultura", None)})
            results.append(res)
        print(f"Results: {results}")
        return results
    
    def post(self, shared, prep_res, exec_res):
        # Store retrieved contexts in shared
        print(f"Storing retrieved contexts: {exec_res}")
        shared["retrieved_contexts"] = exec_res
        return "default"

class AnswerQuestionNode(Node):
    def prep(self, shared):
        # Read question, history, and retrieved contexts from shared
        question, history, contexts = shared["question"], shared["conversation_history"], shared["retrieved_contexts"]
        print(f"AnswerQuestionNode prep: question {question}, contexts {contexts}")
        return question, history, contexts
    
    def exec(self, data):
        question, history, contexts = data
        # Combine contexts
        combined_context = "\n\n".join(["\n".join([doc['content'] for doc in ctx]) for ctx in contexts])
        # Include history in prompt
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-10:]])
        # Create prompt for answering
        prompt = f"""
        #### Personalidade do Assistente:
        Você é um assistente agronômico especializado em fornecer recomendações agronômicas detalhadas com base no conhecimento que for provido.
        Seu objetivo é ajudar os usuários com informações precisas e práticas para melhorar suas práticas agrícolas.
        Sempre que possível, utilize o conhecimento disponível para fundamentar suas respostas.
        Se o conhecimento não for suficiente, admita que não sabe a resposta.

        Seu conhecimento vem de documentos técnicos, artigos científicos e manuais agrícolas. Fornecidos pela curadoria do Instituto Agronômico de Campinas (IAC).

        #### REGRAS IMPORTANTES:
        - Responda SEMPRE em português.
        - Utilize tabelas para explicar e fundamentar suas respostas quando necessário.
        - Adicione fonte para todas as respostas baseadas no conhecimento.
        - Evite termos técnicos complexos, a menos que solicitado.
        - Seja claro e conciso, mas detalhado quando necessário.
        - Mantenha um tom amigável e profissional.

        #### Caso seja solicitado alguma recomendação agronômica, além da tabela você deve fornecer um passo a passo detalhado de como implementar a recomendação.
        E o valor especifico para o caso informado pelo usuário.

        Conversation History:
        {history_str}

        Contexto:
        {combined_context}

        Pergunta: {question}

        Resposta:
        """
        return call_llm(prompt)
    
    def post(self, shared, prep_res, exec_res):
        # Store the answer in shared
        shared["answer"] = exec_res
        # Save conversation to Redis
        user_id = shared.get("user_id", "default_user")
        question = shared["question"]
        # Add user message
        add_message_to_conversation(user_id, {"role": "user", "content": question})
        # Add assistant message
        add_message_to_conversation(user_id, {"role": "assistant", "content": exec_res})