from rest_framework import serializers
from core.models import Tenant, User, Workspace, Task

class TenantSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Tenant
        fields = ["id", "name", "createdAt"]


class UserSerializer(serializers.ModelSerializer):
    tenantId = serializers.IntegerField(source="tenant_id", read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "tenantId"]


class WorkspaceSerializer(serializers.ModelSerializer):
    tenantId = serializers.IntegerField(source="tenant_id", read_only=True)

    class Meta:
        model = Workspace
        fields = ["id", "name", "description", "tenantId"]


class TaskSerializer(serializers.ModelSerializer):
    dueDate = serializers.DateField(source="due_date", required=False, allow_null=True)
    workspaceId = serializers.IntegerField(source="workspace_id")

    class Meta:
        model = Task
        fields = ["id", "title", "description", "priority", "status", "dueDate", "workspaceId"]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Ensure description is present in response even if null, or matches schema expectation
        if "description" not in ret:
            ret["description"] = None
        # Handle due_date representation if null
        if "dueDate" not in ret or ret["dueDate"] is None:
            ret["dueDate"] = None
        return ret
