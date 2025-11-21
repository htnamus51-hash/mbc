import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# MongoDB Atlas connection
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://sumanth:12345@cluster0.25zl6jj.mongodb.net/mbc?retryWrites=true&w=majority"
)

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client.mbc
users_collection = db.users
appointments_collection = db.appointments
clients_collection = db.clients
notes_collection = db.notes
