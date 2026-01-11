from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os

from services.claude_service import ClaudeService
from services.rag_service import RAGService

router = APIRouter()

claude_service = ClaudeService()
rag_service = RAGService()


class ChatMessage(BaseModel):
    message: str
    specialist_id: str = "alex_hormozi"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    specialist_id: str


@router.post("/send")
async def send_message(data: ChatMessage):
    """Envia mensagem para o especialista e recebe resposta"""
    try:
        # Buscar contexto relevante via RAG
        context = await rag_service.search_context(
            query=data.message,
            specialist_id=data.specialist_id
        )

        # Gerar resposta com Claude
        response = await claude_service.generate_response(
            message=data.message,
            specialist_id=data.specialist_id,
            context=context,
            session_id=data.session_id
        )

        return ChatResponse(
            response=response["content"],
            session_id=response["session_id"],
            specialist_id=data.specialist_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_message(data: ChatMessage):
    """Envia mensagem e recebe resposta em streaming"""
    try:
        context = await rag_service.search_context(
            query=data.message,
            specialist_id=data.specialist_id
        )

        return StreamingResponse(
            claude_service.stream_response(
                message=data.message,
                specialist_id=data.specialist_id,
                context=context,
                session_id=data.session_id
            ),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """Retorna historico de mensagens de uma sessao"""
    # TODO: Implementar com Firestore
    return {
        "session_id": session_id,
        "messages": []
    }
