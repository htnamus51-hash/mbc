import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env locally (for development only)
load_dotenv()

# MongoDB Atlas connection - use environment variable, fallback to .env
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set. Please configure it in .env or environment.")

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client.mbc
users_collection = db.users
appointments_collection = db.appointments
clients_collection = db.clients
notes_collection = db.notes
