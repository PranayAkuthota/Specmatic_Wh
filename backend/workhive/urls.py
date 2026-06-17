from django.urls import path, include

urlpatterns = [
    path("", include("core.urls")),
]

handler404 = "core.views.custom_404_handler"
handler500 = "core.views.custom_500_handler"
