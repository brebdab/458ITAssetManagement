# Generated by Django 3.0.2 on 2020-03-29 22:44

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0039_auto_20200328_1701'),
    ]

    operations = [
        migrations.AlterField(
            model_name='powerportcp',
            name='power_connection',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='rackcity.PDUPortCP'),
        ),
    ]