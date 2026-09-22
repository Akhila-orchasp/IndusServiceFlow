from rest_framework import serializers

from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContactMessage
        fields = [
            "id",
            "full_name",
            "email",
            "subject",
            "message",
            "is_read",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "is_read",
            "created_at",
        ]

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Full name is required."
            )

        if len(value) < 2:
            raise serializers.ValidationError(
                "Full name must be at least 2 characters."
            )

        if len(value) > 100:
            raise serializers.ValidationError(
                "Full name must not exceed 100 characters."
            )

        import re

        if not re.fullmatch(
            r"[A-Za-z]+(?:[ '-][A-Za-z]+)*",
            value,
        ):
            raise serializers.ValidationError(
                "Full name can contain only letters, spaces, hyphens and apostrophes."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Email address is required."
            )

        if len(value) > 254:
            raise serializers.ValidationError(
                "Email address must not exceed 254 characters."
            )

        return value

    def validate_subject(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Subject is required."
            )

        if len(value) < 3:
            raise serializers.ValidationError(
                "Subject must be at least 3 characters."
            )

        if len(value) > 150:
            raise serializers.ValidationError(
                "Subject must not exceed 150 characters."
            )

        return value

    def validate_message(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message is required."
            )

        if len(value) < 10:
            raise serializers.ValidationError(
                "Message must be at least 10 characters."
            )

        if len(value) > 2000:
            raise serializers.ValidationError(
                "Message must not exceed 2000 characters."
            )

        return value