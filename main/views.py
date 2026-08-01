from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from .models import ContactMessage

def main(request):
    if request.method == "POST" and "contact-submit" in request.POST:
        name = request.POST.get("name")
        email = request.POST.get("email")
        subject = request.POST.get("subject")
        message= request.POST.get("message")
        
        if not all([name, email, subject, message]):
            messages.error(request, "Please fill in all fields")
            return redirect("main")
        
        ContactMessage.objects.create(
            name=name,
            email=email,
            subject=subject,
            message=message,
        )
        
        try:
            send_mail(
                subject=f"New contact form: {subject}",
                message=f"From: {name} <{email}>\n\n{message}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.ADMIN_EMAIL],
                fail_silently=True,
            )
        except Exception:
            pass 
    return render(request, 'main/index.html')

def event(request):
    return render(request, 'main/events.html')

