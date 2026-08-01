# core/models.py
# ONE file, all models. Replace core/models.py entirely with this.
from django.db import models


class LearnerProfile(models.Model):
    user_id = models.CharField(max_length=64, unique=True)

    # --- Day-1 onboarding (multi-answer fields are just comma-separated text —
    # simplest reliable way to support "each question can have multiple answers"
    # without a separate M2M table per field) ---
    stated_age = models.IntegerField(null=True, blank=True)
    prep_level = models.CharField(max_length=50, default="unassessed")
    domain_of_interest = models.CharField(max_length=300, default="general")  # comma-separated
    mother_tongue = models.CharField(max_length=200, blank=True, default="")  # comma-separated
    birthplace = models.CharField(max_length=200, blank=True, default="")
    residence = models.CharField(max_length=200, blank=True, default="")
    languages_spoken = models.CharField(max_length=300, blank=True, default="")  # comma-separated

    # --- Psychometric test (one-time, at onboarding) ---
    psych_score = models.IntegerField(default=3)          # 1-5 overall composite
    psych_raw_answers = models.TextField(blank=True, default="")  # JSON string of the 5 raw answers, for audit
    assessed_learning_age = models.CharField(max_length=20, default="unassessed")

    # --- Adaptive persona state (mutates via icebreaker + every interaction) ---
    regional_dialect = models.CharField(max_length=100, default="")
    current_persona_tone = models.CharField(max_length=50, default="warm and encouraging")
    preferred_metaphor_domain = models.CharField(max_length=100, default="general")
    pacing_speed = models.CharField(max_length=20, default="slow and detailed")
    frustration_score = models.IntegerField(default=0)
    current_node_id = models.CharField(max_length=100, default="")

    # --- Daily relevance / "talk of the town" cap ---
    last_icebreaker_at = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.user_id


class RelevanceLog(models.Model):
    """Every day's dynamic relevance check-in — the daily 'talk of the town' plus
    a deliberately unrelated/off-topic question used as an attention/coherence
    check (catches the model or the learner drifting off-track)."""
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="relevance_logs")
    relevant_question = models.TextField()
    relevant_answer = models.TextField(blank=True, default="")
    irrelevant_question = models.TextField(blank=True, default="")
    irrelevant_answer = models.TextField(blank=True, default="")
    extracted_interest = models.CharField(max_length=200, blank=True, default="")
    on_track = models.BooleanField(default=True)  # False if the irrelevant-check flags drift
    created_at = models.DateTimeField(auto_now_add=True)


class KnowledgeNode(models.Model):
    """Freeform/simple-topic nodes (NOT the same as Track/Module/Submodule below —
    this is for quick single-shot topics, tracks are for the full curriculum)."""
    node_id = models.CharField(max_length=140, primary_key=True)
    title = models.CharField(max_length=200)
    prerequisite_node_id = models.CharField(max_length=140, null=True, blank=True)
    next_node_id = models.CharField(max_length=140, null=True, blank=True)
    core_concept = models.TextField()
    difficulty_level = models.IntegerField(default=1)

    def __str__(self):
        return self.node_id


class MistakeLog(models.Model):
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="mistakes")
    node_id = models.CharField(max_length=140)
    user_answer = models.TextField()
    ai_feedback = models.TextField(blank=True, default="")
    fallback_node_id = models.CharField(max_length=140, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


class LessonLog(models.Model):
    """Every simple/direct lesson delivered — powers History + Library.
    Real multi-module curricula live in Track/Module/Submodule, not here."""
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="lessons")
    node_id = models.CharField(max_length=140)
    title = models.CharField(max_length=200)
    mode = models.CharField(max_length=20, default="normal")  # "normal" or "implicit-repair"
    user_answer = models.TextField(blank=True, default="")
    passed = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PrereqCheck(models.Model):
    """The '3+ prerequisite questions before teaching a simple topic' gate.
    If the learner fails enough of these, the topic escalates into a real Track
    instead of a single lesson."""
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="prereq_checks")
    topic = models.CharField(max_length=200)
    questions_json = models.TextField()       # JSON list of question strings
    answers_json = models.TextField(blank=True, default="")   # JSON list of answers, filled after submit
    pass_count = models.IntegerField(default=0)
    escalated_to_track = models.ForeignKey(
        "Track", on_delete=models.SET_NULL, null=True, blank=True, related_name="escalated_from"
    )
    created_at = models.DateTimeField(auto_now_add=True)


class Track(models.Model):
    """A finalized curriculum — 'CURRICULA' tab in the Tracks navigator.
    Created either directly (complex topic -> curate -> finalize) or via
    escalation from a failed PrereqCheck (simple topic that turned out to need
    real depth, or a cross-domain topic like an IT grad learning CAD)."""
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="tracks")
    title = models.CharField(max_length=200)
    overview = models.TextField(blank=True, default="")
    learning_objectives = models.TextField(blank=True, default="")
    source_topic = models.CharField(max_length=200)
    is_cross_domain = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class CurriculumIteration(models.Model):
    """One round of the iterative curriculum-drafting chat, before finalization."""
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="iterations")
    track = models.ForeignKey(Track, on_delete=models.CASCADE, null=True, blank=True, related_name="iterations")
    prompt_text = models.TextField()
    response_text = models.TextField()
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Module(models.Model):
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="modules")
    order = models.IntegerField()
    title = models.CharField(max_length=200)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.track.title} / Module {self.order}: {self.title}"


class Submodule(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="submodules")
    order = models.IntegerField()
    title = models.CharField(max_length=200)
    learning_material = models.TextField(blank=True, default="")   # generated on demand
    mermaid_diagram = models.TextField(blank=True, default="")      # raw mermaid code
    assignment_prompt = models.TextField(blank=True, default="")
    assignment_answer = models.TextField(blank=True, default="")
    assignment_done = models.BooleanField(default=False)
    research_prompt = models.TextField(blank=True, default="")
    research_done = models.BooleanField(default=False)
    frustration_score = models.IntegerField(default=0)  # own no-retry counter, per submodule

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.module.track.title} / {self.module.title} / {self.title}"
