import os
from typing import Optional


class RAGService:
    """Servico de Retrieval Augmented Generation usando Vertex AI"""

    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        # TODO: Inicializar cliente Vertex AI

    async def search_context(
        self,
        query: str,
        specialist_id: str,
        top_k: int = 3
    ) -> Optional[str]:
        """Busca contexto relevante na knowledge base do especialista"""

        # TODO: Implementar busca semantica com Vertex AI
        # 1. Gerar embedding da query
        # 2. Buscar documentos similares no Cloud Storage
        # 3. Retornar contexto relevante

        # Por enquanto, retorna None (sem RAG)
        # O sistema funciona apenas com o system prompt
        return None

    async def index_document(
        self,
        content: str,
        specialist_id: str,
        metadata: dict
    ) -> bool:
        """Indexa documento na knowledge base"""

        # TODO: Implementar indexacao
        # 1. Chunkar documento
        # 2. Gerar embeddings
        # 3. Salvar no Cloud Storage com metadata

        return True
