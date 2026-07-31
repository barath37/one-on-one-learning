# core/admin.py
from django.contrib import admin
from .models import LearnerProfile, KnowledgeNode, MistakeLog

admin.site.register(LearnerProfile)
admin.site.register(KnowledgeNode)
admin.site.register(MistakeLog)