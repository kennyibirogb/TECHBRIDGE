from django.db import models

class Student(models.Model):
    TRACK_CHOICES = [
        ("AI & Machine Learning", "AI & Machine Learning"),
        ("Robotics", "Robotics"),
        ("Cybersecurity", "Cybersecurity"),
        ("Software Development", "Software Development"),
        ("IoT", "IoT"),
        ("Startup Incubation", "Startup Incubation"),
    ]
    
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    date_of_birth = models.DateField()
    track = models.CharField(max_length=50, choices=TRACK_CHOICES)
    password = models.CharField(max_length=128)
    created_at = models.DateField(auto_now_add=True)
    
    
    def __str__(self):
        return self.full_name
