import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Apply Pydantic v1 + Python 3.13 compatibility patch BEFORE importing FastAPI
from pydantic_fix import *  # noqa: F401, F403

from fastapi import FastAPI, HTTPException, UploadFile, File
from auth import hash_password, verify_password, needs_rehash
from jwt_utils import create_access_token, verify_token
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from socketio import AsyncServer
import socketio
import logging
from logging.handlers import RotatingFileHandler
import traceback
from bson import ObjectId
from datetime import datetime, timedelta

from database import users_collection, appointments_collection, clients_collection, notes_collection, messages_collection, conversations_collection, registrations_collection, tasks_collection
from data_api import USE_DATA_API, find_one as data_find_one, insert_one as data_insert_one
from schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SimpleMessage,
    AppointmentCreate,
    AppointmentResponse,
    ClientCreate,
    ClientResponse,
    NoteCreate,
    NoteResponse,
    MessageCreate,
    MessageResponse,
    ConversationResponse,
    UserProfile,
    WebsiteRegistrationCreate,
    WebsiteRegistrationResponse,
    TaskCreate,
    TaskResponse,
    DoctorResponse,
)
from messaging.handlers import setup_websocket_handlers
from messaging.handlers import connected_users

fastapi_app = FastAPI()

# Configure structured logging for backend (file + console)
logs_dir = os.path.join(os.path.dirname(__file__), "logs")
try:
    os.makedirs(logs_dir, exist_ok=True)
except Exception:
    pass

log_file = os.path.join(logs_dir, "messaging.log")
logger = logging.getLogger("mbc")
logger.setLevel(logging.INFO)
if not logger.handlers:
    fh = RotatingFileHandler(log_file, maxBytes=10 * 1024 * 1024, backupCount=3)
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    # also log to console
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

# Allow CORS from all origins (for development)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Socket.IO
sio = AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    logger=True,
    engineio_logger=True,
    async_handlers=True,
)

# Mount Socket.IO to FastAPI - Create the ASGI app that will be exported
app = socketio.ASGIApp(sio, fastapi_app, socketio_path='/socket.io')

# Serve uploaded files from /uploads
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@fastapi_app.get("/")
async def root():
    return {"status": "ok", "message": "MBC Backend API is running", "docs": "/docs"}


@fastapi_app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}


