from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def read_md_file(agent_name: str, fileName: str) -> str:
    path = BASE_DIR / "agent-instructions" / agent_name / f"{fileName}.md"
    return path.read_text(encoding="utf-8")