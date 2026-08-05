from django.db import models

class Student(models.Model):
    TRACK_CHOICES = [
        ("AI & Machine Learning", "AI & Machine Learning"),
        ("Robotics", "Robotics"),
        ("Cybersecurity", "Cybersecurity"),
        ("Software Development", "Software Development"),
        ("IoT", "IoT"),
        ("Startup Incubation", "Startup Incubation"),
        ("UI/UX Design", "UI/UX Design"),
        ("Data Science", "Data Science"),
        ("Mobile Dev", "Mobile Dev"),
        ("Cloud Computing", "Cloud Computing"),
        ("Game Development Lab", "Game Development Lab"),
        ("Digital Marketing & Growth", "Digital Marketing & Growth"),
        ("Product Management Foundations", "Product Management Foundations"),
        ("DevOps & Site Reliability", "DevOps & Site Reliability"),
        ("AR/VR & Immersive Tech", "AR/VR & Immersive Tech"),
    ]

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    date_of_birth = models.DateField()
    track = models.CharField(max_length=50, choices=TRACK_CHOICES)  # primary/signup track — unchanged
    password = models.CharField(max_length=128)
    created_at = models.DateField(auto_now_add=True)

    def all_tracks(self):
        """Primary track + any extra enrollments, deduped, in enrollment order."""
        extra = list(self.enrollments.values_list("track", flat=True))
        tracks = [self.track] + [t for t in extra if t != self.track]
        return tracks

    def __str__(self):
        return self.full_name


class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    track = models.CharField(max_length=50, choices=Student.TRACK_CHOICES)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "track")

    def __str__(self):
        return f"{self.student.full_name} → {self.track}"