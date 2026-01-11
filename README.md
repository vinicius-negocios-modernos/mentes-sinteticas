# Mentes Sinteticas

Aplicacao de mentes sinteticas (clones) de especialistas para auxiliar empreendedores.

## Visao Geral

Plataforma que oferece acesso a clones de grandes nomes de marketing, gestao, negocios, vendas e empreendedorismo, utilizando IA para fornecer mentoria personalizada.

## Especialistas Disponiveis

- **Alex Hormozi** - Vendas, Ofertas, Crescimento de Negocios

## Stack Tecnologica

| Componente | Tecnologia |
|------------|------------|
| Frontend | Flutter Web |
| Backend | Python FastAPI |
| Hosting | Google Cloud Run |
| Auth | Firebase Auth |
| Database | Firestore |
| AI | Claude API (Anthropic) |
| RAG | Vertex AI (Google) |
| Storage | Google Cloud Storage |

## Estrutura do Projeto

```
mentes-sinteticas/
├── frontend/          # Flutter Web
├── backend/           # Python FastAPI
├── infrastructure/    # Terraform
├── docs/              # Documentacao
└── .github/           # CI/CD workflows
```

## Setup Local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
flutter pub get
flutter run -d chrome
```

## Variaveis de Ambiente

```env
# Backend
ANTHROPIC_API_KEY=your_key
GOOGLE_CLOUD_PROJECT=your_project
FIREBASE_CREDENTIALS=path_to_credentials.json

# Frontend
API_URL=http://localhost:8000
```

## API Endpoints

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | /chat | Enviar mensagem para especialista |
| GET | /history | Obter historico de conversas |
| GET | /subscription | Status da assinatura |

## Licenca

Proprietario - Todos os direitos reservados
