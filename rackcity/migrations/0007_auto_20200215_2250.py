# Generated by Django 3.0.2 on 2020-02-15 22:50

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0006_networkport'),
    ]

    operations = [
        migrations.AlterField(
            model_name='networkport',
            name='mac_address',
            field=models.CharField(blank=True, max_length=17, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='networkport',
            name='network_connection',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='rackcity.NetworkPort'),
        ),
    ]