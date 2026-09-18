from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate, get_user_model
from .models import Instructor, Course, Lesson, Material, Assignment

User = get_user_model()


class InstructorSignupForm(UserCreationForm):
    full_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={'placeholder': 'David Bajela', 'id': 'id_fullName'})
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'placeholder': 'you@lasustech.edu.ng', 'id': 'id_email'})
    )

    class Meta:
        model = User
        fields = ('full_name', 'email', 'password1', 'password2')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'placeholder': '••••••••', 'id': 'id_password1', 'minlength': '6'})
        self.fields['password2'].widget.attrs.update({'placeholder': '••••••••', 'id': 'id_password2', 'minlength': '6'})
        self.fields['password1'].help_text = None
        self.fields['password2'].help_text = None

    def clean_email(self):
        email = self.cleaned_data['email'].lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('An account with this email already exists.')
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['email']
        user.email = self.cleaned_data['email']
        user.full_name = self.cleaned_data['full_name']
        name_parts = self.cleaned_data['full_name'].strip().split(' ', 1)
        user.first_name = name_parts[0]
        user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        if commit:
            user.save()
            Instructor.objects.create(user=user)
        return user


class InstructorLoginForm(forms.Form):
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

class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['title', 'category', 'description']
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': 'e.g. Intro to Cloud Computing'}),
            'category': forms.TextInput(attrs={'placeholder': 'e.g. Cloud Engineering'}),
            'description': forms.Textarea(attrs={'rows': 3}),
        }


class LessonForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = ['title', 'duration_minutes']
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': 'e.g. What is a container?'}),
            'duration_minutes': forms.NumberInput(attrs={'min': 1, 'placeholder': 'Minutes'}),
        }


class MaterialUploadForm(forms.Form):
    kind = forms.ChoiceField(choices=Material.KIND_CHOICES, widget=forms.HiddenInput)
    file = forms.FileField()


class AssignmentForm(forms.ModelForm):
    class Meta:
        model = Assignment
        fields = ['title', 'brief', 'submission_type']
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': 'e.g. Deploy a container to a VM'}),
            'brief': forms.Textarea(attrs={'rows': 4, 'placeholder': 'Describe what students need to submit...'}),
        }