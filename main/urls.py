from django.urls import path
from . import views

urlpatterns = [
    path('', views.main, name='main'),
    path('event/', views.event, name='event'),
    path('programs/', views.programs, name='programs'),
]