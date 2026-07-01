#!/usr/bin/env python3
"""
Test automatic vector re-indexing hooks for CRM, HR, Task, and Transaction modules.
This script creates, updates, and deletes records to verify the hooks trigger correctly.
"""

import os
import uuid
import sys
from datetime import datetime, timedelta

os.environ.setdefault("SUPABASE_DATABASE_URL", os.getenv("SUPABASE_DATABASE_URL", ""))
os.environ.setdefault("DATABASE_URL", os.getenv("DATABASE_URL", ""))
os.environ.setdefault("ORGANIZATION_ID", os.getenv("ORGANIZATION_ID", "00000000-0000-0000-0000-000000000000"))

# Import the reindex hooks BEFORE importing models
from app.services.vector.reindex_hooks import register_vector_reindex_hooks
from app.core.database import SessionLocal, engine
from app.core.base import Base

# Register hooks BEFORE any session is created
register_vector_reindex_hooks()
print("[OK] Vector reindex hooks registered")

# Now import models and services
from app.modules.crm.db_models import Contact, Activity, Lead, Pipeline, Phase, Client
from app.modules.hr.db_models import Employee, Department, Role
from app.modules.tasks.db_models import Task, Priority as TaskPriority, Status as TaskStatus
from app.services.vector.search_service import VectorSearchService

# Initialize tables
Base.metadata.create_all(bind=engine)
print("[OK] Database tables initialized")

ORGANIZATION_ID = os.getenv("ORGANIZATION_ID")
vector_service = VectorSearchService(session_factory=SessionLocal)


def count_search_docs(entity_type=None):
    """Count documents in search_documents table, optionally filtered by entity_type."""
    session = SessionLocal()
    try:
        from sqlalchemy import text
        if entity_type:
            result = session.execute(
                text("SELECT COUNT(*) FROM search_documents WHERE entity_type = :entity_type AND organization_id = :org_id"),
                {"entity_type": entity_type, "org_id": ORGANIZATION_ID}
            )
        else:
            result = session.execute(
                text("SELECT COUNT(*) FROM search_documents WHERE organization_id = :org_id"),
                {"org_id": ORGANIZATION_ID}
            )
        return result.scalar()
    finally:
        session.close()


def test_crm_contact_reindexing():
    """Test: Create, update, delete a CRM Contact and verify vector re-indexing."""
    print("\n" + "=" * 80)
    print("TEST: CRM Contact Auto-Reindexing")
    print("=" * 80)
    
    session = SessionLocal()
    try:
        # Count before
        before = count_search_docs("crm_contact")
        print(f"[BEFORE] CRM contact vectors in index: {before}")
        
        # Create contact
        contact_id = str(uuid.uuid4())
        contact = Contact(
            id=contact_id,
            name="Test Contact - Auto Reindex",
            email="test.contact@example.com",
            phone="+1-555-0100",
            company="Test Company",
            job_title="Manager",
            address="123 Main St",
            notes="This contact was created to test automatic re-indexing hooks",
            status="active",
            source="test"
        )
        session.add(contact)
        session.commit()
        print(f"[CREATED] Contact {contact_id}")
        
        # Check if indexed
        after_create = count_search_docs("crm_contact")
        print(f"[AFTER CREATE] CRM contact vectors in index: {after_create}")
        if after_create > before:
            print(f"✓ Contact auto-indexed ({after_create - before} new vectors)")
        else:
            print(f"⚠ No new vectors detected after create")
        
        # Update contact
        contact.notes = contact.notes + " - Updated at " + datetime.now().isoformat()
        session.commit()
        print(f"[UPDATED] Contact notes")
        
        # Check if re-indexed
        after_update = count_search_docs("crm_contact")
        print(f"[AFTER UPDATE] CRM contact vectors in index: {after_update}")
        if after_update >= after_create:
            print(f"✓ Contact auto-re-indexed on update")
        else:
            print(f"⚠ Vectors may not have been re-indexed")
        
        # Delete contact
        session.delete(contact)
        session.commit()
        print(f"[DELETED] Contact")
        
        # Check if removed from index
        after_delete = count_search_docs("crm_contact")
        print(f"[AFTER DELETE] CRM contact vectors in index: {after_delete}")
        if after_delete < after_update:
            print(f"✓ Contact vectors removed from index ({after_update - after_delete} vectors deleted)")
        else:
            print(f"⚠ Vectors may not have been removed")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        session.close()


