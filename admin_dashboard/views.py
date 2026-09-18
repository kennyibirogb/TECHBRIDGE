
from django.contrib import messages
from django.contrib.auth import get_user_model, authenticate, login
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from core.decorators import admin_required
from . import views

from .models import (
    Instructor,
    Course,
    Lesson,
    Material,
    Enrollment,
    LessonProgress,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    Assignment,
    AssignmentSubmission,
    Qualification,
)


User = get_user_model()


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@admin_required
def admin_dashboard(request):

    total_students = User.objects.filter(
        is_staff=False,
        is_superuser=False
    ).count()

    total_instructors = Instructor.objects.count()

    verified_instructors = Instructor.objects.filter(
        is_verified=True
    ).count()

    pending_instructors = Instructor.objects.filter(
        is_verified=False
    ).count()

    total_courses = Course.objects.count()

    total_lessons = Lesson.objects.count()

    total_enrollments = Enrollment.objects.count()

    total_assignments = Assignment.objects.count()

    total_submissions = AssignmentSubmission.objects.count()

    total_quizzes = Quiz.objects.count()

    total_quiz_attempts = QuizAttempt.objects.count()

    total_materials = Material.objects.count()

    recent_students = User.objects.filter(
        is_staff=False,
        is_superuser=False
    ).order_by("-date_joined")[:5]

    pending_instructor_list = Instructor.objects.filter(
        is_verified=False
    ).select_related("user").order_by("-created_at")[:5]

    recent_courses = Course.objects.select_related(
        "instructor",
        "instructor__user"
    ).annotate(
        student_count=Count("enrollments"),
        lesson_count=Count("lessons")
    ).order_by("-created_at")[:6]

    recent_enrollments = Enrollment.objects.select_related(
        "student",
        "course"
    ).order_by("-enrolled_at")[:5]

    context = {
        "total_students": total_students,
        "total_instructors": total_instructors,
        "verified_instructors": verified_instructors,
        "pending_instructors": pending_instructors,
        "total_courses": total_courses,
        "total_lessons": total_lessons,
        "total_enrollments": total_enrollments,
        "total_assignments": total_assignments,
        "total_submissions": total_submissions,
        "total_quizzes": total_quizzes,
        "total_quiz_attempts": total_quiz_attempts,
        "total_materials": total_materials,

        "recent_students": recent_students,
        "pending_instructor_list": pending_instructor_list,
        "recent_courses": recent_courses,
        "recent_enrollments": recent_enrollments,
    }

    return render(
        request,
        "admin/dashboard.html",
        context
    )


# ============================================================
# STUDENTS
# ============================================================

@admin_required
def admin_students(request):

    search = request.GET.get("search", "").strip()

    students = User.objects.filter(
        is_staff=False,
        is_superuser=False
    ).annotate(
        enrollment_count=Count("enrollments")
    ).order_by("-date_joined")

    if search:
        students = students.filter(
            Q(full_name__icontains=search) |
            Q(email__icontains=search) |
            Q(username__icontains=search)
        )

    context = {
        "students": students,
        "search": search,
    }

    return render(
        request,
        "admin/students.html",
        context
    )


# ============================================================
# INSTRUCTORS
# ============================================================

@admin_required
def admin_instructors(request):
    instructors = Instructor.objects.select_related(
        "user"
    ).annotate(
        course_count=Count("courses")
    ).order_by("-created_at")

    total_instructors = instructors.count()
    verified_instructors = instructors.filter(is_verified=True).count()
    pending_instructors = instructors.filter(is_verified=False).count()

    return render(
        request,
        "admin/instructors.html",
        {
            "instructors": instructors,
            "total_instructors": total_instructors,
            "verified_instructors": verified_instructors,
            "pending_instructors": pending_instructors,
        }
    )


# ============================================================
# VERIFY INSTRUCTOR
# ============================================================

@admin_required
def verify_instructor(request, instructor_id):

    instructor = get_object_or_404(
        Instructor,
        id=instructor_id
    )

    instructor.is_verified = True
    instructor.user.is_active = True

    instructor.user.save(
        update_fields=["is_active"]
    )

    instructor.save(
        update_fields=["is_verified"]
    )

    messages.success(
        request,
        f"{instructor.user.full_name} has been verified."
    )

    return redirect("admin_instructors")


# ============================================================
# COURSES
# ============================================================

@admin_required
def admin_courses(request):
    search = request.GET.get("search", "").strip()
    status = request.GET.get("status", "").strip()

    courses = Course.objects.select_related(
        "instructor",
        "instructor__user"
    ).annotate(
        student_count=Count("enrollments"),
        lesson_count=Count("lessons")
    ).order_by("-created_at")

    if search:
        courses = courses.filter(
            Q(title__icontains=search) |
            Q(category__icontains=search) |
            Q(instructor__user__full_name__icontains=search)
        )

    if status == "published":
        courses = courses.filter(is_published=True)

    elif status == "draft":
        courses = courses.filter(is_published=False)

    published_courses_count = courses.filter(
        is_published=True
    ).count()

    draft_courses_count = courses.filter(
        is_published=False
    ).count()

    return render(
        request,
        "admin/courses.html",
        {
            "courses": courses,
            "search": search,
            "status": status,
            "published_courses_count": published_courses_count,
            "draft_courses_count": draft_courses_count,
        }
    )


