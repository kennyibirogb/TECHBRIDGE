from django.shortcuts import render, redirect
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.decorators import login_required


def _is_instructor(user):
    return hasattr(user, 'instructor_profile')


@login_required(login_url='login')
def studentdashboard(request):
    if _is_instructor(request.user):
        auth_logout(request)
        return redirect('login')

    student = request.user

    return render(request, 'studentdashboard/dashboard.html', {
        "student": student,
    })


def add_course(request):
    return redirect('studentdashboard')


def logout_view(request):
    request.session.flush()
    return redirect('login')

def lesson(request):
    return render(request, "studentdashboard/lesson.html")

def certificate(request):
    return render(request, "studentdashboard/certificate.html")






