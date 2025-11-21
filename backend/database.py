import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env locally (for development only)
load_dotenv()

# MongoDB Atlas connection - use environment variable with hardcoded fallback
MONGO_URI = os.getenv("MONGO_URI") or "mongodb+srv://sumanth:12345@cluster0.25zl6jj.mongodb.net/mbc?retryWrites=true&w=majority"

if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set and no fallback available.")

print(f"[DEBUG] Connecting to MongoDB with URI: {MONGO_URI[:50]}...")  # Log first 50 chars for debugging

# Add TLS settings for Railway environment
client = AsyncIOMotorClient(
    MONGO_URI, 
    serverSelectionTimeoutMS=10000,
    tlsAllowInvalidCertificates=True
)
db = client.mbc
users_collection = db.users
appointments_collection = db.appointments
clients_collection = db.clients
notes_collection = db.notes
