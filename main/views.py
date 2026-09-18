from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings


def main(request):
    return render(request, 'main/index.html')

def event(request):
    return render(request, 'main/events.html')

def programs(request):
    return render(request, 'main/programs.html')


