from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from google.adk.agents.callback_context import CallbackContext
from google.genai import types

from .data import AgentOutputKey, SessionStateKey, Stages

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

_QUOTED_PATTERN = re.compile(r"[\"']([^\"']+)[\"']")
_WINDOWS_PATH_PATTERN = re.compile(r"[A-Za-z]:[\\/][^\n\r\"']+")
_RELATIVE_PATH_PATTERN = re.compile(r"(?:\.\.?[\\/]|/)[^\n\r\"']+")
_ANALYSIS_COMPLETE_TOKEN = "ANALYSIS_COMPLETE"
_NEGATED_ACCEPT_PATTERN = re.compile(
    r"\b(?:don't|do not|not|no)\b[\w\s]{0,20}\b(?:accept|approve|proceed|move on|go ahead)\b",
    flags=re.IGNORECASE,
)
_NO_CHANGE_PATTERN = re.compile(
    r"\b(?:no|none|without)\s+changes?\b",
    flags=re.IGNORECASE,
)
_ACCEPT_ANALYSIS_PATTERNS = [
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in [
        r"\baccept(?:ed|ance)?\b",
        r"\bapprove(?:d|s)?\b",
        r"\blooks?\s+good\b",
        r"\bgo\s+ahead\b",
        r"\bproceed\b",
        r"\bmove\s+on\b",
    ]
]
_REVISE_ANALYSIS_PATTERNS = [
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in [
        r"\brevise\b",
        r"\bupdate\b",
        r"\bmodify\b",
        r"\badjust\b",
        r"\bchange(?:s|d)?\b",
        r"\breanaly(?:ze|sis)\b",
        r"\banaly(?:ze|sis)\s+again\b",
    ]
]


def _assistant_text(text: str) -> types.Content:
    return types.Content(role="model", parts=[types.Part(text=text)])


def _extract_user_text(user_content: Optional[types.Content]) -> str:
    if not user_content or not user_content.parts:
        return ""

    text_parts: list[str] = []
    for part in user_content.parts:
        part_text = getattr(part, "text", None)
        if part_text:
            text_parts.append(part_text)
    return "\n".join(text_parts).strip()


def _normalize_candidate(raw_value: str) -> str:
    return raw_value.strip().strip("` ").strip("\"'").rstrip(".,;:")


def _analysis_is_complete(callback_context: CallbackContext) -> bool:
    analysis_output = callback_context.state.get(AgentOutputKey.REPOSITORY_ANALYSIS.value)
    if not isinstance(analysis_output, str):
        return False
    return _ANALYSIS_COMPLETE_TOKEN in analysis_output


def _is_analysis_accepted(user_text: str) -> bool:
    if not user_text:
        return False
    if _NEGATED_ACCEPT_PATTERN.search(user_text):
        return False
    return any(pattern.search(user_text) for pattern in _ACCEPT_ANALYSIS_PATTERNS)


def _is_analysis_revision_request(user_text: str) -> bool:
    if not user_text:
        return False
    if _NO_CHANGE_PATTERN.search(user_text):
        return False
    return any(pattern.search(user_text) for pattern in _REVISE_ANALYSIS_PATTERNS)


def _candidate_paths_from_text(user_text: str) -> list[str]:
    candidates: list[str] = []

    if user_text:
        candidates.append(user_text)

    for line in user_text.splitlines():
        if line.strip():
            candidates.append(line.strip())

    candidates.extend(_QUOTED_PATTERN.findall(user_text))
    candidates.extend(_WINDOWS_PATH_PATTERN.findall(user_text))
    candidates.extend(_RELATIVE_PATH_PATTERN.findall(user_text))

    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        normalized = _normalize_candidate(candidate)
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)

    return deduped


def _resolve_candidate_path(candidate: str) -> Path:
    candidate_path = Path(candidate)
    if candidate_path.is_absolute():
        return candidate_path.resolve(strict=False)
    return (WORKSPACE_ROOT / candidate_path).resolve(strict=False)

# The above functions are just helpers to resolve the project folder path

def require_project_folder_guardrail(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    project_folder = callback_context.state.get(SessionStateKey.PROJECT_FOLDER.value)
    if project_folder:
        return None

    user_text = _extract_user_text(callback_context.user_content)

    for candidate in _candidate_paths_from_text(user_text):
        resolved_path = _resolve_candidate_path(candidate)
        if resolved_path.exists() and resolved_path.is_dir():

            callback_context.state[SessionStateKey.PROJECT_FOLDER.value] = str(resolved_path)
            callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.ANALYSIS.value
            return None

    return _assistant_text(
        "Before we start, provide the project folder path to upgrade. "
        "Use an absolute path or a workspace-relative path. "
        "I will keep asking until a valid folder is found."
    )


def prepare_analysis_review_guardrail(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.ANALYSIS.value
    callback_context.state[SessionStateKey.ANALYSIS_APPROVED.value] = False
    return None


def enforce_analysis_review_guardrail(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    current_stage = callback_context.state.get(SessionStateKey.CURRENT_STAGE.value)
    if current_stage and current_stage != Stages.ANALYSIS.value:
        return None

    if not _analysis_is_complete(callback_context):
        callback_context.state[SessionStateKey.ANALYSIS_APPROVED.value] = False
        return None

    user_text = _extract_user_text(callback_context.user_content)
    if _is_analysis_revision_request(user_text):
        callback_context.state[SessionStateKey.ANALYSIS_APPROVED.value] = False
        callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.ANALYSIS.value
        return None

    if _is_analysis_accepted(user_text):
        callback_context.state[SessionStateKey.ANALYSIS_APPROVED.value] = True
        callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.PLANNING.value
        return None

    if callback_context.state.get(SessionStateKey.ANALYSIS_APPROVED.value):
        callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.PLANNING.value
        return None

    callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.ANALYSIS.value
    return _assistant_text(
        "Repository analysis is complete and waiting for your review. "
        "Reply with 'accept analysis' to continue to planning, or provide specific "
        "analysis changes and I will re-run repository analysis."
    )


def require_analysis_approval_before_planning_guardrail(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    if not _analysis_is_complete(callback_context):
        callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.ANALYSIS.value
        return _assistant_text(
            "Upgrade planning is blocked until repository analysis reports ANALYSIS_COMPLETE."
        )

    if not callback_context.state.get(SessionStateKey.ANALYSIS_APPROVED.value):
        callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.ANALYSIS.value
        return _assistant_text(
            "Repository analysis is awaiting user approval. "
            "Ask the user to review it, accept it, or request changes before planning."
        )

    callback_context.state[SessionStateKey.CURRENT_STAGE.value] = Stages.PLANNING.value
    return None
