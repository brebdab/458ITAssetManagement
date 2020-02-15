import re
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from .it_model import ITModel
from .rack import Rack


def validate_hostname(value):
    hostname_pattern = re.compile("[A-Za-z]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?")
    if hostname_pattern.fullmatch(value) is None:
        raise ValidationError(value + " is not a valid hostname as it is " +
                              "not compliant with RFC 1034")


def validate_owner(value):
    if (
        value != ""
        and value not in [obj.username for obj in User.objects.all()]
    ):
        raise ValidationError(
            "There is no existing user with the username " + value
        )


class Asset(models.Model):
    asset_number = models.IntegerField(
        unique=True,
        validators=[
            MinValueValidator(100000),
            MaxValueValidator(999999)
        ],
        blank=True
    )
    hostname = models.CharField(
        max_length=150,
        unique=True,
        validators=[validate_hostname]
    )
    elevation = models.PositiveIntegerField()
    model = models.ForeignKey(
        ITModel,
        on_delete=models.CASCADE,
        verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="related rack",
    )
    owner = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        validators=[validate_owner]
    )
    comment = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['hostname']
        verbose_name = 'asset'

    def save(self, *args, **kwargs):
        try:
            validate_hostname(self.hostname)
            if self.owner is not None:
                validate_owner(self.owner)
        except ValidationError as valid_error:
            raise valid_error
        else:
            if self.asset_number is None:
                for asset_number in range(100000, 999999):
                    try:
                        Asset.objects.get(asset_number=asset_number)
                    except ObjectDoesNotExist:
                        self.asset_number = asset_number
                        break
            super(Asset, self).save(*args, **kwargs)
