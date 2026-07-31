# core/management/commands/seed_nodes.py
# Run with: python manage.py seed_nodes
from django.core.management.base import BaseCommand
from core.models import KnowledgeNode


class Command(BaseCommand):
    help = "Seeds the Addition -> Addition with Carryover -> Multiplication node chain"

    def handle(self, *args, **options):
        KnowledgeNode.objects.update_or_create(
            node_id="math_addition",
            defaults=dict(
                title="Addition",
                prerequisite_node_id=None,
                next_node_id="math_addition_carryover",
                core_concept="Adding two numbers combines their values into a single total.",
                difficulty_level=1,
            ),
        )
        KnowledgeNode.objects.update_or_create(
            node_id="math_addition_carryover",
            defaults=dict(
                title="Addition with Carryover",
                prerequisite_node_id="math_addition",
                next_node_id="math_multiplication",
                core_concept="When a column's sum exceeds 9, carry the extra ten into the next column left.",
                difficulty_level=2,
            ),
        )
        KnowledgeNode.objects.update_or_create(
            node_id="math_multiplication",
            defaults=dict(
                title="Multiplication",
                prerequisite_node_id="math_addition_carryover",
                next_node_id=None,
                core_concept="Multiplication is repeated addition of the same number a set number of times.",
                difficulty_level=3,
            ),
        )
        self.stdout.write(self.style.SUCCESS("Seeded 3 knowledge nodes."))