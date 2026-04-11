import asyncio
from pathlib import Path
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

async def main():
    session_service = InMemorySessionService()
    
    # Ask for folder BEFORE starting the agent
    while True:
        folder = input("Please enter your project folder path: ").strip()
        resolved = Path(folder).expanduser().resolve()
        if resolved.exists() and resolved.is_dir():
            break
        print(f"❌ '{folder}' is not a valid directory. Please try again.")

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