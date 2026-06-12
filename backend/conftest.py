import pytest
from rest_framework.test import APIClient
from core.models import Tenant, User, Workspace, Task
from core.services import AuthService

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def sample_tenant(db):
    return Tenant.objects.create(name="Acme Corp")

@pytest.fixture
def sample_owner(db, sample_tenant):
    user = User(
        name="Alice Smith",
        email="alice@example.com",
        role="OWNER",
        tenant=sample_tenant
    )
    user.set_password("securepassword123")
    user.save()
    return user

@pytest.fixture
def auth_client(db, api_client, sample_owner):
    token = AuthService.generate_token(sample_owner)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    api_client.tenant_id = sample_owner.tenant.id
    api_client.user = sample_owner
    return api_client

@pytest.fixture
def sample_workspace(db, sample_tenant):
    return Workspace.objects.create(
        name="Engineering",
        description="Engineering Workspace",
        tenant=sample_tenant
    )

@pytest.fixture
def sample_task(db, sample_workspace):
    return Task.objects.create(
        title="Implement JWT auth",
        description="Write Django views and tests",
        priority="HIGH",
        status="TODO",
        due_date="2026-06-30",
        workspace=sample_workspace
    )
