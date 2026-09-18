import json
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, Max
from .models import Enrollment, LessonProgress, QuizAttempt, AssignmentSubmission, Qualification

from core.constants import TRACK_CHOICES
from .forms import (
    InstructorSignupForm, InstructorLoginForm, CourseForm, LessonForm,
    MaterialUploadForm, AssignmentForm,
)
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .models import Course, Lesson, Material, Quiz, QuizQuestion, Assignment

def _is_instructor(user):
    return hasattr(user, 'instructor_profile')


def instructor_signup(request):
    if request.method == 'POST':
        form = InstructorSignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            auth_login(request, user)
            messages.success(request, 'Account created!')
            return redirect('instructor_dashboard')
    else:
        form = InstructorSignupForm()

    return render(request, 'instructor/instructor-signup.html', {'form': form})


def instructor_login(request):
    if request.user.is_authenticated:
        if _is_instructor(request.user):
            return redirect('instructor_dashboard')
        else:
            auth_logout(request)

    if request.method == 'POST':
        form = InstructorLoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data['user']
            if not _is_instructor(user):
                form.add_error(None, 'This account is registered as a student. Please use the student login.')
            else:
                auth_login(request, user)
                if form.cleaned_data.get('remember'):
                    request.session.set_expiry(60 * 60 * 24 * 30)
                else:
                    request.session.set_expiry(0)
                return redirect('instructor_dashboard')
    else:
        form = InstructorLoginForm()

    return render(request, 'instructor/instructor-login.html', {'form': form})

def instructor_logout(request):
    auth_logout(request)
    return redirect('instructor_login')

def instructor(request):
    return render(request, "instructor/instructor.html")


@login_required(login_url='instructor_login')
def instructor_dashboard(request):
    if not _is_instructor(request.user):
        auth_logout(request)
        return redirect('instructor_login')

    instructor = request.user.instructor_profile
    course = getattr(instructor, 'course', None)
    if course is None:
        return redirect('create_course')

    lessons = list(course.lessons.all())
    quizzes_data = {}
    assignments_data = {}

    for lesson in lessons:
        materials_by_kind = {m.kind: m for m in lesson.materials.all()}
        lesson.materials_list = [
            ('video', 'Video', 'video/*', materials_by_kind.get('video')),
            ('notes', 'Lesson notes', 'application/pdf', materials_by_kind.get('notes')),
            ('slides', 'Slides', 'application/pdf', materials_by_kind.get('slides')),
        ]

        quiz = getattr(lesson, 'quiz', None)
        questions = list(quiz.questions.all()) if quiz else []
        lesson.quiz_count = len(questions)
        lesson.has_quiz = bool(questions)
        quizzes_data[lesson.id] = [
            {'text': q.text, 'options': q.options, 'correct': q.correct_index} for q in questions
        ]

        assignment = getattr(lesson, 'assignment', None)
        lesson.assignment_obj = assignment
        assignments_data[lesson.id] = {
            'title': assignment.title if assignment else '',
            'brief': assignment.brief if assignment else '',
            'submission_type': assignment.submission_type if assignment else 'text',
        }

    return render(request, 'instructor/instructor-dashboard.html', {
        'instructor': instructor,
        'course': course,
        'lessons': lessons,
        'quizzes_json': json.dumps(quizzes_data),
        'assignments_json': json.dumps(assignments_data),
        'max_quiz_questions': 60,
        'min_quiz_options': 2,
        'max_quiz_options': 6,
        'submission_types': Assignment.SUBMISSION_TYPES,
    })


@login_required(login_url='instructor_login')
@require_POST
def upload_material(request, lesson_id):
    lesson = _get_lesson_or_404(request, lesson_id)
    form = MaterialUploadForm(request.POST, request.FILES)
    if form.is_valid():
        Material.objects.update_or_create(
            lesson=lesson, kind=form.cleaned_data['kind'],
            defaults={'file': form.cleaned_data['file']}
        )
        messages.success(request, f"{form.cleaned_data['kind'].title()} uploaded.")
    else:
        messages.error(request, 'Upload failed — check the file and try again.')
    return redirect('instructor_dashboard')


