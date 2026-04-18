import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from .agent import legacy_upgrade_orchestrator
from .data import RESOLVED_REPO_PATH, SessionStateKey, Stages

async def main():
    session_service = InMemorySessionService()
    resolved = RESOLVED_REPO_PATH
    print(f"✅ Using PATH_TO_REPO from .env: {resolved}")

    # Pre-populate session state with the folder
    session = await session_service.create_session(
        app_name="legacy_upgrader",
        user_id="user",
        state={
            SessionStateKey.PROJECT_FOLDER.value: str(resolved),
            SessionStateKey.CURRENT_STAGE.value: Stages.ANALYSIS.value,
        }
    )

    runner = Runner(
        agent=legacy_upgrade_orchestrator,
        app_name="legacy_upgrader",
        session_service=session_service,
    )

    print(f"✅ Project folder set to: {resolved}")
    print("Starting agent...\n")

    # Now start the agent loop normally
    async for event in runner.run_async(
        user_id="user",
        session_id=session.id,
        new_message="Begin the upgrade process.",
    ):
        if event.content:
            print(event.content)

asyncio.run(main())