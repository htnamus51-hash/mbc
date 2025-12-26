"""Two-client simulator for messaging integration tests.

This script connects two socket.io clients to the running backend and
verifies send/receive and persistence via REST endpoints.

Usage: run this while backend is running on http://localhost:8008
"""
import asyncio
import os
import sys
import json

import socketio
import httpx


API_BASE = os.environ.get("API_BASE", "http://localhost:8008")
WS_BASE = API_BASE


async def run_test(sender_email: str, receiver_email: str):
    sio_a = socketio.AsyncClient(logger=False, engineio_logger=False)
    sio_b = socketio.AsyncClient(logger=False, engineio_logger=False)

    received = asyncio.Event()
    sent_confirm = asyncio.Event()
    message_data = {}

    @sio_a.event
    async def connect():
        print("[A] connected")
        await sio_a.emit("user_joined", {"email": sender_email})

    @sio_b.event
    async def connect():
        print("[B] connected")
        await sio_b.emit("user_joined", {"email": receiver_email})

    @sio_b.on("receive_message")
    async def on_receive_message(msg):
        print("[B] receive_message:", msg)
        message_data['received'] = msg
        received.set()

    @sio_a.on("message_sent_confirmed")
    async def on_message_sent_confirmed(msg):
        print("[A] message_sent_confirmed:", msg)
        message_data['sent_confirm'] = msg
        sent_confirm.set()

    print(f"Connecting clients to {WS_BASE} ...")
    await sio_a.connect(WS_BASE, transports=["websocket"]) 
    await sio_b.connect(WS_BASE, transports=["websocket"]) 

    await asyncio.sleep(0.5)

    # Send a message from A -> B (no conversation_id so backend creates one)
    content = f"Hello from {sender_email} to {receiver_email}"
    print("[A] Emitting send_message...")
    await sio_a.emit("send_message", {"receiver_email": receiver_email, "content": content})

    # Wait for both confirmation and receive
    try:
        await asyncio.wait_for(asyncio.gather(sent_confirm.wait(), received.wait()), timeout=5.0)
    except asyncio.TimeoutError:
        print("Timed out waiting for message events")

    # Check REST persistence via messages endpoint
    async with httpx.AsyncClient() as client:
        # find conversations for sender
        r = await client.get(f"{API_BASE}/api/conversations?user_email={sender_email}")
        if r.status_code != 200:
            print("Failed to fetch conversations:", r.status_code, r.text)
        else:
            convs = r.json()
            print("Conversations for sender:", json.dumps(convs, indent=2))

        # if we have conversation id from sent_confirm, use it
        conv_id = None
        if 'sent_confirm' in message_data:
            conv_id = message_data['sent_confirm'].get('conversation_id')

        if not conv_id and convs:
            conv_id = convs[0]['id']

        if conv_id:
            r = await client.get(f"{API_BASE}/api/conversations/{conv_id}/messages?limit=30&skip=0")
            print(f"Messages for conv {conv_id}: status={r.status_code}")
            if r.status_code == 200:
                print(json.dumps(r.json(), indent=2))
            else:
                print(r.text)

    # Simulate disconnect of B and reconnect
    print("[Test] Disconnecting B...")
    await sio_b.disconnect()
    await asyncio.sleep(0.2)
    print("[Test] Reconnecting B...")
    await sio_b.connect(WS_BASE, transports=["websocket"]) 
    await asyncio.sleep(0.5)

    # Send another message to ensure multi-sid / reconnect works
    print("[A] Emitting second send_message...")
    await sio_a.emit("send_message", {"receiver_email": receiver_email, "content": content + ' (second)'})

    # wait briefly
    await asyncio.sleep(1.0)

    await sio_a.disconnect()
    await sio_b.disconnect()

    print("Test finished")


def main():
    sender = os.environ.get('SIM_SENDER', 'kashyap@gmail.com')
    receiver = os.environ.get('SIM_RECEIVER', 'doctor1@gmail.com')
    print("Using sender", sender, "receiver", receiver)
    asyncio.run(run_test(sender, receiver))


if __name__ == '__main__':
    main()
