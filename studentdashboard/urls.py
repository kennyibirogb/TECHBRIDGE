from django.urls import path
from . import views

urlpatterns = [
    path('studentdashboard/', views.studentdashboard, name='studentdashboard'),
    path('logout/', views.logout_view, name='logout'),
    path("certificate/", views.certificate, name="certificate"),
    path('course/<int:course_id>/', views.course_detail, name='course_detail'),
    path('lesson/<int:lesson_id>/complete/', views.complete_lesson, name='complete_lesson'),
    path('lesson/<int:lesson_id>/quiz/', views.take_quiz, name='take_quiz'),
    path('lesson/<int:lesson_id>/assignment/', views.submit_assignment, name='submit_assignment'),
    path('enroll/<int:course_id>/', views.enroll_in_course, name='enroll_in_course'),
    path('unenroll/<int:course_id>/', views.unenroll_course, name='unenroll_course'),
]