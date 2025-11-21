import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB Atlas connection
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://sumanth2004ak_db_user:password@cluster0.25zl6jj.mongodb.net/mbc?retryWrites=true&w=majority"
)

client = AsyncIOMotorClient(MONGO_URI)
db = client.mbc
users_collection = db.users
appointments_collection = db.appointments
clients_collection = db.clients
notes_collection = db.notes
