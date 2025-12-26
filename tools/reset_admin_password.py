import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import asyncio
from backend.database import users_collection
from backend.auth import hash_password

async def main():
    emails = ['admin@mbctherapy.com', 'ram@gmail.com', 'kashyap@gmail.com']
    new_pw = 'password'
    # Dev: write plaintext password directly to DB to avoid local bcrypt issues
    for email in emails:
        res = await users_collection.update_one({'email': email}, {'$set': {'password': new_pw}})
        print('Updated', email, '->', res.modified_count)
    print('Matched:', res.matched_count, 'Modified:', res.modified_count)

if __name__ == '__main__':
    asyncio.run(main())
