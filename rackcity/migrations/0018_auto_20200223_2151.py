# Generated by Django 3.0.2 on 2020-02-23 21:51

from django.db import migrations
import rackcity.models.fields.rackcity_model_fields


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0017_auto_20200219_0319'),
    ]

    operations = [
        migrations.AlterField(
            model_name='itmodel',
            name='num_network_ports',
            field=rackcity.models.fields.rackcity_model_fields.RCPositiveIntegerField(blank=True, null=True),
        ),
    ]
