"""
Messaging service - handles message creation, retrieval, and conversation management
"""
from datetime import datetime, timedelta
from bson import ObjectId
from database import messages_collection, conversations_collection, users_collection


async def get_or_create_conversation(user1_email: str, user2_email: str) -> dict:
    """
    Get existing conversation between two users or create new one.
    
    Args:
        user1_email: Email of first user
        user2_email: Email of second user
    
    Returns:
        Conversation document
    """
    # Normalize: always order participants alphabetically for consistency
    participants = sorted([user1_email, user2_email])
    
    # Find existing conversation
    existing = await conversations_collection.find_one({
        "participants": participants
    })
    
    if existing:
        return existing
    
    # Determine conversation type
    user1 = await users_collection.find_one({"email": user1_email})
    user2 = await users_collection.find_one({"email": user2_email})
    
    if not user1 or not user2:
        raise ValueError("One or both users not found")
    
    role1 = user1.get("role")
    role2 = user2.get("role")
    
    if role1 == "admin" and role2 == "admin":
        conv_type = "admin-admin"
    elif role1 == "doctor" and role2 == "doctor":
        conv_type = "doctor-doctor"
    else:
        conv_type = "admin-doctor"
    
    # Create new conversation
    now = datetime.utcnow().isoformat() + "Z"
    conv_doc = {
        "participants": participants,
        "type": conv_type,
        "created_at": now,
        "updated_at": now,
        "last_message_at": None,
    }
    
    result = await conversations_collection.insert_one(conv_doc)
    conv_doc["_id"] = result.inserted_id
    
    return conv_doc


async def save_message(
    conversation_id: str,
    sender_email: str,
    receiver_email: str,
    content: str,
    attachments: list | None = None
) -> dict:
    """
    Save a message to database.
    
    Args:
        conversation_id: ID of conversation
        sender_email: Email of sender
        receiver_email: Email of receiver
        content: Message content
    
    Returns:
        Saved message document
    """
    now = datetime.utcnow()
    expires_at = now + timedelta(days=90)  # Auto-delete after 90 days
    
    message_doc = {
        "conversation_id": ObjectId(conversation_id),
        "sender_email": sender_email,
        "receiver_email": receiver_email,
        "content": content,
        "attachments": attachments or [],
        "timestamp": now.isoformat() + "Z",
        "read": False,
        "read_at": None,
        "expires_at": expires_at.isoformat() + "Z",  # TTL index will handle deletion
    }
    
    result = await messages_collection.insert_one(message_doc)
    message_doc["_id"] = result.inserted_id
    
    # Update conversation's last_message_at
    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "last_message_at": now.isoformat() + "Z",
                "updated_at": now.isoformat() + "Z",
            }
        }
    )
    
    return message_doc


async def get_conversation_messages(
    conversation_id: str,
    limit: int = 30,
    skip: int = 0
) -> list:
    """
    Get messages from a conversation with pagination.
    
    Args:
        conversation_id: ID of conversation
        limit: Number of messages to return
        skip: Number of messages to skip (for pagination)
    
    Returns:
        List of message documents
    """
    messages = await messages_collection.find(
        {"conversation_id": ObjectId(conversation_id)}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(None)
    
    # Reverse to show chronological order (oldest first)
    return list(reversed(messages))


async def mark_message_as_read(message_id: str) -> dict:
    """
    Mark a message as read.
    
    Args:
        message_id: ID of message
    
    Returns:
        Updated message document
    """
    now = datetime.utcnow().isoformat() + "Z"
    
    result = await messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {
            "$set": {
                "read": True,
                "read_at": now,
            }
        }
    )
    
    if result.matched_count == 0:
        raise ValueError("Message not found")
    
    # Get updated message
    message = await messages_collection.find_one({"_id": ObjectId(message_id)})
    return message


async def get_user_conversations(user_email: str) -> list:
    """
    Get all conversations for a user, sorted by most recent.
    
    Args:
        user_email: Email of user
    
    Returns:
        List of conversation documents with unread counts
    """
    conversations = await conversations_collection.find(
        {"participants": user_email}
    ).sort("updated_at", -1).to_list(None)
    
    # Count unread messages for each conversation
    for conv in conversations:
        unread = await messages_collection.count_documents({
            "conversation_id": conv["_id"],
            "receiver_email": user_email,
            "read": False
        })
        conv["unread_count"] = unread
    
    return conversations


async def search_messages(
    conversation_id: str,
    query: str
) -> list:
    """
    Search messages in a conversation.
    
    Args:
        conversation_id: ID of conversation
        query: Search query
    
    Returns:
        List of matching messages
    """
    messages = await messages_collection.find(
        {
            "conversation_id": ObjectId(conversation_id),
            "content": {"$regex": query, "$options": "i"}
        }
    ).sort("timestamp", -1).to_list(None)
    
    return messages


async def get_unread_message_count(user_email: str) -> int:
    """
    Get total unread message count for a user.
    
    Args:
        user_email: Email of user
    
    Returns:
        Number of unread messages
    """
    count = await messages_collection.count_documents({
        "receiver_email": user_email,
        "read": False
    })
    
    return count
