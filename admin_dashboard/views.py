from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.shortcuts import render, redirect

from .forms import AdminSignupForm, AdminLoginForm


def admin_signup(request):
    if request.method == "POST":
        form = AdminSignupForm(request.POST)
        if form.is_valid():
            data = form.cleaned_data

            # Check the admin access code
            if data["admin_code"] != settings.ADMIN_SIGNUP_CODE:
                messages.error(request, "Invalid admin access code.")
                return render(request, "admin_dashboard/adminsignup.html", {"form": form})

            # Create the user, mark as staff (admin), NOT superuser
            user = User.objects.create_user(
                username=data["email"],       # using email as username
                email=data["email"],
                password=data["password"],
                first_name=data["fullname"],
            )
            user.is_staff = True
            user.save()

            messages.success(request, "Admin account created. Please log in.")
            return redirect("admin_login")
    else:
        form = AdminSignupForm()

    return render(request, "admin_dashboard/adminsignup.html", {"form": form})


def admin_login(request):
    if request.method == "POST":
        form = AdminLoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data["email"]
            password = form.cleaned_data["password"]

            user = authenticate(request, username=email, password=password)

            if user is not None and user.is_staff:
                login(request, user)
                return redirect("admin_dashboard")  # change to your actual dashboard url name
            else:
                messages.error(request, "Invalid credentials or not an admin account.")
    else:
        form = AdminLoginForm()

    return render(request, "admin_dashboard/adminlogin.html", {"form": form})


def admin_logout(request):
    logout(request)
    return redirect("admin_login")

def admin_dashboard(request):
    return render(request, "admin_dashboard/admindashboard.html")