import redis
import json

# Redis connection
r = redis.Redis(
    host='redis-17484.c73.us-east-1-2.ec2.redns.redis-cloud.com',
    port=17484,
    decode_responses=True,
    username="default",
    password="6aQEnM2mAHqRBmM6rAzgMQIW10g73N80",
)

def load_conversation(user_id: str) -> list:
    """
    Load conversation history for a user from Redis.
    
    Args:
        user_id (str): The user identifier.
    
    Returns:
        list: List of conversation messages, each as {"role": "user/assistant", "content": "..."}
    """
    key = f"conversation:{user_id}"
    history_json = r.get(key)
    if history_json:
        return json.loads(history_json)
    return []

def save_conversation(user_id: str, history: list) -> bool:
    """
    Save conversation history for a user to Redis.
    
    Args:
        user_id (str): The user identifier.
        history (list): List of conversation messages.
    
    Returns:
        bool: True if successful, False otherwise.
    """
    key = f"conversation:{user_id}"
    history_json = json.dumps(history)
    return r.set(key, history_json)

def add_message_to_conversation(user_id: str, message: dict) -> bool:
    """
    Add a message to the conversation history for a user.
    
    Args:
        user_id (str): The user identifier.
        message (dict): The message to add, e.g., {"role": "user", "content": "..."}
    
    Returns:
        bool: True if successful, False otherwise.
    """
    history = load_conversation(user_id)
    history.append(message)
    return save_conversation(user_id, history)