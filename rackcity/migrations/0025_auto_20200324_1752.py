# Generated by Django 3.0.2 on 2020-03-24 17:52

from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('rackcity', '0024_rackcityuser'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='RackCityUser',
            new_name='RackCityPermission',
        ),
    ]
