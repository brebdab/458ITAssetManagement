# Generated by Django 3.0.2 on 2020-03-12 21:00

import django.contrib.postgres.fields.jsonb
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0022_auto_20200309_2153'),
    ]

    operations = [
        migrations.CreateModel(
            name='DecommissionedAsset',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('live_id', models.IntegerField()),
                ('decommissioning_user', models.CharField(max_length=150)),
                ('time_decommissioned', models.DateTimeField(auto_now_add=True)),
                ('asset_number', models.IntegerField(validators=[django.core.validators.MinValueValidator(100000), django.core.validators.MaxValueValidator(999999)])),
                ('hostname', models.CharField(blank=True, max_length=150, null=True)),
                ('rack_position', models.PositiveIntegerField()),
                ('model', django.contrib.postgres.fields.jsonb.JSONField()),
                ('rack', django.contrib.postgres.fields.jsonb.JSONField()),
                ('owner', models.CharField(blank=True, max_length=150, null=True)),
                ('power_connections', django.contrib.postgres.fields.jsonb.JSONField()),
                ('network_connections', django.contrib.postgres.fields.jsonb.JSONField()),
                ('network_graph', django.contrib.postgres.fields.jsonb.JSONField()),
            ],
            options={
                'verbose_name': 'asset',
                'ordering': ['asset_number'],
            },
        ),
    ]
