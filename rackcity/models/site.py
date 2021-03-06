from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.core.exceptions import ValidationError


class Site(models.Model):
    abbreviation = models.CharField(max_length=6, unique=True)
    name = models.CharField(max_length=150, unique=True)
    is_storage = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        try:
            self.full_clean()
        except ValidationError as validation_eror:
            raise validation_eror
        else:
            super(Site, self).save(*args, **kwargs)

    @staticmethod
    def get_datacenters():
        return Site.objects.filter(is_storage=False)

    @staticmethod
    def get_offline_storage_sites():
        return Site.objects.filter(is_storage=True)

    def user_has_site_level_permission(self, user):
        from rackcity.models import RackCityPermission

        try:
            user_permissions = RackCityPermission.objects.get(user=user)
        except ObjectDoesNotExist:
            return False
        else:
            return self in user_permissions.site_permissions.all()
