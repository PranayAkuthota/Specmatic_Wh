import pytest
from django.urls import reverse
from core.models import Task, Tenant, Workspace

@pytest.mark.django_db
def test_create_task_success(auth_client, sample_workspace):
    url = reverse("tasks")
    payload = {
        "title": "Implement API",
        "description": "Code all routes",
        "priority": "HIGH",
        "status": "TODO",
        "dueDate": "2026-06-30",
        "workspaceId": sample_workspace.id
    }
    response = auth_client.post(url, payload, format="json")
    assert response.status_code == 201
    assert response.data["title"] == "Implement API"
    assert response.data["workspaceId"] == sample_workspace.id
    assert Task.objects.filter(title="Implement API").exists()

@pytest.mark.django_db
def test_create_task_cross_tenant_workspace(auth_client):
    # Create another tenant and workspace
    other_tenant = Tenant.objects.create(name="Other Corp")
    other_workspace = Workspace.objects.create(
        name="Secrets",
        description="Private space",
        tenant=other_tenant
    )
    
    url = reverse("tasks")
    payload = {
        "title": "Hack project",
        "workspaceId": other_workspace.id
    }
    # Should reject because other_workspace does not belong to user's tenant
    response = auth_client.post(url, payload, format="json")
    assert response.status_code == 400
    assert "error" in response.data

@pytest.mark.django_db
def test_list_tasks(auth_client, sample_task):
    url = reverse("tasks")
    response = auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["title"] == sample_task.title

@pytest.mark.django_db
def test_list_tasks_tenant_isolation(auth_client, sample_task):
    # Create another tenant, workspace and task
    other_tenant = Tenant.objects.create(name="Other Corp")
    other_workspace = Workspace.objects.create(name="Other Projects", tenant=other_tenant)
    other_task = Task.objects.create(
        title="Secret Task",
        workspace=other_workspace
    )
    
    url = reverse("tasks")
    response = auth_client.get(url)
    assert response.status_code == 200
    # Should only return sample_task from current tenant, not other_task from other_tenant
    titles = [t["title"] for t in response.data]
    assert sample_task.title in titles
    assert "Secret Task" not in titles

@pytest.mark.django_db
def test_get_task_success(auth_client, sample_task):
    url = reverse("task-detail", kwargs={"pk": sample_task.id})
    response = auth_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == sample_task.title

@pytest.mark.django_db
def test_get_task_cross_tenant_fail(auth_client):
    other_tenant = Tenant.objects.create(name="Other Corp")
    other_workspace = Workspace.objects.create(name="Other Projects", tenant=other_tenant)
    other_task = Task.objects.create(title="Secret Task", workspace=other_workspace)
    
    url = reverse("task-detail", kwargs={"pk": other_task.id})
    response = auth_client.get(url)
    # Should return 404 because task belongs to another tenant
    assert response.status_code == 404

@pytest.mark.django_db
def test_update_task_success(auth_client, sample_task):
    url = reverse("task-detail", kwargs={"pk": sample_task.id})
    payload = {
        "title": "Updated Title",
        "status": "IN_PROGRESS"
    }
    response = auth_client.put(url, payload, format="json")
    assert response.status_code == 200
    assert response.data["title"] == "Updated Title"
    assert response.data["status"] == "IN_PROGRESS"
    
    sample_task.refresh_from_db()
    assert sample_task.title == "Updated Title"
    assert sample_task.status == "IN_PROGRESS"

@pytest.mark.django_db
def test_delete_task_success(auth_client, sample_task):
    url = reverse("task-detail", kwargs={"pk": sample_task.id})
    response = auth_client.delete(url)
    assert response.status_code == 200
    assert response.data["success"] is True
    assert not Task.objects.filter(id=sample_task.id).exists()
