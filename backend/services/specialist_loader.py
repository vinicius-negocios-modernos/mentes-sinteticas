import os
from pathlib import Path


def load_specialist_prompt(specialist_id: str) -> str:
    """Carrega o system prompt de um especialista"""

    base_path = Path(__file__).parent.parent / "specialists" / specialist_id
    prompt_file = base_path / "system_prompt.md"

    if not prompt_file.exists():
        raise ValueError(f"Especialista nao encontrado: {specialist_id}")

    with open(prompt_file, "r", encoding="utf-8") as f:
        return f.read()


def get_available_specialists() -> list:
    """Retorna lista de especialistas disponiveis"""

    specialists_dir = Path(__file__).parent.parent / "specialists"
    specialists = []

    for item in specialists_dir.iterdir():
        if item.is_dir() and (item / "system_prompt.md").exists():
            specialists.append({
                "id": item.name,
                "name": item.name.replace("_", " ").title(),
                "prompt_file": str(item / "system_prompt.md")
            })

    return specialists
