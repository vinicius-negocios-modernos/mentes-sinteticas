import os
import json
import uuid
from typing import Optional, AsyncGenerator
from anthropic import Anthropic

from services.specialist_loader import load_specialist_prompt


class ClaudeService:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-20250514"

    async def generate_response(
        self,
        message: str,
        specialist_id: str,
        context: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> dict:
        """Gera resposta usando Claude API"""

        system_prompt = load_specialist_prompt(specialist_id)

        # Adicionar contexto RAG se disponivel
        if context:
            system_prompt += f"\n\n## Contexto Relevante\n{context}"

        # Gerar session_id se nao existir
        if not session_id:
            session_id = str(uuid.uuid4())

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": message}
            ]
        )

        return {
            "content": response.content[0].text,
            "session_id": session_id,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }

    async def stream_response(
        self,
        message: str,
        specialist_id: str,
        context: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Gera resposta em streaming"""

        system_prompt = load_specialist_prompt(specialist_id)

        if context:
            system_prompt += f"\n\n## Contexto Relevante\n{context}"

        if not session_id:
            session_id = str(uuid.uuid4())

        with self.client.messages.stream(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": message}
            ]
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text, 'session_id': session_id})}\n\n"

        yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
