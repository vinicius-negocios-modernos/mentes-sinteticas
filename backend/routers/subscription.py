from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class SubscriptionStatus(BaseModel):
    plan: str
    status: str
    messages_used: int
    messages_limit: Optional[int]
    valid_until: str


@router.get("/status")
async def get_subscription_status():
    """Retorna status da assinatura do usuario"""
    # TODO: Implementar com Firestore
    return SubscriptionStatus(
        plan="starter",
        status="active",
        messages_used=0,
        messages_limit=100,
        valid_until="2025-12-31"
    )


@router.get("/plans")
async def get_available_plans():
    """Retorna planos disponiveis"""
    return {
        "plans": [
            {
                "id": "starter",
                "name": "Starter",
                "price_monthly": 97,
                "price_yearly": 970,
                "messages_limit": 100,
                "specialists": ["alex_hormozi"],
                "features": [
                    "1 especialista",
                    "100 mensagens/mes",
                    "Historico de conversas"
                ]
            },
            {
                "id": "pro",
                "name": "Pro",
                "price_monthly": 297,
                "price_yearly": 2970,
                "messages_limit": None,
                "specialists": "all",
                "features": [
                    "Todos os especialistas",
                    "Mensagens ilimitadas",
                    "Historico completo",
                    "API propria (opcional)"
                ]
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price_monthly": None,
                "price_yearly": None,
                "messages_limit": None,
                "specialists": "all",
                "features": [
                    "Tudo do Pro",
                    "API propria inclusa",
                    "White label",
                    "Especialistas customizados",
                    "Suporte prioritario"
                ]
            }
        ]
    }
