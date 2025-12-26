import asyncio
import sys
sys.path.insert(0, 'backend')

from backend.database import messages_collection, conversations_collection, users_collection

async def main():
    print("\n=== TESTING DATABASE ===\n")
    
    # Check messages
    msg_count = await messages_collection.count_documents({})
    print(f"Total messages in DB: {msg_count}")
    
    if msg_count > 0:
        msgs = await messages_collection.find({}).limit(3).to_list(None)
        print("\nRecent messages:")
        for msg in msgs:
            print(f"  {msg.get('sender_email')} → {msg.get('receiver_email')}: {msg.get('content')}")
    
    # Check conversations
    conv_count = await conversations_collection.count_documents({})
    print(f"\nTotal conversations in DB: {conv_count}")
    
    if conv_count > 0:
        convs = await conversations_collection.find({}).limit(3).to_list(None)
        print("\nRecent conversations:")
        for conv in convs:
            print(f"  {conv.get('participants')}")
    
    # Check users
    users = await users_collection.find({}).to_list(None)
    print(f"\nTotal users in DB: {len(users)}")
    for user in users[:5]:
        print(f"  {user.get('email')} ({user.get('role')})")

asyncio.run(main())
