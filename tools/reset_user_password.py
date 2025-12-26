import os
import asyncio

from motor.motor_asyncio import AsyncIOMotorClient

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from auth import hash_password


MONGO_URI = os.getenv('MONGO_URI') or "mongodb+srv://sumanth:12345@cluster0.25zl6jj.mongodb.net/mbc?retryWrites=false&maxPoolSize=50&minPoolSize=10&maxIdleTimeMS=45000"


async def reset_password(email: str, new_password: str):
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.mbc
    users = db.users
    hashed = hash_password(new_password)
    result = await users.update_one({"email": email}, {"$set": {"password": hashed}})
    if result.matched_count:
        print(f"Updated password for {email}")
    else:
        print(f"No user found with email {email}")


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('email')
    p.add_argument('password')
    args = p.parse_args()
    asyncio.run(reset_password(args.email, args.password))
