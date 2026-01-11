from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import auth, chat, subscription

load_dotenv()

app = FastAPI(
    title="Mentes Sinteticas API",
    description="API para clones de especialistas com IA",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em producao, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(subscription.router, prefix="/subscription", tags=["subscription"])


@app.get("/")
async def root():
    return {
        "message": "Mentes Sinteticas API",
        "version": "0.1.0",
        "status": "online"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
