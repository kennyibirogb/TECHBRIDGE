from django.urls import path
from . import views

urlpatterns = [

    # Admin dashboard
    path(
        "dashboard/",
        views.admin_dashboard,
        name="admin_dashboard"
    ),

    # Students
    path(
        "students/",
        views.admin_students,
        name="admin_students"
    ),

    # Instructors
    path(
        "instructors/",
        views.admin_instructors,
        name="admin_instructors"
    ),

    path(
        "instructors/<int:instructor_id>/verify/",
        views.verify_instructor,
        name="verify_instructor"
    ),

    # Courses
    path(
        "courses/",
        views.admin_courses,
        name="admin_courses"
    ),

    path(
        "courses/<int:course_id>/",
        views.admin_course_detail,
        name="admin_course_detail"
    ),

    # Enrollments
    path(
        "enrollments/",
        views.admin_enrollments,
        name="admin_enrollments"
    ),

    # Assignments
    path(
        "assignments/",
        views.admin_assignments,
        name="admin_assignments"
    ),

    # Submissions
    path(
        "submissions/",
        views.admin_submissions,
        name="admin_submissions"
    ),

    # Settings
    path(
        "settings/",
        views.admin_settings,
        name="admin_settings"
    ),

    # Login
    path(
        "login/",
        views.admin_login,
        name="admin_login"
    ),

    # Signup
    path(
        "signup/",
        views.admin_signup,
        name="admin_signup"
    ),
]