@fastapi_app.post("/api/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    # If Atlas Data API is configured, use it instead of direct driver
    if USE_DATA_API:
        user = await data_find_one("users", {"email": payload.email})
    else:
        user = await users_collection.find_one({"email": payload.email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    stored = user.get("password")
    valid = False
    try:
        # If stored password is hashed, verify with passlib
        if isinstance(stored, str) and (stored.startswith("$2") or stored.startswith("$argon2")):
            valid = verify_password(payload.password, stored)
        else:
            # legacy plaintext - compare and re-hash on success
            if stored == payload.password:
                valid = True
                try:
                    new_hash = hash_password(payload.password)
                    await users_collection.update_one({"email": payload.email}, {"$set": {"password": new_hash}})
                except Exception:
                    pass
    except Exception:
        valid = False

    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = user.get("role")
    if role == "admin":
        token = create_access_token({"sub": payload.email}, expires_minutes=60 * 24)
        return LoginResponse(role="admin", message="Admin login successful", access_token=token)
    elif role == "doctor":
        token = create_access_token({"sub": payload.email}, expires_minutes=60 * 24)
        return LoginResponse(role="doctor", message="Doctor login successful", access_token=token)
    else:
        raise HTTPException(status_code=400, detail="Unknown role")


@fastapi_app.post("/api/auth/register", response_model=SimpleMessage)
async def register(payload: RegisterRequest):
    try:
        # Debugging: print incoming role and show that request reached the route
        # (This will only run for POST; OPTIONS is handled by CORSMiddleware.)
        logger.info(f"Register attempt: email={payload.email}, role={payload.role}")

        # check existing user via Data API or driver
        if USE_DATA_API:
            existing = await data_find_one("users", {"email": payload.email})
        else:
            existing = await users_collection.find_one({"email": payload.email})
        if existing:
            raise HTTPException(status_code=409, detail="User already exists")

        if not payload.password or len(payload.password) < 4:
            raise HTTPException(status_code=400, detail="Password too short")

        # Generate full_name from email (can be updated later)
        full_name = payload.email.split('@')[0].replace('.', ' ').title()
        
        user_doc = {
            "email": payload.email,
            "password": hash_password(payload.password),
            "role": payload.role,
            "full_name": full_name,  # Generate from email
            "user_type": payload.role,  # Same as role
            "avatar_url": None,
        }
        if USE_DATA_API:
            await data_insert_one("users", user_doc)
        else:
            await users_collection.insert_one(user_doc)

        if payload.role == "admin":
            msg = "Admin account created successfully"
        elif payload.role == "doctor":
            msg = "Doctor account created successfully"
        else:
            raise HTTPException(status_code=400, detail="Unsupported role")

        return SimpleMessage(message=msg)
    except HTTPException:
        # re-raise HTTP exceptions unchanged
        raise
    except Exception as exc:
        # ensure traceback is captured to a file for debugging
        try:
            tb = traceback.format_exc()
            err_log = os.path.join(logs_dir, "error.log")
            with open(err_log, "a", encoding="utf-8") as f:
                f.write("\n--- Exception in /api/auth/register ---\n")
                f.write(tb)
                f.write("\n")
            logger.error("Exception in register: %s", tb)
        except Exception:
            logger.exception("Failed to write exception to error.log")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@fastapi_app.post("/api/appointments", response_model=AppointmentResponse)
async def create_appointment(payload: AppointmentCreate):
    """Create a new appointment and save to MongoDB after checking availability."""
    
    # Parse the datetime to check for conflicts
    appt_start = datetime.fromisoformat(payload.datetime.replace('Z', '+00:00'))
    appt_end = appt_start + timedelta(minutes=payload.duration)
    
    # Extract date string for comparison (YYYY-MM-DD)
    appt_date = appt_start.strftime("%Y-%m-%d")
    
    # Get all appointments for this doctor on the same date
    existing_appts = await appointments_collection.find({
        "doctor": payload.doctor,
        "status": {"$ne": "cancelled"}
    }).to_list(None)
    
    # Check for time overlap in Python (simpler and more reliable)
    for existing in existing_appts:
        existing_start = datetime.fromisoformat(existing["datetime"].replace('Z', '+00:00'))
        existing_date = existing_start.strftime("%Y-%m-%d")
        
        # Only check if on the same date
        if existing_date != appt_date:
            continue
        
        existing_end = existing_start + timedelta(minutes=existing.get("duration", 60))
        
        # Check for overlap: new starts before existing ends AND new ends after existing starts
        if appt_start < existing_end and appt_end > existing_start:
            raise HTTPException(
                status_code=409,
                detail=f"Time slot conflict! Doctor {payload.doctor} is already booked from {existing_start.strftime('%H:%M')} to {existing_end.strftime('%H:%M')} on {appt_date}. Please choose another time."
            )
    
    appointment_doc = {
        "doctor": payload.doctor,
        "datetime": payload.datetime,
        "purpose": payload.purpose,
        "client": payload.client,
        "duration": payload.duration,
        "status": "scheduled",
        "created_at": datetime.utcnow(),
    }
    result = await appointments_collection.insert_one(appointment_doc)
    appointment_doc["id"] = str(result.inserted_id)
    return AppointmentResponse(**appointment_doc)


@fastapi_app.get("/api/appointments")
async def get_appointments(doctor: str = None):
    """Get all appointments or filter by doctor."""
    query = {}
    if doctor:
        query["doctor"] = doctor
    
    appointments = await appointments_collection.find(query).to_list(None)
    return [
        {
            "id": str(appt["_id"]),
            "doctor": appt.get("doctor"),
            "datetime": appt.get("datetime"),
            "purpose": appt.get("purpose"),
            "client": appt.get("client"),
            "duration": appt.get("duration", 60),
            "status": appt.get("status", "scheduled"),
        }
        for appt in appointments
    ]


@fastapi_app.get("/api/appointments/check-availability")
async def check_availability(doctor: str, datetime_str: str, duration: int = 60):
    """
    Check if a doctor is available for a given time slot.
    Returns: { "available": true/false, "message": "..." }
    """
    try:
        appt_start = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        appt_end = appt_start + timedelta(minutes=duration)
        appt_date = appt_start.strftime("%Y-%m-%d")
        
        # Get all appointments for this doctor on the same date
        existing_appts = await appointments_collection.find({
            "doctor": doctor,
            "status": {"$ne": "cancelled"}
        }).to_list(None)
        
        # Check for time overlap in Python
        for existing in existing_appts:
            existing_start = datetime.fromisoformat(existing["datetime"].replace('Z', '+00:00'))
            existing_date = existing_start.strftime("%Y-%m-%d")
            
            # Only check if on the same date
            if existing_date != appt_date:
                continue
            
            existing_end = existing_start + timedelta(minutes=existing.get("duration", 60))
            
            # Check for overlap
            if appt_start < existing_end and appt_end > existing_start:
                return {
                    "available": False,
                    "message": f"Doctor is busy from {existing_start.strftime('%H:%M')} to {existing_end.strftime('%H:%M')} on {appt_date}"
                }
        
        return {"available": True, "message": "Time slot is available"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {str(e)}")


@fastapi_app.delete("/api/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str):
    """Delete an appointment."""
    from bson.errors import InvalidId
    try:
        result = await appointments_collection.delete_one({"_id": ObjectId(appointment_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return SimpleMessage(message="Appointment deleted successfully")
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")


@fastapi_app.post("/api/clients", response_model=ClientResponse)
async def create_client(payload: ClientCreate):
    """Create a new client and save to MongoDB."""
    client_doc = {
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "email": payload.email,
        "phone": payload.phone,
        "date_of_birth": payload.date_of_birth,
        "gender": payload.gender,
        "created_at": datetime.utcnow(),
    }
    result = await clients_collection.insert_one(client_doc)
    client_doc["id"] = str(result.inserted_id)
    return ClientResponse(**client_doc)


@fastapi_app.get("/api/clients")
async def list_clients():
    clients = await clients_collection.find({}).to_list(None)
    return [
        {
            "id": str(c.get("_id")),
            "first_name": c.get("first_name"),
            "last_name": c.get("last_name"),
            "email": c.get("email"),
            "phone": c.get("phone"),
            "date_of_birth": c.get("date_of_birth"),
            "gender": c.get("gender"),
        }
        for c in clients
    ]


@fastapi_app.get("/api/clients/{client_id}")
async def get_client(client_id: str):
    from bson.errors import InvalidId
    try:
        client = await clients_collection.find_one({"_id": ObjectId(client_id)})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        return {
            "id": str(client.get("_id")),
            "first_name": client.get("first_name"),
            "last_name": client.get("last_name"),
            "email": client.get("email"),
            "phone": client.get("phone"),
            "date_of_birth": client.get("date_of_birth"),
            "gender": client.get("gender"),
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid client ID")


# ==================== WEBSITE REGISTRATIONS ====================

@fastapi_app.post("/api/registrations", response_model=WebsiteRegistrationResponse)
async def create_registration(payload: WebsiteRegistrationCreate):
    """Public endpoint for website registrations."""
    doc = {
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "message": payload.message,
        "source": payload.source,
        "status": "new",
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await registrations_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@fastapi_app.get("/api/registrations")
async def list_registrations():
    """List all registrations from the website."""
    cursor = registrations_collection.find().sort("created_at", -1)
    regs = await cursor.to_list(length=100)
    return [
        {
            "id": str(r["_id"]),
            "name": r.get("name"),
            "email": r.get("email"),
            "phone": r.get("phone"),
            "message": r.get("message"),
            "source": r.get("source", "mbctherapy.com"),
            "status": r.get("status", "new"),
            "created_at": r.get("created_at"),
        }
        for r in regs
    ]


# ==================== TASKS ====================

@fastapi_app.post("/api/tasks", response_model=TaskResponse)
async def create_task(payload: TaskCreate):
    doc = {
        "task": payload.task,
        "type": payload.type,
        "priority": payload.priority,
        "completed": False,
        "created_at": datetime.utcnow().isoformat(),
        "client_id": payload.client_id
    }
    result = await tasks_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@fastapi_app.get("/api/tasks")
async def list_tasks():
    """List all pending tasks."""
    cursor = tasks_collection.find({"completed": False}).sort("created_at", -1)
    tasks = await cursor.to_list(length=100)

    return [
        {
            "id": str(t["_id"]),
            "task": t.get("task"),
            "type": t.get("type"),
            "priority": t.get("priority"),
            "completed": t.get("completed", False),
            "created_at": t.get("created_at"),
            "client_id": t.get("client_id")
        }
        for t in tasks
    ]


@fastapi_app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, completed: bool):
    from bson.errors import InvalidId
    try:
        result = await tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"completed": completed}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"status": "success"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid task ID")


@fastapi_app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    from bson.errors import InvalidId
    try:
        result = await tasks_collection.delete_one({"_id": ObjectId(task_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"status": "success"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid task ID")


# ==================== NOTES ENDPOINTS ====================

@fastapi_app.post("/api/notes", response_model=NoteResponse)
async def create_note(payload: NoteCreate):
    """Create a new note and save to MongoDB."""
    note_doc = {
        "note_type": payload.note_type,
        "content": payload.content,
        "client_id": payload.client_id,
        "reminder_date": payload.reminder_date,
        "reminder_time": payload.reminder_time,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "created_by": "Dr. Admin",
    }
    result = await notes_collection.insert_one(note_doc)
    note_doc["id"] = str(result.inserted_id)
    return NoteResponse(**note_doc)


@fastapi_app.get("/api/notes")
async def get_notes(client_id: str = None):
    """Get all notes or filter by client."""
    query = {}
    if client_id:
        query["client_id"] = client_id
    
    notes = await notes_collection.find(query).sort("created_at", -1).to_list(None)
    return [
        {
            "id": str(note["_id"]),
            "note_type": note.get("note_type"),
            "content": note.get("content"),
            "client_id": note.get("client_id"),
            "reminder_date": note.get("reminder_date"),
            "reminder_time": note.get("reminder_time"),
            "created_at": note.get("created_at"),
            "created_by": note.get("created_by", "Dr. Admin"),
            "completed": note.get("completed", False),
        }
        for note in notes
    ]


@fastapi_app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note."""
    from bson.errors import InvalidId
    try:
        result = await notes_collection.delete_one({"_id": ObjectId(note_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        return SimpleMessage(message="Note deleted successfully")
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid note ID")


@fastapi_app.patch("/api/notes/{note_id}/complete")
async def complete_note(note_id: str):
    """Mark a note as completed."""
    from bson.errors import InvalidId
    try:
        result = await notes_collection.update_one(
            {"_id": ObjectId(note_id)},
            {"$set": {"completed": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Return updated note
        note = await notes_collection.find_one({"_id": ObjectId(note_id)})
        return {
            "id": str(note["_id"]),
            "note_type": note.get("note_type"),
            "content": note.get("content"),
            "client_id": note.get("client_id"),
            "reminder_date": note.get("reminder_date"),
            "reminder_time": note.get("reminder_time"),
            "created_at": note.get("created_at"),
            "created_by": note.get("created_by", "Dr. Admin"),
            "completed": note.get("completed", True),
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid note ID")


# ==================== MESSAGING ENDPOINTS ====================

@fastapi_app.get("/api/conversations")
async def list_conversations(user_email: str):
    """Get all conversations for a user."""
    conversations = await conversations_collection.find(
        {"participants": user_email}
    ).sort("updated_at", -1).to_list(None)
    
    result = []
    for conv in conversations:
        unread = await messages_collection.count_documents({
            "conversation_id": conv["_id"],
            "receiver_email": user_email,
            "read": False
        })
        
        result.append({
            "id": str(conv["_id"]),
            "participants": conv.get("participants"),
            "type": conv.get("type"),
            "created_at": conv.get("created_at"),
            "updated_at": conv.get("updated_at"),
            "last_message_at": conv.get("last_message_at"),
            "unread_count": unread,
        })
    
    return result


@fastapi_app.post("/api/conversations")
async def create_conversation(payload: dict):
    """Create a new conversation.

    Expected payload: { "participants": ["a@example.com", "b@example.com", ...], "type": "group" }
    """
    try:
        participants = payload.get('participants')
        if not participants or not isinstance(participants, list) or len(participants) < 2:
            raise HTTPException(status_code=400, detail="participants must be an array with at least 2 emails")

        # Normalize and ensure users exist
        from messaging.service import get_or_create_conversation

        # For groups we'll create a new conversation document directly
        now = datetime.utcnow().isoformat() + 'Z'
        conv_doc = {
            'participants': sorted(participants),
            'type': payload.get('type', 'group'),
            'name': payload.get('name'),
            'created_at': now,
            'updated_at': now,
            'last_message_at': None,
        }
        result = await conversations_collection.insert_one(conv_doc)
        conv_doc['id'] = str(result.inserted_id)
        return {
            'id': str(result.inserted_id),
            'participants': conv_doc['participants'],
            'type': conv_doc['type'],
            'name': conv_doc.get('name'),
            'created_at': conv_doc['created_at'],
            'updated_at': conv_doc['updated_at'],
            'last_message_at': conv_doc['last_message_at'],
            'unread_count': 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[CONV] create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, limit: int = 30, skip: int = 0):
    """Get messages from a conversation with pagination."""
    from bson.errors import InvalidId
    
    try:
        messages = await messages_collection.find(
            {"conversation_id": ObjectId(conversation_id)}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(None)
        
        # Reverse to show chronological order
        messages.reverse()
        
        return [
            {
                "id": str(msg["_id"]),
                "conversation_id": conversation_id,
                "sender_email": msg.get("sender_email"),
                "receiver_email": msg.get("receiver_email"),
                "content": msg.get("content"),
                "timestamp": msg.get("timestamp"),
                "read": msg.get("read", False),
                "read_at": msg.get("read_at"),
            }
            for msg in messages
        ]
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")


@fastapi_app.put("/api/messages/{message_id}")
async def edit_message(message_id: str, payload: dict):
    """Edit a message content. Expects { "content": "new text" }"""
    from bson.errors import InvalidId
    try:
        new_content = payload.get('content')
        if new_content is None:
            raise HTTPException(status_code=400, detail="content required")

        msg = await messages_collection.find_one({"_id": ObjectId(message_id)})
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        now = datetime.utcnow().isoformat() + 'Z'
        await messages_collection.update_one({"_id": ObjectId(message_id)}, {"$set": {"content": new_content, "edited": True, "edited_at": now}})

        # prepare response
        updated = await messages_collection.find_one({"_id": ObjectId(message_id)})
        response = {
            "id": str(updated["_id"]),
            "conversation_id": str(updated.get("conversation_id")),
            "sender_email": updated.get("sender_email"),
            "receiver_email": updated.get("receiver_email"),
            "content": updated.get("content"),
            "timestamp": updated.get("timestamp"),
            "edited": updated.get("edited", False),
            "edited_at": updated.get("edited_at"),
        }

        # broadcast to participants if online
        try:
            conv = await conversations_collection.find_one({"_id": ObjectId(updated.get('conversation_id'))})
            if conv:
                participants = conv.get('participants', [])
                for p in participants:
                    sids = connected_users.get(p)
                    if sids:
                        for sid in list(sids):
                            try:
                                await sio.emit('message_edited', response, to=sid)
                            except Exception:
                                try:
                                    sids.discard(sid)
                                except Exception:
                                    pass
        except Exception:
            logger.exception('Error broadcasting message_edited')

        return response
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid message ID")


@fastapi_app.delete("/api/messages/{message_id}")
async def delete_message(message_id: str):
    """Soft-delete a message by setting deleted flag."""
    from bson.errors import InvalidId
    try:
        msg = await messages_collection.find_one({"_id": ObjectId(message_id)})
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        now = datetime.utcnow().isoformat() + 'Z'
        await messages_collection.update_one({"_id": ObjectId(message_id)}, {"$set": {"deleted": True, "deleted_at": now, "content": ''}})

        response = {"id": message_id, "deleted": True, "deleted_at": now}

        # broadcast deletion to participants
        try:
            conv = await conversations_collection.find_one({"_id": ObjectId(msg.get('conversation_id'))})
            if conv:
                participants = conv.get('participants', [])
                for p in participants:
                    sids = connected_users.get(p)
                    if sids:
                        for sid in list(sids):
                            try:
                                await sio.emit('message_deleted', response, to=sid)
                            except Exception:
                                try:
                                    sids.discard(sid)
                                except Exception:
                                    pass
        except Exception:
            logger.exception('Error broadcasting message_deleted')

        return response
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid message ID")


@fastapi_app.post("/api/messages")
async def send_message(payload: MessageCreate):
    """Send a message via REST (fallback if WebSocket not available)."""
    from bson.errors import InvalidId
    
    try:
        sender_email = payload.sender_email
        receiver_email = payload.receiver_email
        content = payload.content.strip()
        
        if not sender_email or not receiver_email or not content:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        if sender_email == receiver_email:
            raise HTTPException(status_code=400, detail="Cannot send message to yourself")
        
        # Get or create conversation
        conversation_id = payload.conversation_id
        if not conversation_id:
            from messaging.service import get_or_create_conversation
            conv = await get_or_create_conversation(sender_email, receiver_email)
            conversation_id = str(conv["_id"])
        
        # Save message (with optional attachments)
        from messaging.service import save_message as save_msg
        attachments = payload.attachments if hasattr(payload, 'attachments') else None
        message = await save_msg(
            conversation_id=conversation_id,
            sender_email=sender_email,
            receiver_email=receiver_email,
            content=content,
            attachments=attachments,
        )
        
        logger.info(f"[REST API] Message saved: {sender_email} → {receiver_email}: {content[:50]}")
        
        return {
            "id": str(message["_id"]),
            "conversation_id": conversation_id,
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "content": content,
            "timestamp": message["timestamp"],
            "attachments": message.get("attachments", []),
            "read": False,
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    except Exception as e:
        logger.exception(f"[REST API] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read."""
    from bson.errors import InvalidId
    from messaging.service import mark_message_as_read
    
    try:
        message = await mark_message_as_read(message_id)
        return {
            "id": str(message["_id"]),
            "read": True,
            "read_at": message.get("read_at"),
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    except ValueError:
        raise HTTPException(status_code=404, detail="Message not found")


@fastapi_app.post("/api/uploads")
async def upload_file(file: UploadFile = File(...)):
    """Simple file upload endpoint. Accepts multipart/form-data with a file field named 'file'.
    Saves the file to the backend uploads directory and returns metadata including a public URL.
    """
    from fastapi import UploadFile, File
    try:
        if file is None:
            # FastAPI will normally validate; return error
            raise HTTPException(status_code=400, detail="No file provided")

        # sanitize and generate unique filename
        import uuid
        orig_name = file.filename
        ext = os.path.splitext(orig_name)[1]
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(uploads_dir, safe_name)

        content = await file.read()

        # Server-side validation: max size and allowed mime types
        # Allow larger uploads for recordings; 50 MB default for demo
        MAX_BYTES = 50 * 1024 * 1024  # 50 MB limit
        allowed_mimes = [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            # allow common webm/mp4 recording formats for call recordings
            "video/webm",
            "audio/webm",
            "video/mp4",
            "audio/mp4",
        ]

        if len(content) > MAX_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        mime = getattr(file, 'content_type', 'application/octet-stream')
        if mime not in allowed_mimes:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime}")

        with open(dest_path, "wb") as dest:
            dest.write(content)

        url = f"/uploads/{safe_name}"
        return {
            "filename": orig_name,
            "url": url,
            "size": len(content),
            "mime": mime,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[UPLOAD] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.get("/api/users/search")
async def search_users(q: str):
    """Search for all users (doctors/admins) by email or name to start conversation."""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    
    # Search all users (both admin and doctor roles)
    users = await users_collection.find({
        "$or": [
            {"email": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}},
        ]
    }).limit(10).to_list(None)
    
    return [
        {
            "email": user.get("email"),
            "full_name": user.get("full_name", user.get("email").split("@")[0]),
            "role": user.get("role"),
        }
        for user in users
    ]


@fastapi_app.get("/api/doctors", response_model=list[DoctorResponse])
async def get_doctors():
    """Get all registered doctors."""
    doctors = await users_collection.find({"role": "doctor"}).to_list(None)
    return [
        {
            "email": doc.get("email"),
            "full_name": doc.get("full_name", doc.get("email").split("@")[0]),
            "role": doc.get("role"),
            "avatar_url": doc.get("avatar_url"),
        }
        for doc in doctors
    ]


@fastapi_app.get("/api/messages/unread-count")
async def get_unread_count(user_email: str):
    """Get total unread message count for a user."""
    count = await messages_collection.count_documents({
        "receiver_email": user_email,
        "read": False
    })
    return {"unread_count": count}


# Setup WebSocket handlers
@fastapi_app.on_event("startup")
async def startup_event():
    """Initialize WebSocket handlers on startup."""
    await setup_websocket_handlers(sio)
    logger.info("[INFO] WebSocket handlers initialized")


@fastapi_app.get("/api/debug/connected-users")
async def debug_connected_users():
    """Dev-only endpoint: return current connected users mapping.

    WARNING: This endpoint exposes internal runtime state. Keep it for
    development only and secure or remove it in production.
    """
    try:
        from messaging.handlers import connected_users

        # Convert sets to lists for JSON serialization
        return {email: list(sids) for email, sids in connected_users.items()}
    except Exception as e:
        logger.exception(f"[DEBUG] Error returning connected_users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

