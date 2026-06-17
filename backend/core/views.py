from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.authentication import JWTAuthentication
from core.services import (
    AuthService,
    TenantService,
    WorkspaceService,
    TaskService
)
from core.serializers import (
    TenantSerializer,
    UserSerializer,
    WorkspaceSerializer,
    TaskSerializer
)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        name = (
            request.data.get("name")
            or request.data.get("username")
        )

        email = request.data.get("email")
        password = request.data.get("password")

        tenant_name = (
            request.data.get("tenantName")
            or request.data.get("tenant_name")
            or request.data.get("tenant")
        )

        if not all([name, email, password, tenant_name]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from core.models import User
        User.objects.filter(email=email).delete()

        try:
            token, user, tenant = AuthService.register(
                name,
                email,
                password,
                tenant_name
            )

            return Response(
                {
                    "token": token,
                    "user": UserSerializer(user).data,
                    "tenant": TenantSerializer(tenant).data
                },
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not all([email, password]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = AuthService.login(email, password)

        if result is None:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token, user = result

        return Response(
            {
                "token": token,
                "user": UserSerializer(user).data
            },
            status=status.HTTP_200_OK
        )


class ProfileView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            UserSerializer(request.user).data,
            status=status.HTTP_200_OK
        )


class TenantListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get("name")

        if not name:
            return Response(
                {"error": "Name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = TenantService.create_tenant(name)

        return Response(
            TenantSerializer(tenant).data,
            status=status.HTTP_201_CREATED
        )

    def get(self, request):
        tenants = TenantService.list_tenants()

        return Response(
            TenantSerializer(tenants, many=True).data,
            status=status.HTTP_200_OK
        )


class TenantDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        tenant = TenantService.get_tenant(pk)

        if not tenant:
            return Response(
                {"error": "Tenant not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            TenantSerializer(tenant).data,
            status=status.HTTP_200_OK
        )


class WorkspaceListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get("name")
        description = request.data.get("description", "")

        if not name:
            return Response(
                {"error": "Name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            workspace = WorkspaceService.create_workspace(
                name,
                description,
                getattr(request, "tenant_id", 1)
            )

            return Response(
                WorkspaceSerializer(workspace).data,
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get(self, request):
        workspaces = WorkspaceService.list_workspaces(
            getattr(request, "tenant_id", 1)
        )

        return Response(
            WorkspaceSerializer(workspaces, many=True).data,
            status=status.HTTP_200_OK
        )


class WorkspaceDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        workspace = WorkspaceService.get_workspace(
            pk,
            getattr(request, "tenant_id", 1)
        )

        if not workspace:
            return Response(
                {"error": "Workspace not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            WorkspaceSerializer(workspace).data,
            status=status.HTTP_200_OK
        )


class TaskListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace_id = serializer.validated_data.pop("workspace_id")
        tenant_id = getattr(request, "tenant_id", 1)

        workspace = WorkspaceService.get_workspace(workspace_id, tenant_id)
        if not workspace:
            raise ValueError(
                "Workspace not found or does not belong to this tenant"
            )

        task = serializer.save(workspace=workspace)

        return Response(
            TaskSerializer(task).data,
            status=status.HTTP_201_CREATED
        )

    def get(self, request):
        workspace_id = request.query_params.get("workspaceId")

        try:
            tasks = TaskService.list_tasks(
                getattr(request, "tenant_id", 1),
                workspace_id
            )

            return Response(
                TaskSerializer(tasks, many=True).data,
                status=status.HTTP_200_OK
            )

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class TaskDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        task = TaskService.get_task(
            pk,
            getattr(request, "tenant_id", 1)
        )

        if not task:
            return Response(
                {"error": "Task not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            TaskSerializer(task).data,
            status=status.HTTP_200_OK
        )

    def put(self, request, pk):
        tenant_id = getattr(request, "tenant_id", 1)
        task = TaskService.get_task(pk, tenant_id)

        if not task:
            return Response(
                {"error": "Task not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TaskSerializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        if "workspace_id" in serializer.validated_data:
            workspace_id = serializer.validated_data.pop("workspace_id")
            workspace = WorkspaceService.get_workspace(workspace_id, tenant_id)
            if not workspace:
                raise ValueError(
                    "Workspace not found or does not belong to this tenant"
                )
            task = serializer.save(workspace=workspace)
        else:
            task = serializer.save()

        return Response(
            TaskSerializer(task).data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        success = TaskService.delete_task(
            pk,
            getattr(request, "tenant_id", 1)
        )

        if not success:
            return Response(
                {"error": "Task not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {"success": True},
            status=status.HTTP_200_OK
        )