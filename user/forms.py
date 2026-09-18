from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate
from core.constants import TRACK_CHOICES
from .models import Student


class StudentSignupForm(UserCreationForm):
    full_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={'placeholder': 'David Bajela', 'id': 'id_fullName'})
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'placeholder': 'you@lasustech.edu.ng', 'id': 'id_email'})
    )
    track = forms.ChoiceField(
        choices=TRACK_CHOICES,
        widget=forms.Select(attrs={'id': 'id_track'})
    )

    class Meta:
        model = Student
        fields = ('full_name', 'email', 'track', 'password1', 'password2')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({
            'placeholder': '••••••••', 'id': 'id_password1', 'minlength': '6',
        })
        self.fields['password2'].widget.attrs.update({
            'placeholder': '••••••••', 'id': 'id_password2', 'minlength': '6',
        })
        self.fields['password1'].help_text = None
        self.fields['password2'].help_text = None

    def clean_email(self):
        email = self.cleaned_data['email'].lower().strip()
        if Student.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('An account with this email already exists.')
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = user.email 
        user.email = self.cleaned_data['email']
        user.full_name = self.cleaned_data['full_name']
        name_parts = self.cleaned_data['full_name'].strip().split(' ', 1)
        user.first_name = name_parts[0]
        user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        user.track = self.cleaned_data['track']
        if commit:
            user.save()
        return user


class StudentLoginForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'placeholder': 'you@lasustech.edu.ng', 'id': 'id_email', 'autocomplete': 'email'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': '••••••••', 'id': 'id_password', 'autocomplete': 'current-password'})
    )
    remember = forms.BooleanField(required=False)

    def clean(self):
        cleaned = super().clean()
        email = cleaned.get('email', '').lower().strip()
        password = cleaned.get('password')

        if email and password:
            user = authenticate(username=email, password=password)
            if user is None:
                raise forms.ValidationError('Invalid email or password.')
            cleaned['user'] = user
        return cleaned