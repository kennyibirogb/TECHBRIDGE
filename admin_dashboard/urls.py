from django.urls import path
from . import views

urlpatterns = [
    path("admin-signup/", views.admin_signup, name="admin_signup"),
    path("admin-login/", views.admin_login, name="admin_login"),
    path("admin-logout/", views.admin_logout, name="admin_logout"),
    path("admin-dashboard/", views.admin_dashboard, name="admin_dashboard"),
]