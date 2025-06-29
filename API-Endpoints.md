# API Endpoints and Connections

This document outlines the API endpoints and real-time connections required for the application to function correctly.

## Backend API Endpoints

### Assistants

*   `POST /api/assistants`: Create a new assistant.
*   `GET /api/assistants`: Get a list of all assistants.
*   `GET /api/assistants/{id}`: Get a single assistant by its ID.
*   `PATCH /api/assistants/{id}`: Update an assistant.
*   `DELETE /api/assistants/{id}`: Delete an assistant.

### Chats

*   `POST /api/chats`: Create a new chat session.
*   `GET /api/chats`: Get a list of all chat sessions.
*   `GET /api/chats/{id}`: Get a single chat session by its ID.
*   `POST /api/chats/{id}/message`: Send a text message to a chat.
*   `POST /api/chats/{id}/voice-message`: Send a voice message to a chat.

### Calls

*   `POST /api/calls`: Create a new call.
*   `GET /api/calls`: Get a list of all calls.
*   `GET /api/calls/{id}`: Get a single call by its ID.

### Webhooks

*   `POST /api/webhooks/vapi`: The single endpoint to receive all webhooks from Vapi.

## WebSocket Connections

The frontend should establish a WebSocket connection to the backend to receive real-time updates. The following events are used:

*   `join_chat`: The client should emit this event with the `chatId` to join the corresponding chat room.
*   `new_message`: The server will emit this event to the client when a new message is received.
*   `call_status_update`: The server will emit this event to the client when the status of a call changes.
*   `call_transcript_update`: The server will emit this event to the client when the transcript for a call is available.
