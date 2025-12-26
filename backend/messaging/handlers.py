"""
WebSocket event handlers for real-time messaging
"""
from socketio import AsyncServer
from database import users_collection
from jwt_utils import verify_token
from messaging.service import (
    get_or_create_conversation,
    save_message,
    mark_message_as_read,
)
import logging


# Track connected users: { user_email: set(sid, ...) }
connected_users = {}


async def setup_websocket_handlers(sio: AsyncServer):
    """
    Register all WebSocket event handlers.
    
    Args:
        sio: Socket.IO server instance
    """
    
    logger = logging.getLogger(__name__)
    logger.info("[WebSocket Setup] Registering handlers...")
    
    @sio.on("connect")
    async def on_connect(sid, environ):
        logger.info(f"[WebSocket] User connected: {sid}")

    async def safe_emit(event: str, data: dict, email: str = None, sids: set = None):
        """Emit `event` to the provided set of `sids` (or the sids for `email`).

        This helper wraps emits in try/except and removes stale sids from the
        `connected_users` mapping if an emit fails.
        """
        if sids is None:
            if not email:
                return
            sids = connected_users.get(email)
            if not sids:
                return

        # iterate over a copy since we may remove items
        for rsid in list(sids):
            try:
                await sio.emit(event, data, to=rsid)
            except Exception as e:
                logger.warning(f"[WebSocket] Cannot send to sid {rsid}: {e}")
                try:
                    sids.discard(rsid)
                except Exception:
                    pass

        # if we were emitting by email and the set became empty, remove mapping
        if email and (not sids or len(sids) == 0):
            if email in connected_users:
                try:
                    del connected_users[email]
                except Exception:
                    pass
    
    @sio.on("disconnect")
    async def on_disconnect(sid):
        # Remove SID from any user entry that contains it
        removed_emails = []
        for email, sids in list(connected_users.items()):
            if sid in sids:
                sids.discard(sid)
                if len(sids) == 0:
                    # no more connections for user
                    del connected_users[email]
                    removed_emails.append(email)

        # Broadcast offline status for users that lost their last connection
        for email in removed_emails:
            try:
                await sio.emit("user_offline", {"email": email})
            except Exception as e:
                logger.error(f"[WebSocket] Error emitting user_offline for {email}: {e}")

        logger.info(f"[WebSocket] User disconnected: {sid}")
        logger.info(f"[WebSocket] Remaining users: {list(connected_users.keys())}")
    
    @sio.on("user_joined")
    async def on_user_joined(sid, data):
        """
        User opens the app and joins with their email.
        This identifies them for messaging.
        
        Args:
            sid: Socket session ID
            data: { "email": "user@example.com" }
        """
        # Accept either { email } or { token }
        user_email = data.get("email")
        token = data.get("token")

        # If token provided, verify and extract subject
        if token and not user_email:
            payload = verify_token(token)
            if not payload:
                await sio.emit("error", {"message": "Invalid token"}, to=sid)
                return
            user_email = payload.get("sub")

        if not user_email:
            await sio.emit("error", {"message": "Email required"}, to=sid)
            return

        # Verify user exists
        user = await users_collection.find_one({"email": user_email})
        if not user:
            await sio.emit("error", {"message": "User not found"}, to=sid)
            return
        
        # Store connection (support multiple tabs per user)
        s = connected_users.get(user_email)
        if not s:
            s = set()
            connected_users[user_email] = s
        s.add(sid)

        # Broadcast online status
        try:
            await sio.emit("user_online", {
                "email": user_email,
                "name": user.get("full_name", user_email.split("@")[0]),
            })
        except Exception as e:
            logger.error(f"[WebSocket] Error emitting user_online: {e}")
        
        logger.info(f"[WebSocket] User identified: {user_email} ({sid})")
    
    @sio.on("send_message")
    async def on_send_message(sid, data):
        """
        Handle incoming message from client.
        
        Args:
            sid: Socket session ID
            data: {
                "receiver_email": "doctor@example.com",
                "content": "Hello!",
                "conversation_id": "optional_conv_id"
            }
        """
        try:
            logger.debug(f"[on_send_message] Received from {sid}")
            logger.debug(f"[on_send_message] Data: {data}")
            
            sender_email = None
            receiver_email = data.get("receiver_email")
            content = data.get("content", "").strip()
            conversation_id = data.get("conversation_id")
            
            logger.debug(f"[on_send_message] receiver_email: {receiver_email}")
            logger.debug(f"[on_send_message] content: {content}")
            logger.debug(f"[on_send_message] conversation_id: {conversation_id}")
            
            # Find sender by SID
            for email, sids in connected_users.items():
                if sid in sids:
                    sender_email = email
                    break
            
            logger.debug(f"[on_send_message] sender_email: {sender_email}")
            logger.debug(f"[on_send_message] connected_users: {connected_users}")
            
            if not sender_email:
                logger.warning("[on_send_message] ERROR: User not identified")
                await sio.emit("error", {"message": "User not identified"}, to=sid)
                return
            
            if not receiver_email or not content:
                logger.warning("[on_send_message] ERROR: Invalid message data")
                await sio.emit("error", {"message": "Invalid message data"}, to=sid)
                return
            
            # Get or create conversation
            if not conversation_id:
                conv = await get_or_create_conversation(sender_email, receiver_email)
                conversation_id = str(conv["_id"])
            
            # Save message
            message = await save_message(
                conversation_id=conversation_id,
                sender_email=sender_email,
                receiver_email=receiver_email,
                content=content
            )
            
            # Format response
            message_data = {
                "id": str(message["_id"]),
                "conversation_id": conversation_id,
                "sender_email": sender_email,
                "receiver_email": receiver_email,
                "content": content,
                "timestamp": message["timestamp"],
                "read": False,
            }
            
            # Send confirmation to sender
            await sio.emit("message_sent_confirmed", message_data, to=sid)

            # Send message to receiver if online (to all open tabs) using safe_emit
            receiver_sids = connected_users.get(receiver_email)
            if receiver_sids:
                await safe_emit("receive_message", message_data, sids=receiver_sids, email=receiver_email)
            
            logger.info(f"[Message] {sender_email} → {receiver_email}: {content[:50]}")
        
        except Exception as e:
            logger.exception(f"[Error] send_message: {str(e)}")
            await sio.emit("error", {"message": str(e)}, to=sid)
    
    @sio.on("user_typing")
    async def on_user_typing(sid, data):
        """
        Broadcast typing indicator.
        
        Args:
            sid: Socket session ID
            data: {
                "receiver_email": "doctor@example.com",
                "is_typing": true
            }
        """
        receiver_email = data.get("receiver_email")
        is_typing = data.get("is_typing", False)
        
        # Find sender
        sender_email = None
        for email, sids in connected_users.items():
            if sid in sids:
                sender_email = email
                break
        
        if not sender_email or not receiver_email:
            return
        
        # Send to receiver if online (support multiple tabs)
        receiver_sids = connected_users.get(receiver_email)
        if receiver_sids:
            await safe_emit("user_typing", {"sender_email": sender_email, "is_typing": is_typing}, sids=receiver_sids, email=receiver_email)
    
    @sio.on("mark_message_read")
    async def on_mark_message_read(sid, data):
        """
        Mark a message as read and broadcast read receipt.
        
        Args:
            sid: Socket session ID
            data: { "message_id": "msg_123" }
        """
        try:
            message_id = data.get("message_id")
            
            if not message_id:
                return
            
            # Mark as read
            message = await mark_message_as_read(message_id)
            
            # Find sender and receiver
            sender_email = message.get("sender_email")
            receiver_email = None
            for email, sids in connected_users.items():
                if sid in sids:
                    receiver_email = email
                    break

            if not sender_email or not receiver_email:
                return

            # Send read receipt to sender if online (all sender tabs)
            sender_sids = connected_users.get(sender_email)
            if sender_sids:
                await safe_emit("message_read_receipt", {"message_id": message_id, "read_at": message["read_at"]}, sids=sender_sids, email=sender_email)
        
        except Exception as e:
            logger.exception(f"[Error] mark_message_read: {str(e)}")

    # ---------- CALL / WEBRTC signalling handlers ----------
    @sio.on("call.invite")
    async def on_call_invite(sid, data):
        """Invite a user to a call. Forwards invite to callee's sids.

        data: { "to": "callee@example.com", "conversation_id": "...", "meta": {...} }
        """
        try:
            # find sender
            sender_email = None
            for email, sids in connected_users.items():
                if sid in sids:
                    sender_email = email
                    break

            to = data.get("to")
            conv = data.get("conversation_id")
            meta = data.get("meta", {})

            if not sender_email or not to:
                await sio.emit("error", {"message": "Invalid call invite"}, to=sid)
                return

            payload = {"from": sender_email, "conversation_id": conv, "meta": meta}
            logger.info(f"[Call] invite from {sender_email} -> {to} (conv={conv}) payload={payload}")
            sids = connected_users.get(to)
            logger.info(f"[Call] target sids for {to}: {sids}")
            await safe_emit("call.invite", payload, email=to)
            logger.info(f"[Call] invite forwarded from {sender_email} to {to} (conv={conv})")
        except Exception as e:
            logger.exception(f"[Error] call.invite: {e}")
            await sio.emit("error", {"message": str(e)}, to=sid)

    @sio.on("call.offer")
    async def on_call_offer(sid, data):
        """Forward SDP offer to callee.

        data: { "to": "callee@example.com", "sdp": {...}, "conversation_id": "..." }
        """
        try:
            sender_email = None
            for email, sids in connected_users.items():
                if sid in sids:
                    sender_email = email
                    break

            to = data.get("to")
            sdp = data.get("sdp")
            conv = data.get("conversation_id")

            if not sender_email or not to or not sdp:
                await sio.emit("error", {"message": "Invalid call offer"}, to=sid)
                return

            logger.info(f"[Call] offer from {sender_email} -> {to} (conv={conv}) sdp_keys={list(sdp.keys()) if isinstance(sdp, dict) else 'sdp_present'}")
            # Debug: snapshot connected users mapping to verify target SIDs
            try:
                snapshot = {k: list(v) for k, v in connected_users.items()}
                logger.debug(f"[Call] connected_users snapshot: {snapshot}")
            except Exception:
                logger.debug(f"[Call] connected_users keys: {list(connected_users.keys())}")

            sids = connected_users.get(to)
            logger.info(f"[Call] target sids for {to}: {sids}")
            await safe_emit("call.offer", {"from": sender_email, "sdp": sdp, "conversation_id": conv}, email=to)
            logger.info(f"[Call] offer forwarded from {sender_email} to {to}")
        except Exception as e:
            logger.exception(f"[Error] call.offer: {e}")
            await sio.emit("error", {"message": str(e)}, to=sid)

    @sio.on("call.answer")
    async def on_call_answer(sid, data):
        """Forward SDP answer to caller.

        data: { "to": "caller@example.com", "sdp": {...}, "conversation_id": "..." }
        """
        try:
            sender_email = None
            for email, sids in connected_users.items():
                if sid in sids:
                    sender_email = email
                    break

            to = data.get("to")
            sdp = data.get("sdp")
            conv = data.get("conversation_id")

            if not sender_email or not to or not sdp:
                await sio.emit("error", {"message": "Invalid call answer"}, to=sid)
                return

            logger.info(f"[Call] answer from {sender_email} -> {to} (conv={conv})")
            sids = connected_users.get(to)
            logger.info(f"[Call] target sids for {to}: {sids}")
            await safe_emit("call.answer", {"from": sender_email, "sdp": sdp, "conversation_id": conv}, email=to)
            logger.info(f"[Call] answer forwarded from {sender_email} to {to}")
        except Exception as e:
            logger.exception(f"[Error] call.answer: {e}")
            await sio.emit("error", {"message": str(e)}, to=sid)

    @sio.on("call.ice")
    async def on_call_ice(sid, data):
        """Forward ICE candidate to peer.

        data: { "to": "peer@example.com", "candidate": {...}, "conversation_id": "..." }
        """
        try:
            sender_email = None
            for email, sids in connected_users.items():
                if sid in sids:
                    sender_email = email
                    break

            to = data.get("to")
            candidate = data.get("candidate")
            conv = data.get("conversation_id")

            if not sender_email or not to or not candidate:
                await sio.emit("error", {"message": "Invalid ICE candidate"}, to=sid)
                return

            logger.info(f"[Call] ice from {sender_email} -> {to} (conv={conv}) candidate_keys={list(candidate.keys()) if isinstance(candidate, dict) else 'candidate_present'}")
            sids = connected_users.get(to)
            logger.info(f"[Call] target sids for {to}: {sids}")
            await safe_emit("call.ice", {"from": sender_email, "candidate": candidate, "conversation_id": conv}, email=to)
            logger.info(f"[Call] ice forwarded from {sender_email} to {to}")
        except Exception as e:
            logger.exception(f"[Error] call.ice: {e}")
            await sio.emit("error", {"message": str(e)}, to=sid)

    @sio.on("call.end")
    async def on_call_end(sid, data):
        """Notify peer that call has ended.

        data: { "to": "peer@example.com", "conversation_id": "...", "reason": "user_hangup" }
        """
        try:
            sender_email = None
            for email, sids in connected_users.items():
                if sid in sids:
                    sender_email = email
                    break

            to = data.get("to")
            conv = data.get("conversation_id")
            reason = data.get("reason")

            if not sender_email or not to:
                await sio.emit("error", {"message": "Invalid call end"}, to=sid)
                return

            await safe_emit("call.end", {"from": sender_email, "conversation_id": conv, "reason": reason}, email=to)
        except Exception as e:
            logger.exception(f"[Error] call.end: {e}")
            await sio.emit("error", {"message": str(e)}, to=sid)
