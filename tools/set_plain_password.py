import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv('MONGO_URI') or "mongodb+srv://sumanth:12345@cluster0.25zl6jj.mongodb.net/mbc?retryWrites=false&maxPoolSize=50&minPoolSize=10&maxIdleTimeMS=45000"

async def set_plain(email: str, pwd: str):
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.mbc
    result = await db.users.update_one({"email": email}, {"$set": {"password": pwd}})
    if result.matched_count:
        print(f"Set plain password for {email}")
    else:
        print(f"No user found with email {email}")

if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('email')
    p.add_argument('password')
    args = p.parse_args()
    asyncio.run(set_plain(args.email, args.password))
