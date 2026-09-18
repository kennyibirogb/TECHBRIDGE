from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login as auth_login, logout as auth_logout
from .forms import StudentSignupForm, StudentLoginForm




def _is_instructor(user):
    return hasattr(user, 'instructor_profile')


def signup(request):
    if request.method == 'POST':
        form = StudentSignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            auth_login(request, user)
            messages.success(request, 'Account created!')
            return redirect('studentdashboard')
    else:
        form = StudentSignupForm()
        track = request.GET.get('track')
        if track:
            form.fields['track'].initial = track

    return render(request, 'user/signup.html', {'form': form})


def login(request):
    if request.user.is_authenticated:
        if _is_instructor(request.user):
            auth_logout(request)
        else:
            return redirect('studentdashboard')

    if request.method == 'POST':
        form = StudentLoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data['user']
            if _is_instructor(user):
                form.add_error(None, 'This account is registered as an instructor. Please use the instructor login.')
            else:
                auth_login(request, user)
                response = redirect('studentdashboard')
                if form.cleaned_data.get('remember'):
                    response.set_cookie('remember_email', user.email, max_age=60 * 60 * 24 * 30)
                else:
                    response.delete_cookie('remember_email')
                return response
    else:
        initial = {}
        if 'remember_email' in request.COOKIES:
            initial['email'] = request.COOKIES['remember_email']
            initial['remember'] = True
        form = StudentLoginForm(initial=initial)

    return render(request, 'user/login.html', {'form': form})


def verify(request):
    return render(request, 'user/verify-email.html')


def logout_view(request):
    auth_logout(request)
    return redirect('login')