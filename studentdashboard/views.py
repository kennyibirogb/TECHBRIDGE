from django.shortcuts import render, redirect
from django.contrib import messages
from user.models import Student, Enrollment
from .course import COURSE_CATALOG

def studentdashboard(request):
    student_id = request.session.get('student_id')
    if not student_id:
        return redirect('login')

    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        request.session.flush()  # clear the stale/invalid session
        messages.error(request, "Your session has expired. Please log in again.")
        return redirect('login')

    enrolled_tracks = [student.track] + list(
        student.enrollments.values_list("track", flat=True)
    )

    enrolled_courses = [
        {**data, "key": key}
        for key, data in COURSE_CATALOG.items()
        if data["track"] in enrolled_tracks
    ]

    available_courses = [
        {**data, "key": key}
        for key, data in COURSE_CATALOG.items()
        if data["track"] not in enrolled_tracks
    ]

    return render(request, 'studentdashboard/dashboard.html', {
        "student": student,
        "enrolled_courses": enrolled_courses,
        "available_courses": available_courses,
    })


def add_course(request):
    student_id = request.session.get('student_id')
    if not student_id:
        return redirect('login')

    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        request.session.flush()
        messages.error(request, "Your session has expired. Please log in again.")
        return redirect('login')

    if request.method == "POST":
        track = request.POST.get("track")
        valid_tracks = dict(Student.TRACK_CHOICES)
        if track in valid_tracks:
            Enrollment.objects.get_or_create(student=student, track=track)
            messages.success(request, f"Enrolled in {track}!")
        else:
            messages.error(request, "Invalid course selected.")

    return redirect('studentdashboard')


def logout_view(request):
    request.session.flush()
    return redirect('login')

def lesson(request):
    return render(request, "studentdashboard/lesson.html")

def certificate(request):
    return render(request, "studentdashboard/certificate.html")