from django.urls import path
from . import views

urlpatterns = [
    path('instructor/', views.instructor, name='instructor'),
    path('instructor_signup/', views.instructor_signup, name='instructor_signup'),
    path('instructor_login/', views.instructor_login, name='instructor_login'),
    path('instructor_dashboard/', views.instructor_dashboard, name='instructor_dashboard'),
    path('instructor/logout/', views.instructor_logout, name='instructor_logout'),
    path('instructor/course/create/', views.create_course, name='create_course'),
    path('instructor/lesson/add/', views.add_lesson, name='add_lesson'),
    path('instructor/lesson/<int:lesson_id>/delete/', views.delete_lesson, name='delete_lesson'),
    path('instructor/lesson/<int:lesson_id>/material/upload/', views.upload_material, name='upload_material'),
    path('instructor/lesson/<int:lesson_id>/material/<str:kind>/delete/', views.delete_material, name='delete_material'),
    path('instructor/lesson/<int:lesson_id>/quiz/save/', views.save_quiz, name='save_quiz'),
    path('instructor/lesson/<int:lesson_id>/quiz/delete/', views.delete_quiz, name='delete_quiz'),
    path('instructor/lesson/<int:lesson_id>/assignment/save/', views.save_assignment, name='save_assignment'),
    path('instructor/lesson/<int:lesson_id>/assignment/delete/', views.delete_assignment, name='delete_assignment'),
    path('students/', views.instructor_students, name='instructor_students'),
    path('students/<int:student_id>/qualify/', views.mark_qualified, name='mark_qualified'),
    
]