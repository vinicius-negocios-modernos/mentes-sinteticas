from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter()


class TokenValidation(BaseModel):
    token: str


@router.post("/validate")
async def validate_token(data: TokenValidation):
    """Valida token do Firebase Auth"""
    # TODO: Implementar validacao com Firebase Admin SDK
    return {"valid": True, "user_id": "placeholder"}


@router.get("/me")
async def get_current_user():
    """Retorna dados do usuario atual"""
    # TODO: Implementar com Firebase Auth
    return {
        "user_id": "placeholder",
        "email": "user@example.com",
        "name": "Usuario Teste"
    }
