# usage_tracker.py
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse
from google.adk.tools import BaseTool, ToolContext


@dataclass
class ToolStats:
    calls: int = 0
    failures: int = 0
    total_duration_ms: float = 0.0

    @property
    def avg_duration_ms(self) -> float:
        return self.total_duration_ms / self.calls if self.calls else 0.0


@dataclass
class AgentStats:
    name: str
    llm_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    tool_stats: dict[str, ToolStats] = field(
        default_factory=lambda: defaultdict(ToolStats)
    )

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    def print_summary(self) -> None:
        print(f"\n========== [{self.name}] STATS ==========", flush=True)
        print(f"  LLM Calls    : {self.llm_calls}", flush=True)
        print(f"  Input tokens : {self.input_tokens}", flush=True)
        print(f"  Output tokens: {self.output_tokens}", flush=True)
        print(f"  Total tokens : {self.total_tokens}", flush=True)
        if self.tool_stats:
            print("  --- Tools ---", flush=True)
            for tool_name, stats in self.tool_stats.items():
                print(
                    f"    {tool_name}: {stats.calls} calls "
                    f"({stats.failures} failures) "
                    f"avg {stats.avg_duration_ms:.0f}ms",
                    flush=True,
                )
        print("==========================================\n", flush=True)


@dataclass
class UsageTracker:
    _agent_stats: dict[str, AgentStats] = field(
        default_factory=dict, repr=False
    )
    _tool_start_times: dict[str, float] = field(
        default_factory=dict, repr=False
    )

    def get_or_create(self, agent_name: str) -> AgentStats:
        if agent_name not in self._agent_stats:
            self._agent_stats[agent_name] = AgentStats(name=agent_name)
        return self._agent_stats[agent_name]

    def print_global_summary(self) -> None:
        print("\n========== GLOBAL SUMMARY ==========", flush=True)
        for stats in self._agent_stats.values():
            print(
                f"  {stats.name}: {stats.llm_calls} LLM calls, "
                f"{stats.total_tokens} tokens total",
                flush=True,
            )
        grand_total = sum(s.total_tokens for s in self._agent_stats.values())
        print(f"  TOTAL TOKENS: {grand_total}", flush=True)
        print("====================================\n", flush=True)


tracker = UsageTracker()


# ── Callbacks ────────────────────────────────────────────────────────────────

def before_agent_callback(callback_context: CallbackContext) -> None:
    agent_name = callback_context.agent_name
    print(f"\n[AGENT] ▶ {agent_name} starting...", flush=True)
    return None


def after_agent_callback(callback_context: CallbackContext) -> None:
    agent_name = callback_context.agent_name
    print(f"[AGENT] ■ {agent_name} finished", flush=True)
    tracker.get_or_create(agent_name).print_summary()
    return None


def after_model_callback(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> None:
    agent_name = callback_context.agent_name
    stats = tracker.get_or_create(agent_name)
    stats.llm_calls += 1

    usage = llm_response.usage_metadata
    if usage:
        stats.input_tokens += usage.prompt_token_count or 0
        stats.output_tokens += usage.candidates_token_count or 0

    print(
        f"[LLM] {agent_name} call #{stats.llm_calls} — "
        f"in: {usage.prompt_token_count or 0}, "
        f"out: {usage.candidates_token_count or 0} | "
        f"agent total: {stats.total_tokens} tokens",
        flush=True,
    )
    return None


def before_tool_callback(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
) -> None:
    tracker._tool_start_times[tool.name] = time.monotonic()
    print(f"[TOOL] → {tool.name} | args: {args}", flush=True)
    return None


def after_tool_callback(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
    tool_response: dict,
) -> None:
    agent_name = tool_context.agent_name
    tool_stats = tracker.get_or_create(agent_name).tool_stats[tool.name]
    tool_stats.calls += 1

    start = tracker._tool_start_times.pop(tool.name, None)
    if start:
        tool_stats.total_duration_ms += (time.monotonic() - start) * 1000

    if isinstance(tool_response, dict) and not tool_response.get("ok", True):
        tool_stats.failures += 1
        print(f"[TOOL] ✗ {tool.name} failed | {tool_response.get('error', '')}", flush=True)
    else:
        print(
            f"[TOOL] ✓ {tool.name} done | "
            f"{tool_stats.calls} calls, avg {tool_stats.avg_duration_ms:.0f}ms",
            flush=True,
        )
    return None