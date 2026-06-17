from rest_framework import serializers
from core.models import Tenant, User, Workspace, Task

class StrictCharField(serializers.CharField):
    def to_internal_value(self, data):
        if data is None:
            if self.allow_null:
                return None
            self.fail('null')
        if not isinstance(data, str):
            raise serializers.ValidationError("This field must be a string.")
        return super().to_internal_value(data)


class TenantSerializer(serializers.ModelSerializer):
    name = StrictCharField()
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
    name = StrictCharField()
    description = StrictCharField(required=False, allow_blank=True)
    tenantId = serializers.IntegerField(source="tenant_id", read_only=True)

    class Meta:
        model = Workspace
        fields = ["id", "name", "description", "tenantId"]


class TaskSerializer(serializers.ModelSerializer):
    title = StrictCharField()
    description = StrictCharField(required=False, allow_blank=True)
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


class RegisterSerializer(serializers.Serializer):
    name = StrictCharField()
    email = serializers.EmailField()
    password = StrictCharField(min_length=6)
    tenantName = StrictCharField()


class LoginSerializer(serializers.Serializer):
    email = StrictCharField()
    password = StrictCharField()

