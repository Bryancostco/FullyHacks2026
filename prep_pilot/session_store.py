"""
Shared session state — imported by both main.py and openaivoice.py
to avoid circular imports. This is the single source of truth for
all active session data during the server's lifetime.
"""

active_sessions: dict[str, dict] = {}  # session_id → session data, resets on server restart
