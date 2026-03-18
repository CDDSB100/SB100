from pocketflow import AsyncFlow
from nodes import InputNode, DecisionNode, QueryRefinementNode, DirectAnswerNode, QueryDecompositionNode, RetrieveDocumentsNode, AnswerQuestionNode

def create_qa_flow():
    """Create and return a question-answering flow with agentic decision making."""
    # Create nodes
    input_node = InputNode()
    decision_node = DecisionNode()
    refinement_node = QueryRefinementNode()
    direct_answer_node = DirectAnswerNode()
    decomposition_node = QueryDecompositionNode()
    retrieve_node = RetrieveDocumentsNode()
    answer_node = AnswerQuestionNode()
    
    # Connect nodes with branching
    input_node >> decision_node
    decision_node - "direct_answer" >> direct_answer_node
    decision_node - "refine" >> refinement_node
    refinement_node - "decide" >> decision_node
    decision_node - "rag" >> decomposition_node >> retrieve_node >> answer_node
    
    # Create flow starting with input node
    return AsyncFlow(start=input_node)

qa_flow = create_qa_flow()
