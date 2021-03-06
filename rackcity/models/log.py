from .it_model import ITModel
from django.contrib.auth.models import User
from django.db import models
from .asset import Asset


class Log(models.Model):
    date = models.DateTimeField(auto_now=True, blank=True, editable=False)
    log_content = models.TextField()
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, verbose_name="related user", null=True,
    )
    related_asset = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        verbose_name="related asset",
        null=True,
        blank=True,
    )
    related_model = models.ForeignKey(
        ITModel,
        on_delete=models.SET_NULL,
        verbose_name="related model",
        null=True,
        blank=True,
    )
