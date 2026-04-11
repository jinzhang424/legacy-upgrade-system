from __future__ import annotations

from google.adk.agents.llm_agent import LlmAgent

from .data import AgentFile, AgentName, AgentOutputKey, MODEL_NAME
from .gitnexus_tools import (
    gitnexus_analysis_mcp_toolset,
    gitnexus_analyze_repository,
    gitnexus_orchestrator_mcp_toolset,
)
from .guardrails import require_project_folder_guardrail
from .guardrails import (
    enforce_analysis_review_guardrail,
    prepare_analysis_review_guardrail,
    require_analysis_approval_before_planning_guardrail,
)
from .utils import read_md_file
from .usage_tracker import (
    before_agent_callback, 
    before_tool_callback, 
    after_tool_callback, 
    after_model_callback, 
    after_agent_callback
)

repository_analyzer = LlmAgent(
    model=MODEL_NAME,
    name=AgentName.ANALYZER.value,
    description=read_md_file(AgentName.ANALYZER.value, AgentFile.DESCRIPTION.value),
    instruction=read_md_file(AgentName.ANALYZER.value, AgentFile.INSTRUCTION.value),
    output_key=AgentOutputKey.REPOSITORY_ANALYSIS.value,
    tools=[
        gitnexus_analysis_mcp_toolset,
    ],
    before_agent_callback=[
        require_project_folder_guardrail,
        prepare_analysis_review_guardrail,
        before_agent_callback,
    ],
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
    after_model_callback=after_model_callback,
    after_agent_callback=after_agent_callback,
)

upgrade_planner = LlmAgent(
    model=MODEL_NAME,
    name=AgentName.PLANNER.value,
    description=read_md_file(AgentName.PLANNER.value, AgentFile.DESCRIPTION.value),
    instruction=read_md_file(AgentName.PLANNER.value, AgentFile.INSTRUCTION.value),
    output_key=AgentOutputKey.UPGRADE_PLAN.value,
    before_agent_callback=[
        require_analysis_approval_before_planning_guardrail,
        before_agent_callback,
    ],
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
    after_model_callback=after_model_callback,
    after_agent_callback=after_agent_callback,
)

upgrade_executor = LlmAgent(
    model=MODEL_NAME,
    name=AgentName.EXECUTOR.value,
    description=read_md_file(AgentName.EXECUTOR.value, AgentFile.DESCRIPTION.value),
    instruction=read_md_file(AgentName.EXECUTOR.value, AgentFile.INSTRUCTION.value),
    output_key=AgentOutputKey.EXECUTION_LOG.value,
    before_agent_callback=before_agent_callback,
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
    after_model_callback=after_model_callback,
    after_agent_callback=after_agent_callback,
)

legacy_upgrade_orchestrator = LlmAgent(
    model=MODEL_NAME,
    name=AgentName.ORCHESTRATOR.value,
    description=read_md_file(AgentName.ORCHESTRATOR.value, AgentFile.DESCRIPTION.value),
    instruction=read_md_file(AgentName.ORCHESTRATOR.value, AgentFile.INSTRUCTION.value),
    tools=[
        gitnexus_analyze_repository,
        gitnexus_orchestrator_mcp_toolset,
    ],
    before_agent_callback=[
        require_project_folder_guardrail,
        enforce_analysis_review_guardrail,
        before_agent_callback,
    ],
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
    after_model_callback=after_model_callback,
    after_agent_callback=after_agent_callback,
    sub_agents=[repository_analyzer, upgrade_planner, upgrade_executor],
)

root_agent = legacy_upgrade_orchestrator