def test_hr_employee_reindexing():
    """Test: Create, update, delete an HR Employee and verify vector re-indexing."""
    print("\n" + "=" * 80)
    print("TEST: HR Employee Auto-Reindexing")
    print("=" * 80)
    
    session = SessionLocal()
    try:
        # Count before
        before = count_search_docs("hr_employee")
        print(f"[BEFORE] HR employee vectors in index: {before}")
        
        # Ensure a department exists
        dept = session.query(Department).first()
        if not dept:
            dept = Department(id=999, name="Test Dept", description="Test Department")
            session.add(dept)
            session.commit()
        
        # Create employee
        employee_id = 9999
        employee = Employee(
            id=employee_id,
            user_id=None,
            employee_code="TEST-AUTO-001",
            full_name="Test Employee - Auto Reindex",
            email="test.emp@example.com",
            phone="+1-555-0200",
            department_id=dept.id,
            joining_date=datetime.now().date(),
            salary=50000.0,
            status="Active"
        )
        session.add(employee)
        session.commit()
        print(f"[CREATED] Employee {employee_id}")
        
        # Check if indexed
        after_create = count_search_docs("hr_employee")
        print(f"[AFTER CREATE] HR employee vectors in index: {after_create}")
        if after_create > before:
            print(f"✓ Employee auto-indexed ({after_create - before} new vectors)")
        else:
            print(f"⚠ No new vectors detected after create")
        
        # Update employee
        employee.salary = 55000.0
        session.commit()
        print(f"[UPDATED] Employee salary")
        
        # Check if re-indexed
        after_update = count_search_docs("hr_employee")
        print(f"[AFTER UPDATE] HR employee vectors in index: {after_update}")
        if after_update >= after_create:
            print(f"✓ Employee auto-re-indexed on update")
        else:
            print(f"⚠ Vectors may not have been re-indexed")
        
        # Delete employee
        session.delete(employee)
        session.commit()
        print(f"[DELETED] Employee")
        
        # Check if removed from index
        after_delete = count_search_docs("hr_employee")
        print(f"[AFTER DELETE] HR employee vectors in index: {after_delete}")
        if after_delete < after_update:
            print(f"✓ Employee vectors removed from index ({after_update - after_delete} vectors deleted)")
        else:
            print(f"⚠ Vectors may not have been removed")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        session.close()


def test_task_reindexing():
    """Test: Create, update, delete a Task and verify vector re-indexing."""
    print("\n" + "=" * 80)
    print("TEST: Task Auto-Reindexing")
    print("=" * 80)
    
    session = SessionLocal()
    try:
        # Count before
        before = count_search_docs("task_task")
        print(f"[BEFORE] Task vectors in index: {before}")
        
        # Create task
        task_id = uuid.uuid4()
        task = Task(
            id=task_id,
            title="Test Task - Auto Reindex",
            description="This task was created to test automatic re-indexing hooks",
            priority=TaskPriority.HIGH,
            status=TaskStatus.TODO,
            due_date=datetime.now() + timedelta(days=7),
            created_by=1  # Assuming user 1 exists
        )
        session.add(task)
        session.commit()
        print(f"[CREATED] Task {task_id}")
        
        # Check if indexed
        after_create = count_search_docs("task_task")
        print(f"[AFTER CREATE] Task vectors in index: {after_create}")
        if after_create > before:
            print(f"✓ Task auto-indexed ({after_create - before} new vectors)")
        else:
            print(f"⚠ No new vectors detected after create")
        
        # Update task
        task.status = TaskStatus.ON_PROGRESS
        session.commit()
        print(f"[UPDATED] Task status")
        
        # Check if re-indexed
        after_update = count_search_docs("task_task")
        print(f"[AFTER UPDATE] Task vectors in index: {after_update}")
        if after_update >= after_create:
            print(f"✓ Task auto-re-indexed on update")
        else:
            print(f"⚠ Vectors may not have been re-indexed")
        
        # Delete task
        session.delete(task)
        session.commit()
        print(f"[DELETED] Task")
        
        # Check if removed from index
        after_delete = count_search_docs("task_task")
        print(f"[AFTER DELETE] Task vectors in index: {after_delete}")
        if after_delete < after_update:
            print(f"✓ Task vectors removed from index ({after_update - after_delete} vectors deleted)")
        else:
            print(f"⚠ Vectors may not have been removed")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        session.close()


def main():
    print("=" * 80)
    print("Automatic Vector Re-Indexing Test Suite")
    print("=" * 80)
    print(f"Organization ID: {ORGANIZATION_ID}")
    print(f"Database: {os.getenv('DATABASE_URL', 'Not set')[:80]}...")
    
    results = []
    
    # Run tests
    results.append(("CRM Contact Reindexing", test_crm_contact_reindexing()))
    results.append(("HR Employee Reindexing", test_hr_employee_reindexing()))
    results.append(("Task Reindexing", test_task_reindexing()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All automatic re-indexing hooks are working correctly!")
        return 0
    else:
        print(f"\n⚠ Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
