from enum import Enum
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
# Support both package-local and repo-root .env locations.
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

MODEL_NAME = os.getenv("LEGACY_UPGRADE_MODEL", "gemini-2.5-flash")
REPO_PATH = os.getenv("PATH_TO_REPO", "").strip().strip("\"'")


def _validate_repo_path_or_exit(repo_path: str) -> Path:
    if not repo_path:
        raise SystemExit(
            "PATH_TO_REPO is not set. Please provide a valid repository path in legacy_upgrade_system/.env before starting the agent."
        )

    resolved = Path(repo_path).expanduser().resolve(strict=False)
    if not resolved.exists() or not resolved.is_dir():
        raise SystemExit(
            f"PATH_TO_REPO is invalid: '{repo_path}'. Please provide a valid directory path in legacy_upgrade_system/.env and restart."
        )

    return resolved


RESOLVED_REPO_PATH = _validate_repo_path_or_exit(REPO_PATH)

class Stages(str, Enum):
    ANALYSIS = "repository_analysis"
    PLANNING = "upgrade_planning"
    EXECUTION = "upgrade_execution"
    COMPLETE = "complete"
    STAGES = [ANALYSIS, PLANNING, EXECUTION, COMPLETE]


class AgentName(str, Enum):
    ORCHESTRATOR = "legacy_upgrade_orchestrator"
    ANALYZER = "repository_analyzer"
    PLANNER = "upgrade_planner"
    EXECUTOR = "upgrade_executor"


class AgentFile(str, Enum):
    DESCRIPTION = "description"
    INSTRUCTION = "instruction"


class AgentOutputKey(str, Enum):
    REPOSITORY_ANALYSIS = "repository_analysis_output"
    UPGRADE_PLAN = "upgrade_planning_output"
    EXECUTION_LOG = "upgrade_execution_output"


class SessionStateKey(str, Enum):
    PROJECT_FOLDER = "project_folder"
    CURRENT_STAGE = "current_stage"
    ANALYSIS_APPROVED = "analysis_approved"