# ============================================================
# COURSE DETAILS
# ============================================================

@admin_required
def admin_course_detail(request, course_id):

    course = get_object_or_404(
        Course.objects.select_related(
            "instructor",
            "instructor__user"
        ),
        id=course_id
    )

    lessons = course.lessons.all()

    materials = Material.objects.filter(
        lesson__course=course
    ).select_related("lesson")

    assignments = Assignment.objects.filter(
        lesson__course=course
    ).select_related("lesson")

    enrollments = Enrollment.objects.filter(
        course=course
    ).select_related("student").order_by("-enrolled_at")

    quizzes = Quiz.objects.filter(
        lesson__course=course
    ).select_related("lesson")

    context = {
        "course": course,
        "lessons": lessons,
        "materials": materials,
        "assignments": assignments,
        "enrollments": enrollments,
        "quizzes": quizzes,
    }

    return render(
        request,
        "admin/course-detail.html",
        context
    )


# ============================================================
# ENROLLMENTS
# ============================================================

@admin_required
def admin_enrollments(request):

    enrollments = Enrollment.objects.select_related(
        "student",
        "course"
    ).order_by("-enrolled_at")

    search = request.GET.get("search", "").strip()

    if search:
        enrollments = enrollments.filter(
            Q(student__full_name__icontains=search) |
            Q(student__email__icontains=search) |
            Q(course__title__icontains=search)
        )

    context = {
        "enrollments": enrollments,
        "search": search,
    }

    return render(
        request,
        "admin/enrollments.html",
        context
    )


# ============================================================
# ASSIGNMENTS
# ============================================================

@admin_required
def admin_assignments(request):

    assignments = Assignment.objects.select_related(
        "lesson",
        "lesson__course",
        "lesson__course__instructor",
        "lesson__course__instructor__user"
    ).annotate(
        submission_count=Count("submissions")
    ).order_by("-updated_at")

    context = {
        "assignments": assignments,
    }

    return render(
        request,
        "admin/assignments.html",
        context
    )


# ============================================================
# SUBMISSIONS
# ============================================================

@admin_required
def admin_submissions(request):

    submissions = AssignmentSubmission.objects.select_related(
        "student",
        "assignment",
        "assignment__lesson",
        "assignment__lesson__course"
    ).order_by("-submitted_at")

    context = {
        "submissions": submissions,
    }

    return render(
        request,
        "admin/submissions.html",
        context
    )


# ============================================================
# QUIZZES
# ============================================================

@admin_required
def admin_quizzes(request):

    quizzes = Quiz.objects.select_related(
        "lesson",
        "lesson__course"
    ).annotate(
        question_count=Count("questions"),
        attempt_count=Count("lesson__quiz_attempts")
    ).order_by("-updated_at")

    context = {
        "quizzes": quizzes,
    }

    return render(
        request,
        "admin/quizzes.html",
        context
    )


# ============================================================
# SETTINGS
# ============================================================

@admin_required
def admin_settings(request):

    return render(
        request,
        "admin/settings.html"
    )

def admin_login(request):

    if request.user.is_authenticated and request.user.is_staff:
        return redirect("admin_dashboard")

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None and user.is_staff:
            login(request, user)

            messages.success(
                request,
                f"Welcome, {user.full_name}!"
            )

            return redirect("admin_dashboard")

        messages.error(
            request,
            "Invalid admin username or password."
        )

    return render(
        request,
        "admin/adminlogin.html"
    )
    
def admin_signup(request):

    if request.user.is_authenticated and request.user.is_staff:
        return redirect("admin_dashboard")

    if request.method == "POST":
        full_name = request.POST.get("full_name", "").strip()
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm_password", "")

        if not full_name or not username or not email or not password:
            messages.error(
                request,
                "Please fill in all required fields."
            )
            return render(
                request,
                "admin/adminsignup.html"
            )

        if password != confirm_password:
            messages.error(
                request,
                "Passwords do not match."
            )
            return render(
                request,
                "admin/adminsignup.html"
            )

        if User.objects.filter(username=username).exists():
            messages.error(
                request,
                "That username is already taken."
            )
            return render(
                request,
                "admin/adminsignup.html"
            )

        if User.objects.filter(email=email).exists():
            messages.error(
                request,
                "An account with that email already exists."
            )
            return render(
                request,
                "admin/adminsignup.html"
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            is_staff=True,
            is_active=True
        )

        login(request, user)

        messages.success(
            request,
            "Admin account created successfully."
        )

        return redirect("admin_dashboard")

    return render(
        request,
        "admin/adminsignup.html"
    )