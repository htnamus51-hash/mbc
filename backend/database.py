import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env locally (for development only)
load_dotenv()

# MongoDB Atlas connection - use environment variable with hardcoded fallback
MONGO_URI = os.getenv("MONGO_URI") or "mongodb+srv://sumanth:12345@cluster0.25zl6jj.mongodb.net/mbc?retryWrites=false&maxPoolSize=50&minPoolSize=10&maxIdleTimeMS=45000"

if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set and no fallback available.")

print(f"[DEBUG] Connecting to MongoDB with URI: {MONGO_URI[:50]}...")

# Motor client with connection pooling
try:
    client = AsyncIOMotorClient(
        MONGO_URI,
        serverSelectionTimeoutMS=15000,
        socketTimeoutMS=15000,
        connectTimeoutMS=15000,
        retryWrites=False
    )
    db = client.mbc
    users_collection = db.users
    appointments_collection = db.appointments
    clients_collection = db.clients
    notes_collection = db.notes
    messages_collection = db.messages
    conversations_collection = db.conversations
    registrations_collection = db.registrations
    tasks_collection = db.tasks
    print("[DEBUG] MongoDB connection initialized successfully")
except Exception as e:
    print(f"[ERROR] Failed to initialize MongoDB: {e}")
    raise
