import asyncio
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.database import users_collection

async def main():
    for email in ['admin@mbctherapy.com','ram@gmail.com','kashyap@gmail.com']:
        user = await users_collection.find_one({"email": email})
        print('\n====', email, '====')
        print(user)

if __name__ == '__main__':
    asyncio.run(main())
