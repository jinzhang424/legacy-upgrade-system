from enum import Enum

MODEL_NAME = "gemini-2.5-flash"


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
