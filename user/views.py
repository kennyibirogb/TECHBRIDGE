from django.shortcuts import render, redirect
from django.contrib.auth.hashers import make_password, check_password
from django.contrib import messages
from .models import Student 

def signup(request):
    if request.method == "POST":
        email = request.POST["email"]
        phone=request.POST["phone"]
        
        if Student.objects.filter(email=email).exists():
            messages.error(request, "Email already registered!!")
            return redirect("signup")
        
        if Student.objects.filter(phone=phone).exists():
            messages.error(request, "Phone Number already registered!!")
            return redirect("signup")
        
        Student.objects.create(
            full_name=request.POST["fullname"],
            email=email,
            phone=phone,
            date_of_birth=request.POST["dob"],
            track=request.POST["track"],
            password=make_password(request.POST["password"])
        )
        messages.success(request, "Account created successfully.")
        return redirect("login")
    
    return render(request, "user/signup.html")

def login(request):
    if request.method == "POST":
        identifier = request.POST.get('identifier')
        password = request.POST.get("password")
        
        try:
            if "@" in identifier:
                student = Student.objects.get(email=identifier)
            else:
                student = Student.objects.get(phone=identifier)
        except Student.DoesNotExist:
            messages.error(request, "Invalid email/phone or password!!")
            return redirect("login")
            
        if check_password(password, student.password):
            request.session['student_id'] = student.id
            return redirect("studentdashboard")
        else:
            messages.error(request, "Invalid email/phone or password!!")
            return redirect("login")
    return render(request, "user/login.html")
