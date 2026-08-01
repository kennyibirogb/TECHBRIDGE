from django.shortcuts import render, redirect
from django.contrib import messages
from user.models import Student

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

    return render(request, 'studentdashboard/dashboard.html', {
        "student": student
    })
    
def logout_view(request):
    request.session.flush()
    return redirect('login')