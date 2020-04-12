# Generated by Django 3.0.3 on 2020-04-11 05:53

import django.contrib.postgres.fields.jsonb
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0048_auto_20200411_0151'),
    ]

    operations = [
        migrations.AddField(
            model_name='decommissionedasset',
            name='chassis',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='decommissionedasset',
            name='chassis_slot',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]