@login_required(login_url='instructor_login')
@require_POST
def delete_material(request, lesson_id, kind):
    lesson = _get_lesson_or_404(request, lesson_id)
    Material.objects.filter(lesson=lesson, kind=kind).delete()
    messages.success(request, f'{kind.title()} removed.')
    return redirect('instructor_dashboard')


@login_required(login_url='instructor_login')
@require_POST
def save_quiz(request, lesson_id):
    lesson = _get_lesson_or_404(request, lesson_id)
    try:
        payload = json.loads(request.body)
        questions = payload.get('questions', [])
    except (ValueError, TypeError):
        return JsonResponse({'ok': False, 'error': 'Malformed request.'}, status=400)

    if not isinstance(questions, list) or not questions:
        return JsonResponse({'ok': False, 'error': 'Add at least one question before saving.'}, status=400)
    if len(questions) > 60:
        return JsonResponse({'ok': False, 'error': 'A lesson quiz can have at most 60 questions.'}, status=400)

    clean = []
    for i, q in enumerate(questions):
        text = str(q.get('text', '')).strip()
        options = [str(o).strip() for o in q.get('options', [])]
        correct = q.get('correct')
        if not text:
            return JsonResponse({'ok': False, 'error': f'Question {i+1} is missing its text.', 'index': i}, status=400)
        if not (2 <= len(options) <= 6) or any(not o for o in options):
            return JsonResponse({'ok': False, 'error': f'Question {i+1} needs 2–6 filled-in options.', 'index': i}, status=400)
        if not isinstance(correct, int) or not (0 <= correct < len(options)):
            return JsonResponse({'ok': False, 'error': f'Question {i+1} needs a correct answer selected.', 'index': i}, status=400)
        clean.append({'text': text, 'options': options, 'correct': correct})

    quiz, _ = Quiz.objects.get_or_create(lesson=lesson)
    quiz.questions.all().delete()
    for i, q in enumerate(clean):
        QuizQuestion.objects.create(
            quiz=quiz, text=q['text'], options=q['options'], correct_index=q['correct'], order=i
        )
    return JsonResponse({'ok': True})


@login_required(login_url='instructor_login')
@require_POST
def delete_quiz(request, lesson_id):
    lesson = _get_lesson_or_404(request, lesson_id)
    Quiz.objects.filter(lesson=lesson).delete()
    messages.success(request, 'Custom quiz removed.')
    return redirect('instructor_dashboard')


@login_required(login_url='instructor_login')
@require_POST
def save_assignment(request, lesson_id):
    lesson = _get_lesson_or_404(request, lesson_id)
    assignment = getattr(lesson, 'assignment', None)
    form = AssignmentForm(request.POST, instance=assignment)
    if form.is_valid():
        a = form.save(commit=False)
        a.lesson = lesson
        a.save()
        messages.success(request, 'Assignment saved.')
    else:
        messages.error(request, 'Please fill in all assignment fields.')
    return redirect('instructor_dashboard')


@login_required(login_url='instructor_login')
@require_POST
def delete_assignment(request, lesson_id):
    lesson = _get_lesson_or_404(request, lesson_id)
    Assignment.objects.filter(lesson=lesson).delete()
    messages.success(request, 'Assignment removed.')
    return redirect('instructor_dashboard')


def _get_lesson_or_404(request, lesson_id):
    instructor = request.user.instructor_profile
    course = getattr(instructor, 'course', None)
    return get_object_or_404(Lesson, id=lesson_id, course=course)


