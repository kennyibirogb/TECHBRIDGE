from django.contrib import messages
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render

from core.decorators import admin_required

from instructor.models import (
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