"""
Task Chatbot AI Service.

Conversational AI that answers user questions about task data only.
Uses the same LLM infrastructure (OpenRouter) as the other chatbots.
Falls back to rule-based responses when AI is unavailable.
"""
from openai import OpenAI
from app.core.config import settings

_openrouter_available = False
_openrouter_client = None

try:
    if settings.OPENROUTER_API_KEY:
        _openrouter_available = True
    else:
        print("[task_chatbot] OPENROUTER_API_KEY is not set — OpenRouter AI features will use rule-based fallback")
except Exception as e:
    _openrouter_available = False
    print(f"[task_chatbot] OpenRouter configuration check failed — fallback enabled. Error: {e}")


def _normalize_openrouter_base_url(base_url: str) -> str:
    url = (base_url or "").strip()
    if url.endswith("/"):
        url = url[:-1]
    if url.startswith("https://api.openrouter.ai"):
        url = url.replace("https://api.openrouter.ai", "https://openrouter.ai/api")
    if url == "https://openrouter.ai/v1":
        url = "https://openrouter.ai/api/v1"
    return url


def _get_openrouter_client() -> OpenAI:
    global _openrouter_client
    if _openrouter_client is None:
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is not configured. Set it in your .env file.")

        base_url = _normalize_openrouter_base_url(settings.OPENROUTER_BASE_URL)
        if not base_url:
            raise ValueError("OPENROUTER_BASE_URL is not configured. Set it in your .env file.")

        print(f"[task_chatbot] OpenRouter base_url={base_url}")
        _openrouter_client = OpenAI(
            base_url=base_url,
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "https://business-suite.local",
                "X-Title": "Business Suite - Task Assistant",
            },
        )
    return _openrouter_client


def _call_llm(prompt: str) -> str | None:
    """Call the configured LLM and return the raw text response, or None on failure."""
    if _openrouter_available:
        try:
            client = _get_openrouter_client()
            normalized_base_url = _normalize_openrouter_base_url(settings.OPENROUTER_BASE_URL)
            print(f"[task_chatbot] Sending OpenRouter request to {normalized_base_url}")
            response = client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000,
            )
            text = response.choices[0].message.content.strip() if response and response.choices else None
            print(f"[task_chatbot] OpenRouter request sent. Raw response: {text!r}")
            return text or None
        except Exception as e:
            print(f"[task_chatbot] OpenRouter call error ({type(e).__name__}): {e}")
            if getattr(e, '__cause__', None):
                print(f"[task_chatbot] OpenRouter root cause: {type(e.__cause__).__name__}: {e.__cause__}")

    return None


# ──────────────────────────────────────────────
# System prompt
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """You are a helpful task management assistant for Business Suite. You ONLY answer questions about the task data provided below.

If the user asks about something outside task management (e.g. HR, CRM, accounting, recruitment), politely say you can only assist with task-related questions.

Available task data categories:
- Tasks (with title, description, status, priority, assignee, due date, reason note)
- Employees (team members with names, departments, designations — can be assignees)
- Task activities / audit trail (status changes, comments, assignments)
- Task comments (with user names and @mentions)
- Sub-tasks / checklist items (with completion status)
- Task dependencies (blocked by / blocking relationships)
- Task notifications (mentions, status change alerts)

Rules:
- Answer conversationally and helpfully
- Keep answers concise but informative
- If you don't have data on something, suggest what the user can do in the Tasks module
- Use data provided below to give specific, accurate answers
- Never make up data — if the data says "No records" or "None", say so
- You can answer questions about task statuses, priorities, due dates, assignees, comments, activities, subtasks, and dependencies"""


# ──────────────────────────────────────────────
# Data summarizers
# ──────────────────────────────────────────────


def _summarize_tasks(tasks: list[dict]) -> str:
    if not tasks:
        return "No tasks in the system."
    lines = []
    for t in tasks[:30]:
        status = t.get("status", "N/A")
        priority = t.get("priority", "N/A")
        assignee = t.get("assignee_name") or t.get("assignee", "Unassigned")
        due = str(t.get("due_date", ""))[:10] if t.get("due_date") else "No due date"
        lines.append(
            f"- {t.get('title', 'Untitled')} | Status: {status} | Priority: {priority} | "
            f"Assignee: {assignee} | Due: {due}"
        )
    if len(tasks) > 30:
        lines.append(f"... and {len(tasks) - 30} more")
    return "\n".join(lines)


def _summarize_employees(employees: list[dict]) -> str:
    if not employees:
        return "No employees / team members available."
    lines = []
    for emp in employees[:20]:
        dept = emp.get("department", "") or "N/A"
        lines.append(f"- {emp.get('name', 'Unknown')} | Dept: {dept} | Email: {emp.get('email', '-')}")
    if len(employees) > 20:
        lines.append(f"... and {len(employees) - 20} more")
    return "\n".join(lines)


