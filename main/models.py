from django.db import models

class ContactMessage(models.Model):
    SUBJECT_CHOICES = [
        ('Next cohort', 'Next cohort'),
        ('Studio visit', 'Studio visit'),
        ('partnership', 'Partnership'),
        ('Teaching / mentoring', 'Teaching / mentoring'),
        ('Something else', 'Something else'),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=50, choices=SUBJECT_CHOICES, default="Something else")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.subject} ({self.created_at:%Y-%m-%d})"

