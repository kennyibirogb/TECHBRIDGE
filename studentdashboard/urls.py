from django.urls import path
from . import views

urlpatterns = [
    path('studentdashboard/', views.studentdashboard, name='studentdashboard'),
    path('logout/', views.logout_view, name='logout'),
    path("lesson/", views.lesson, name="lesson"),
    path("certificate/", views.certificate, name="certificate"),
]