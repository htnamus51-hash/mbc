from pydantic import BaseModel, EmailStr
from typing import Literal


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    role: Literal["admin", "doctor"]
    message: str
    access_token: str | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["admin", "doctor"]


class SimpleMessage(BaseModel):
    message: str


class AppointmentCreate(BaseModel):
    doctor: str
    datetime: str
    purpose: str
    client: str = "TBD"
    duration: int = 60


class AppointmentResponse(BaseModel):
    id: str
    doctor: str
    datetime: str
    purpose: str
    client: str
    duration: int = 60
    status: str = "scheduled"


class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None


class ClientResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None


class WebsiteRegistrationCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    message: str | None = None
    source: str = "mbctherapy.com"


class WebsiteRegistrationResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str | None = None
    message: str | None = None
    source: str
    status: str  # new, pending, verified
    created_at: str


class NoteCreate(BaseModel):
    note_type: str  # Progress Note, Intake Form, Session Summary, etc.
    content: str
    client_id: str | None = None  # Optional: link to a specific client
    reminder_date: str | None = None  # Reminder date (YYYY-MM-DD)
    reminder_time: str | None = None  # Reminder time (HH:MM)


class NoteResponse(BaseModel):
    id: str
    note_type: str
    content: str
    client_id: str | None = None
    reminder_date: str | None = None
    reminder_time: str | None = None
    created_at: str
    created_by: str = "Dr. Admin"
    completed: bool = False


class DoctorResponse(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    avatar_url: str | None = None


class TaskCreate(BaseModel):
    task: str
    type: Literal["note", "form", "message", "document"]
    priority: Literal["high", "medium", "low"]
    client_id: str | None = None


class TaskResponse(BaseModel):
    id: str
    task: str
    type: str
    priority: str
    completed: bool
    created_at: str
    client_id: str | None = None


# ==================== MESSAGING SCHEMAS ====================


class UserProfile(BaseModel):
    email: str
    full_name: str
    role: Literal["admin", "doctor"]
    user_type: Literal["admin", "doctor"]
    avatar_url: str | None = None


class MessageCreate(BaseModel):
    sender_email: str  # Email of the person sending (from localStorage)
    receiver_email: str
    content: str
    conversation_id: str | None = None  # If None, create new conversation
    attachments: list[dict] | None = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_email: str
    receiver_email: str
    content: str
    timestamp: str
    read: bool
    read_at: str | None = None
    attachments: list[dict] | None = None


class ConversationResponse(BaseModel):
    id: str
    participants: list[str]
    type: Literal["admin-admin", "doctor-doctor", "admin-doctor"]
    created_at: str
    updated_at: str
    last_message_at: str | None = None
    unread_count: int = 0


class ConversationDetailResponse(BaseModel):
    id: str
    participants: list[str]
    type: Literal["admin-admin", "doctor-doctor", "admin-doctor"]
    created_at: str
    updated_at: str
    messages: list[MessageResponse]