def _summarize_activities(activities: list[dict]) -> str:
    if not activities:
        return "No recent activity."
    lines = []
    for a in activities[:15]:
        user = a.get("user_name", "System")
        lines.append(f"- {user} {a.get('action', 'updated')} {a.get('field_name', '')} — {str(a.get('created_at', ''))[:16]}")
    if len(activities) > 15:
        lines.append(f"... and {len(activities) - 15} more")
    return "\n".join(lines)


def _summarize_comments(comments: list[dict]) -> str:
    if not comments:
        return "No comments."
    lines = []
    for c in comments[:15]:
        content = (c.get("content", "") or "")[:100]
        user = c.get("user_name", "Unknown")
        lines.append(f"- {user}: \"{content}\"")
    if len(comments) > 15:
        lines.append(f"... and {len(comments) - 15} more")
    return "\n".join(lines)


def _summarize_subtasks(subtasks: list[dict]) -> str:
    if not subtasks:
        return "No subtask / checklist data."
    total = len(subtasks)
    completed = sum(1 for s in subtasks if s.get("completed"))
    lines = [f"Total: {total} subtasks, {completed} completed ({round(completed/total*100)}% done)" if total > 0 else "No subtasks"]
    for s in subtasks[:15]:
        status_icon = "✅" if s.get("completed") else "⬜"
        lines.append(f"  {status_icon} {s.get('title', 'Untitled')}")
    return "\n".join(lines)


def _summarize_dependencies(dependencies: list[dict]) -> str:
    if not dependencies:
        return "No dependency data available."
    blocked_by = dependencies.get("blocked_by", [])
    blocking = dependencies.get("blocking", [])
    lines = []
    if blocked_by:
        lines.append(f"Blocked by ({len(blocked_by)}):")
        for d in blocked_by[:5]:
            lines.append(f"  - {d.get('title', 'Unknown task')} ({d.get('status', 'N/A')})")
    if blocking:
        lines.append(f"Blocking ({len(blocking)}):")
        for d in blocking[:5]:
            lines.append(f"  - {d.get('title', 'Unknown task')} ({d.get('status', 'N/A')})")
    return "\n".join(lines)


def _summarize_notifications(notifications: list[dict]) -> str:
    if not notifications:
        return "No notifications."
    lines = []
    for n in notifications[:10]:
        read_str = "📖" if n.get("read") else "🔴"
        lines.append(f"  {read_str} {n.get('message', '')[:100]}")
    return "\n".join(lines)


# ──────────────────────────────────────────────
# Data-driven fallback for simple queries
# ──────────────────────────────────────────────


