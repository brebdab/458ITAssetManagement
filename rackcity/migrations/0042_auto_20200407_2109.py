# Generated by Django 3.0.3 on 2020-04-08 01:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0041_itmodel_model_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='itmodel',
            name='height',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
