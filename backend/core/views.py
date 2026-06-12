from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.authentication import JWTAuthentication
from core.services import AuthService, TenantService, WorkspaceService, TaskService
from core.serializers import TenantSerializer, UserSerializer, WorkspaceSerializer, TaskSerializer

class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        name = request.data.get("name")
        email = request.data.get("email")
        password = request.data.get("password")
        tenant_name = request.data.get("tenantName")

        if not all([name, email, password, tenant_name]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token, user, tenant = AuthService.register(name, email, password, tenant_name)
            return Response({
                "token": token,
                "user": UserSerializer(user).data,
                "tenant": TenantSerializer(tenant).data
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not all([email, password]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        result = AuthService.login(email, password)
        if not result:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        token, user = result
        return Response({
            "token": token,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class TenantListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        name = request.data.get("name")
        if not name:
            return Response({"error": "Name is required"}, status=status.HTTP_400_BAD_REQUEST)

        tenant = TenantService.create_tenant(name)
        return Response(TenantSerializer(tenant).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        tenants = TenantService.list_tenants()
        return Response(TenantSerializer(tenants, many=True).data, status=status.HTTP_200_OK)


class TenantDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get(self, request, pk):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        tenant = TenantService.get_tenant(pk)
        if not tenant:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TenantSerializer(tenant).data, status=status.HTTP_200_OK)


class WorkspaceListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        name = request.data.get("name")
        description = request.data.get("description", "")
        
        if not name:
            return Response({"error": "Name is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            workspace = WorkspaceService.create_workspace(name, description, request.tenant_id)
            return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        workspaces = WorkspaceService.list_workspaces(request.tenant_id)
        return Response(WorkspaceSerializer(workspaces, many=True).data, status=status.HTTP_200_OK)


class WorkspaceDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get(self, request, pk):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        workspace = WorkspaceService.get_workspace(pk, request.tenant_id)
        if not workspace:
            return Response({"error": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_200_OK)


class TaskListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        title = request.data.get("title")
        description = request.data.get("description", "")
        priority = request.data.get("priority", "MEDIUM")
        status_val = request.data.get("status", "TODO")
        due_date = request.data.get("dueDate")  # Parse camelCase
        workspace_id = request.data.get("workspaceId")  # Parse camelCase

        if not title or not workspace_id:
            return Response({"error": "title and workspaceId are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = TaskService.create_task(
                title=title,
                description=description,
                priority=priority,
                status=status_val,
                due_date=due_date,
                workspace_id=workspace_id,
                tenant_id=request.tenant_id
            )
            return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        workspace_id = request.query_params.get("workspaceId")
        try:
            tasks = TaskService.list_tasks(request.tenant_id, workspace_id)
            return Response(TaskSerializer(tasks, many=True).data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TaskDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get(self, request, pk):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        task = TaskService.get_task(pk, request.tenant_id)
        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Build updates mapping camelCase payload fields to models fields
        data = {}
        if "title" in request.data:
            data["title"] = request.data["title"]
        if "description" in request.data:
            data["description"] = request.data["description"]
        if "priority" in request.data:
            data["priority"] = request.data["priority"]
        if "status" in request.data:
            data["status"] = request.data["status"]
        if "dueDate" in request.data:
            data["due_date"] = request.data["dueDate"]

        task = TaskService.update_task(pk, request.tenant_id, data)
        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        if not request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
        success = TaskService.delete_task(pk, request.tenant_id)
        if not success:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True}, status=status.HTTP_200_OK)
