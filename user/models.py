# user/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from core.constants import TRACK_CHOICES


class Student(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    track = models.CharField(max_length=100, choices=TRACK_CHOICES)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.full_name or self.email