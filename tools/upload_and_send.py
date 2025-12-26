"""Upload a small test file to the backend and send a message containing the attachment.

Usage: run from repo root with the backend running:

python tools/upload_and_send.py
"""
import os
import sys
import json
import tempfile
import httpx

BASE = os.environ.get('MBC_API', 'http://localhost:8008')
SENDER = 'kashyap@gmail.com'
RECEIVER = 'doctor1@gmail.com'

async def main():
    async with httpx.AsyncClient() as client:
        # create a small temp file
        with tempfile.NamedTemporaryFile('wb', delete=False, suffix='.txt') as f:
            f.write(b'Test attachment from automation script')
            tmp_name = f.name
        files = {'file': (os.path.basename(tmp_name), open(tmp_name, 'rb'), 'text/plain')}
        print('Uploading file...')
        r = await client.post(f'{BASE}/api/uploads', files=files)
        if r.status_code != 200:
            print('Upload failed:', r.status_code, r.text)
            return
        meta = r.json()
        print('Upload returned:', meta)

        # Send message with attachment
        payload = {
            'sender_email': SENDER,
            'receiver_email': RECEIVER,
            'content': 'Automated message with attachment',
            'attachments': [meta]
        }
        print('Sending message with attachment...')
        r2 = await client.post(f'{BASE}/api/messages', json=payload)
        print('Send response:', r2.status_code, r2.text)

        # cleanup temp file
        try:
            os.unlink(tmp_name)
        except Exception:
            pass

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
