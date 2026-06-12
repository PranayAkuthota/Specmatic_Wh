from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class Tenant(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tenants"

    def __str__(self):
        return self.name


class UserRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Admin"
    MEMBER = "MEMBER", "Member"


class User(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.MEMBER
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="users")

    class Meta:
        db_table = "users"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.email} ({self.role})"


class Workspace(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="workspaces")

    class Meta:
        db_table = "workspaces"

    def __str__(self):
        return self.name


class TaskPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"


class TaskStatus(models.TextChoices):
    TODO = "TODO", "Todo"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"


class Task(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO
    )
    due_date = models.DateField(blank=True, null=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="tasks")

    class Meta:
        db_table = "tasks"

    def __str__(self):
        return self.title