def _task_chatbot_data_fallback(
    message: str,
    tasks: list[dict],
    employees: list[dict],
    activities: list[dict],
    comments: list[dict],
    subtasks: list[dict],
    dependencies: list[dict],
    notifications: list[dict],
) -> str | None:
    """Try to answer simple, data-driven task questions without AI.
    Returns a string answer when the query can be satisfied from the provided
    data, otherwise returns None to allow higher-level fallback.
    """
    q = (message or "").strip().lower()

    # ── Count queries ──
    if q.startswith("how many") or q.startswith("count") or "how many" in q:
        # Priority-specific counts
        if "priority" in q or "urgent" in q or "important" in q or "critical" in q:
            if "high" in q:
                count = sum(1 for t in tasks if t.get("priority") == "HIGH")
                return f"There are {count} high priority task(s)."
            if "urgent" in q:
                count = sum(1 for t in tasks if t.get("priority") == "URGENT")
                return f"There are {count} urgent task(s)."
            if "medium" in q:
                count = sum(1 for t in tasks if t.get("priority") == "MEDIUM")
                return f"There are {count} medium priority task(s)."
            if "low" in q:
                count = sum(1 for t in tasks if t.get("priority") == "LOW")
                return f"There are {count} low priority task(s)."

        if "task" in q:
            status_filter = None
            if "todo" in q or "pending" in q:
                status_filter = "TODO"
            elif "progress" in q or "in progress" in q:
                status_filter = "ON_PROGRESS"
            elif "hold" in q:
                status_filter = "ON_HOLD"
            elif "review" in q:
                status_filter = "ON_REVIEW"
            elif "completed" in q or "done" in q:
                status_filter = "COMPLETED"
            elif "overdue" in q:
                status_filter = "OVERDUE"

            if status_filter:
                count = sum(1 for t in tasks if t.get("status") == status_filter)
                label = status_filter.replace("_", " ").title()
                return f"There are {count} task(s) with status '{label}'."
            return f"There are {len(tasks)} task(s) total."

        if "employee" in q or "member" in q or "people" in q or "team" in q or "assignee" in q:
            return f"There are {len(employees)} employee(s) / team member(s)."

        if "comment" in q:
            return f"There are {len(comments)} comment(s) on tasks."

        if "subtask" in q or "checklist" in q or "sub-task" in q:
            return f"There are {len(subtasks)} subtask(s) / checklist items."

        if "notification" in q or "alert" in q:
            return f"There are {len(notifications)} notification(s)."

        if "activit" in q:
            return f"There are {len(activities)} activity log entries."

    # ── List / Show queries ──
    if any(word in q for word in ["list", "show", "what", "which", "who", "all"]):
        if "task" in q or "overdue" in q:
            # Filter by status if mentioned
            status_filter = None
            if "overdue" in q:
                status_filter = "OVERDUE"
            elif "todo" in q or "pending" in q:
                status_filter = "TODO"
            elif "progress" in q:
                status_filter = "ON_PROGRESS"
            elif "completed" in q or "done" in q:
                status_filter = "COMPLETED"

            filtered = [t for t in tasks if not status_filter or t.get("status") == status_filter]
            if not filtered:
                label = status_filter.replace("_", " ").title() if status_filter else ""
                return f"No {label.lower()} tasks found." if label else "No tasks found."

            lines = [f"Tasks ({len(filtered)}):"]
            for t in filtered[:10]:
                assignee = t.get("assignee_name") or "Unassigned"
                due = str(t.get("due_date", ""))[:10] if t.get("due_date") else "No due date"
                lines.append(f"- {t.get('title', 'Untitled')} | Assignee: {assignee} | Due: {due}")
            if len(filtered) > 10:
                lines.append(f"... and {len(filtered) - 10} more")
            return "\n".join(lines)

        if "employee" in q or "member" in q or "assignee" in q:
            if not employees:
                return "No team members found."
            lines = ["Team members:"]
            for emp in employees:
                lines.append(f"- {emp.get('name', 'Unknown')} ({emp.get('department', 'N/A')})")
            return "\n".join(lines)

    # ── Priority queries ──
    if "priority" in q:
        if "high" in q:
            count = sum(1 for t in tasks if t.get("priority") == "HIGH")
            return f"There are {count} high priority task(s)."
        if "urgent" in q:
            count = sum(1 for t in tasks if t.get("priority") == "URGENT")
            return f"There are {count} urgent task(s)."
        if "medium" in q:
            count = sum(1 for t in tasks if t.get("priority") == "MEDIUM")
            return f"There are {count} medium priority task(s)."
        if "low" in q:
            count = sum(1 for t in tasks if t.get("priority") == "LOW")
            return f"There are {count} low priority task(s)."

    # ── Assignee-specific queries ──
    if "assign" in q or "my task" in q or "assigned to" in q or "my tasks" in q:
        # Try to find a name in the query
        for emp in employees:
            name = (emp.get("name") or "").lower()
            if name and name in q:
                emp_tasks = [t for t in tasks if (t.get("assignee_name") or "").lower() == name]
                if not emp_tasks:
                    return f"No tasks assigned to {emp.get('name')}."
                lines = [f"Tasks assigned to {emp.get('name')} ({len(emp_tasks)}):"]
                for t in emp_tasks[:10]:
                    lines.append(f"- {t.get('title', 'Untitled')} | Status: {t.get('status', 'N/A')} | Due: {str(t.get('due_date', ''))[:10]}")
                return "\n".join(lines)

    return None


# ──────────────────────────────────────────────
# Generic fallback
# ──────────────────────────────────────────────


