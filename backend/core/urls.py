from django.urls import path
from core.views import (
    RegisterView, LoginView, ProfileView,
    TenantListCreateView, TenantDetailView,
    WorkspaceListCreateView, WorkspaceDetailView,
    TaskListCreateView, TaskDetailView
)

urlpatterns = [
    path("register", RegisterView.as_view(), name="register"),
    path("login", LoginView.as_view(), name="login"),
    path("profile", ProfileView.as_view(), name="profile"),
    path("tenants", TenantListCreateView.as_view(), name="tenants"),
    path("tenants/<int:pk>", TenantDetailView.as_view(), name="tenant-detail"),
    path("workspaces", WorkspaceListCreateView.as_view(), name="workspaces"),
    path("workspaces/<int:pk>", WorkspaceDetailView.as_view(), name="workspace-detail"),
    path("tasks", TaskListCreateView.as_view(), name="tasks"),
    path("tasks/<int:pk>", TaskDetailView.as_view(), name="task-detail"),
]
