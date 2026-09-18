from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_POST
from instructor.models import Course, Enrollment, Lesson, LessonProgress, Quiz, QuizAttempt, Assignment, AssignmentSubmission
from django.utils import timezone
from django.db import models

def _is_instructor(user):
    return hasattr(user, 'instructor_profile')


@login_required
def studentdashboard(request):
    student = request.user

    # Already enrolled
    enrollments = (
        Enrollment.objects
        .filter(student=student)
        .select_related('course', 'course__instructor', 'course__instructor__user')
        .prefetch_related('course__lessons')
    )
    enrolled_ids = set(enrollments.values_list('course_id', flat=True))

    courses_data = []
    total_progress = 0
    completed_count = 0

    for enr in enrollments:
        course = enr.course
        total = course.lessons.count()
        done = LessonProgress.objects.filter(
            student=student, lesson__course=course
        ).count()
        pct = int(done / total * 100) if total else 0

        if pct == 100:
            completed_count += 1
        total_progress += pct

        courses_data.append({
            'course': course,
            'progress_pct': pct,
            'lessons_done': done,
            'total_lessons': total,
            'enrolled_at': enr.enrolled_at,
        })

    avg_progress = int(total_progress / len(courses_data)) if courses_data else 0

    # Search / browse (other tracks + other instructors)
    q = request.GET.get('q', '').strip()
    track_filter = request.GET.get('track', '').strip()

    available = (
        Course.objects
        .exclude(id__in=enrolled_ids)
        .select_related('instructor', 'instructor__user')
        .order_by('category', 'title')
    )

    if q:
        available = available.filter(
            models.Q(title__icontains=q) |
            models.Q(category__icontains=q) |
            models.Q(instructor__user__full_name__icontains=q) |
            models.Q(instructor__user__email__icontains=q)
        )

    if track_filter:
        available = available.filter(category=track_filter)

    # Only show search results when the user actually searched/filtered
    # (keeps the dashboard clean)
    show_results = bool(q or track_filter)

    # Distinct tracks for the filter dropdown
    from core.constants import TRACK_CHOICES
    all_tracks = TRACK_CHOICES

    return render(request, 'studentdashboard/dashboard.html', {
        'student': student,
        'courses_data': courses_data,
        'avg_progress': avg_progress,
        'completed_count': completed_count,
        'available_courses': available if show_results else [],
        'show_results': show_results,
        'q': q,
        'track_filter': track_filter,
        'all_tracks': all_tracks,
    })


@login_required
def course_detail(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    if not Enrollment.objects.filter(student=request.user, course=course).exists():
        messages.error(request, 'You are not enrolled in this course.')
        return redirect('studentdashboard')

    lessons = course.lessons.all().prefetch_related('materials', 'quiz', 'assignment')
    progress_ids = set(
        LessonProgress.objects.filter(student=request.user, lesson__course=course)
        .values_list('lesson_id', flat=True)
    )

    lesson_list = []
    for lesson in lessons:
        lesson_list.append({
            'lesson': lesson,
            'completed': lesson.id in progress_ids,
            'has_quiz': hasattr(lesson, 'quiz') and lesson.quiz.questions.exists(),
            'has_assignment': hasattr(lesson, 'assignment'),
            'materials': list(lesson.materials.all()),
        })

    return render(request, 'studentdashboard/course_detail.html', {
        'student': request.user,
        'course': course,
        'lesson_list': lesson_list,
    })


@login_required
@require_POST
def complete_lesson(request, lesson_id):
    lesson = get_object_or_404(Lesson, id=lesson_id)
    if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
        return redirect('studentdashboard')

    LessonProgress.objects.get_or_create(student=request.user, lesson=lesson)
    messages.success(request, f'“{lesson.title}” marked as complete.')
    return redirect('course_detail', course_id=lesson.course.id)


@login_required
def take_quiz(request, lesson_id):
    lesson = get_object_or_404(Lesson, id=lesson_id)
    if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
        return redirect('studentdashboard')

    quiz = getattr(lesson, 'quiz', None)
    if not quiz or not quiz.questions.exists():
        messages.error(request, 'No quiz for this lesson.')
        return redirect('course_detail', course_id=lesson.course.id)

    questions = list(quiz.questions.all())

    if request.method == 'POST':
        correct = 0
        for q in questions:
            ans = request.POST.get(f'q_{q.id}')
            if ans is not None and int(ans) == q.correct_index:
                correct += 1
        total = len(questions)
        passed = correct >= max(1, int(total * 0.6))  # 60% pass

        QuizAttempt.objects.create(
            student=request.user,
            lesson=lesson,
            correct=correct,
            total=total,
            passed=passed,
        )
        messages.success(request, f'Quiz submitted: {correct}/{total} correct.')
        return redirect('course_detail', course_id=lesson.course.id)

    return render(request, 'studentdashboard/take_quiz.html', {
        'student': request.user,
        'lesson': lesson,
        'questions': questions,
    })


@login_required
def submit_assignment(request, lesson_id):
    lesson = get_object_or_404(Lesson, id=lesson_id)
    assignment = getattr(lesson, 'assignment', None)
    if not assignment:
        messages.error(request, 'No assignment for this lesson.')
        return redirect('course_detail', course_id=lesson.course.id)

    if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
        return redirect('studentdashboard')

    existing = AssignmentSubmission.objects.filter(assignment=assignment, student=request.user).first()

    if request.method == 'POST':
        text = request.POST.get('text', '').strip()
        file = request.FILES.get('file')

        if assignment.submission_type == 'text' and not text:
            messages.error(request, 'Please enter a response.')
        elif assignment.submission_type != 'text' and not file and not existing:
            messages.error(request, 'Please upload a file.')
        else:
            if existing:
                if text:
                    existing.text = text
                if file:
                    existing.file = file
                existing.save()
            else:
                AssignmentSubmission.objects.create(
                    assignment=assignment,
                    student=request.user,
                    text=text,
                    file=file,
                )
            messages.success(request, 'Assignment submitted.')
            return redirect('course_detail', course_id=lesson.course.id)

    return render(request, 'studentdashboard/submit_assignment.html', {
        'student': request.user,
        'lesson': lesson,
        'assignment': assignment,
        'existing': existing,
    })

def logout_view(request):
    request.session.flush()
    return redirect('login')

def certificate(request):
    return render(request, "studentdashboard/certificate.html")


@login_required
@require_POST
def enroll_in_course(request, course_id):
    course = get_object_or_404(Course, id=course_id)

    # Optional safety: only allow courses that match the student's track
    if getattr(request.user, 'track', None) and course.category != request.user.track:
        messages.error(request, 'This course does not match your track.')
        return redirect('studentdashboard')

    Enrollment.objects.get_or_create(student=request.user, course=course)
    messages.success(request, f'You joined “{course.title}” with {course.instructor.user.full_name or course.instructor.user.email}.')
    return redirect('studentdashboard')


@login_required
@require_POST
def unenroll_course(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    deleted, _ = Enrollment.objects.filter(
        student=request.user,
        course=course
    ).delete()

    if deleted:
        messages.success(request, f'You left “{course.title}”.')
    else:
        messages.error(request, 'You were not enrolled in that course.')

    return redirect('studentdashboard')