@login_required(login_url='instructor_login')
def create_course(request):
    instructor = getattr(request.user, 'instructor_profile', None)
    if instructor is None:
        return redirect('instructor_login')
    if hasattr(instructor, 'course'):
        return redirect('instructor_dashboard')

    if request.method == 'POST':
        form = CourseForm(request.POST)
        if form.is_valid():
            course = form.save(commit=False)
            course.instructor = instructor
            course.category = instructor.track
            # Auto-generate a sensible title from the track
            course.title = dict(TRACK_CHOICES).get(instructor.track, instructor.track)
            course.save()
            messages.success(request, 'Course created — now add your first lesson.')
            return redirect('instructor_dashboard')
    else:
        form = CourseForm()

    return render(request, 'instructor/create-course.html', {
        'form': form,
        'instructor': instructor,
        'track_name': dict(TRACK_CHOICES).get(instructor.track, instructor.track),
    })



@login_required(login_url='instructor_login')
def add_lesson(request):
    instructor = request.user.instructor_profile
    course = getattr(instructor, 'course', None)
    if course is None:
        return redirect('create_course')

    if request.method == 'POST':
        form = LessonForm(request.POST)
        if form.is_valid():
            lesson = form.save(commit=False)
            lesson.course = course
            lesson.order = course.lessons.count()
            lesson.save()
            messages.success(request, f'"{lesson.title}" added.')
            return redirect('instructor_dashboard')
    else:
        form = LessonForm()

    return render(request, 'instructor/add-lesson.html', {'form': form, 'course': course})


@login_required(login_url='instructor_login')
def delete_lesson(request, lesson_id):
    instructor = request.user.instructor_profile
    course = getattr(instructor, 'course', None)
    lesson = get_object_or_404(Lesson, id=lesson_id, course=course)
    if request.method == 'POST':
        lesson.delete()
        messages.success(request, 'Lesson removed.')
    return redirect('instructor_dashboard')


@login_required(login_url='instructor_login')
def instructor_students(request):
    if not _is_instructor(request.user):
        auth_logout(request)
        return redirect('instructor_login')

    instructor = request.user.instructor_profile
    course = getattr(instructor, 'course', None)
    if course is None:
        return redirect('create_course')

    enrollments = (
        Enrollment.objects
        .filter(course=course)
        .select_related('student')
        .annotate(
            lessons_done=Count('student__lesson_progress',
                               filter=Q(student__lesson_progress__lesson__course=course)),
            last_activity=Max('student__lesson_progress__completed_at'),
        )
        .order_by('-enrolled_at')
    )

    total_lessons = course.lessons.count()

    students_data = []
    for enr in enrollments:
        student = enr.student
        progress_pct = int((enr.lessons_done / total_lessons * 100)) if total_lessons else 0

        # latest quiz attempts for this course
        quiz_attempts = (
            QuizAttempt.objects
            .filter(student=student, lesson__course=course)
            .select_related('lesson')
            .order_by('-attempted_at')
        )

        # assignment submissions
        submissions = (
            AssignmentSubmission.objects
            .filter(student=student, assignment__lesson__course=course)
            .select_related('assignment', 'assignment__lesson')
            .order_by('-submitted_at')
        )

        qualified = Qualification.objects.filter(course=course, student=student).exists()

        students_data.append({
            'enrollment': enr,
            'student': student,
            'progress_pct': progress_pct,
            'lessons_done': enr.lessons_done,
            'total_lessons': total_lessons,
            'last_activity': enr.last_activity,
            'quiz_attempts': quiz_attempts,
            'submissions': submissions,
            'qualified': qualified,
        })

    return render(request, 'instructor/instructor-students.html', {
        'instructor': instructor,
        'course': course,
        'students_data': students_data,
        'total_enrolled': enrollments.count(),
    })


@login_required(login_url='instructor_login')
@require_POST
def mark_qualified(request, student_id):
    instructor = request.user.instructor_profile
    course = getattr(instructor, 'course', None)
    student = get_object_or_404(User, id=student_id)

    # only if student is enrolled
    if not Enrollment.objects.filter(course=course, student=student).exists():
        messages.error(request, 'Student is not enrolled in your course.')
        return redirect('instructor_students')

    Qualification.objects.get_or_create(
        course=course,
        student=student,
        defaults={'qualified_by': request.user}
    )
    messages.success(request, f'{student.full_name or student.email} marked as qualified.')
    return redirect('instructor_students')