def _task_chatbot_fallback(message: str) -> str:
    """Fallback response when AI is unavailable or query is not data-driven."""
    msg_lower = message.lower()

    if any(word in msg_lower for word in ["hello", "hi", "hey", "greetings"]):
        return ("Hello! I'm your Task Assistant. I can help you with tasks, "
                "assignees, priorities, statuses, due dates, comments, subtasks, "
                "and activities. What would you like to know?")

    if any(word in msg_lower for word in ["task", "todo", "story", "work"]):
        return ("I can help with task information. You can view tasks by status, "
                "priority, assignee, or due date. Try asking 'How many tasks are overdue?' "
                "or 'Show me high priority tasks.'")

    if any(word in msg_lower for word in ["assign", "assignee", "who", "person", "member", "team"]):
        return ("I can help with assignments. You can check who tasks are assigned to, "
                "and view task loads per team member. Try asking 'Who is assigned to what?' "
                "or 'Show me tasks assigned to a specific person.'")

    if any(word in msg_lower for word in ["priority", "urgent", "important", "critical"]):
        return ("I can help with task priorities. Tasks can be LOW, MEDIUM, HIGH, or URGENT. "
                "Try asking 'How many urgent tasks are there?' "
                "or 'Show me high priority tasks.'")

    if any(word in msg_lower for word in ["status", "progress", "done", "complete", "hold", "review"]):
        return ("I can help with task statuses. Tasks progress through: TODO → ON PROGRESS → "
                "ON HOLD → ON REVIEW → COMPLETED, or become OVERDUE. "
                "Try asking 'How many tasks are in progress?' "
                "or 'Show completed tasks.'")

    if any(word in msg_lower for word in ["overdue", "late", "delay", "deadline", "due"]):
        return ("I can help with due dates and overdue tasks. "
                "Try asking 'How many overdue tasks are there?' "
                "or 'Show me all overdue tasks.'")

    if any(word in msg_lower for word in ["comment", "discuss", "feedback"]):
        return ("I can help with task comments. You can view recent comments on tasks. "
                "Try asking 'How many comments are there?' "
                "or 'Show me recent activity.'")

    if any(word in msg_lower for word in ["subtask", "checklist", "sub-task", "check"]):
        return ("I can help with subtasks and checklists. "
                "Try asking 'How many subtasks are there?' "
                "or 'Show me completion progress.'")

    if any(word in msg_lower for word in ["activit", "log", "history", "audit", "changed"]):
        return ("I can help with the task activity log. You can see who changed what and when. "
                "Try asking 'Show me recent activity.'")

    if any(word in msg_lower for word in ["notification", "alert", "notify", "mention"]):
        return ("I can help with task notifications. You can view recent notifications "
                "for mentions and status changes. Try asking 'How many notifications are there?'")

    return ("I'm your Task Assistant. I can answer questions about your tasks, "
            "assignees, statuses, priorities, due dates, comments, subtasks, "
            "dependencies, and activities. What would you like to know?")


# ──────────────────────────────────────────────
# Main chatbot function
# ──────────────────────────────────────────────


def task_chatbot(
    message: str,
    history: list[dict],
    tasks: list[dict],
    employees: list[dict],
    activities: list[dict],
    comments: list[dict],
    subtasks: list[dict],
    dependencies: list[dict],
    notifications: list[dict],
) -> str:
    """
    Task Chatbot: Answers user questions about task data only.
    Uses AI with full task context to answer questions.
    Falls back to a rule-based response if AI is unavailable.
    """
    if not _openrouter_available:
        print("[task_chatbot] AI not available, using fallback")
        # Try data-driven fallback first
        data_answer = _task_chatbot_data_fallback(
            message=message,
            tasks=tasks,
            employees=employees,
            activities=activities,
            comments=comments,
            subtasks=subtasks,
            dependencies=dependencies,
            notifications=notifications,
        )
        if data_answer:
            print("[task_chatbot] Data-driven fallback answered the query.")
            return data_answer
        return _task_chatbot_fallback(message)

    # Build compact summaries of task data
    task_summary = _summarize_tasks(tasks)
    emp_summary = _summarize_employees(employees)
    activity_summary = _summarize_activities(activities)
    comment_summary = _summarize_comments(comments)
    subtask_summary = _summarize_subtasks(subtasks)
    dep_summary = _summarize_dependencies(dependencies)
    notif_summary = _summarize_notifications(notifications)

    # Build conversation history
    history_text = ""
    for h in history[-10:]:  # last 10 messages for context
        role = "User" if h.get("role") == "user" else "Assistant"
        content = (h.get("content", "") or "")[:500]
        history_text += f"{role}: {content}\n"

    prompt = f"""{SYSTEM_PROMPT}

Available task data:

=== TASKS ({len(tasks)} total) ===
{task_summary}

=== EMPLOYEES / TEAM MEMBERS ({len(employees)} total) ===
{emp_summary}

=== RECENT ACTIVITY ({len(activities)} entries) ===
{activity_summary}

=== COMMENTS ({len(comments)} total) ===
{comment_summary}

=== SUBTASKS / CHECKLISTS ===
{subtask_summary}

=== DEPENDENCIES ===
{dep_summary}

=== NOTIFICATIONS ({len(notifications)} total) ===
{notif_summary}

---
Previous conversation:
{history_text}

User: {message}

Respond conversationally and helpfully. Keep answers concise but informative. If the user asks for something you don't have data on, suggest what they can do in the Tasks module.
Assistant:"""

    text = _call_llm(prompt)
    if text:
        return text[:2000]

    # Try deterministic data-driven fallback
    data_answer = _task_chatbot_data_fallback(
        message=message,
        tasks=tasks,
        employees=employees,
        activities=activities,
        comments=comments,
        subtasks=subtasks,
        dependencies=dependencies,
        notifications=notifications,
    )
    if data_answer:
        print("[task_chatbot] Data-driven fallback answered the query.")
        return data_answer

    return _task_chatbot_fallback(message)
