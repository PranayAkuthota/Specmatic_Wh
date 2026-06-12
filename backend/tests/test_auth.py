import pytest
from django.urls import reverse
from core.models import Tenant, User, Workspace

@pytest.mark.django_db
def test_register_success(api_client):
    url = reverse("register")
    payload = {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "password": "securepassword123",
        "tenantName": "Acme Corp"
    }
    response = api_client.post(url, payload, format="json")
    
    assert response.status_code == 201
    assert "token" in response.data
    assert response.data["user"]["name"] == "Alice Smith"
    assert response.data["user"]["email"] == "alice@example.com"
    assert response.data["user"]["role"] == "OWNER"
    assert response.data["tenant"]["name"] == "Acme Corp"
    
    # Check database side effects
    assert Tenant.objects.filter(name="Acme Corp").exists()
    assert User.objects.filter(email="alice@example.com").exists()
    assert Workspace.objects.filter(name="General Workspace").exists()

@pytest.mark.django_db
def test_register_duplicate_email(api_client, sample_owner):
    url = reverse("register")
    payload = {
        "name": "Bob Smith",
        "email": sample_owner.email,
        "password": "anotherpassword",
        "tenantName": "Duplicate Corp"
    }
    response = api_client.post(url, payload, format="json")
    assert response.status_code == 400
    assert "error" in response.data

@pytest.mark.django_db
def test_login_success(api_client, sample_owner):
    url = reverse("login")
    payload = {
        "email": sample_owner.email,
        "password": "securepassword123"
    }
    response = api_client.post(url, payload, format="json")
    assert response.status_code == 200
    assert "token" in response.data
    assert response.data["user"]["email"] == sample_owner.email

@pytest.mark.django_db
def test_login_invalid_credentials(api_client, sample_owner):
    url = reverse("login")
    payload = {
        "email": sample_owner.email,
        "password": "wrongpassword"
    }
    response = api_client.post(url, payload, format="json")
    assert response.status_code == 401
    assert "error" in response.data

@pytest.mark.django_db
def test_profile_authenticated(auth_client, sample_owner):
    url = reverse("profile")
    response = auth_client.get(url)
    assert response.status_code == 200
    assert response.data["email"] == sample_owner.email

@pytest.mark.django_db
def test_profile_unauthenticated(api_client):
    url = reverse("profile")
    response = api_client.get(url)
    assert response.status_code == 401
