# Generated by Django 3.0.2 on 2020-03-23 23:57

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0022_auto_20200309_2153'),
    ]

    operations = [
        migrations.CreateModel(
            name='PowerPortCP',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('port_name', models.CharField(max_length=150)),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rackcity.AssetCP', verbose_name='asset')),
                ('change_plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rackcity.ChangePlan')),
                ('power_connection', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='rackcity.PDUPort')),
            ],
        ),
        migrations.CreateModel(
            name='PDUPortCP',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('left_right', models.CharField(choices=[('L', 'L'), ('R', 'R')], max_length=1)),
                ('port_number', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(24)])),
                ('change_plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rackcity.ChangePlan')),
                ('rack', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rackcity.Rack', verbose_name='rack')),
            ],
        ),
        migrations.CreateModel(
            name='NetworkPortCP',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('port_name', models.CharField(max_length=150)),
                ('mac_address', models.CharField(blank=True, max_length=17, null=True)),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rackcity.AssetCP', verbose_name='asset')),
                ('change_plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='rackcity.ChangePlan')),
                ('connected_port', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='rackcity.NetworkPortCP')),
            ],
        ),
        migrations.AddConstraint(
            model_name='powerportcp',
            constraint=models.UniqueConstraint(fields=('asset', 'port_name', 'change_plan'), name='unique power port names on change plan assets'),
        ),
        migrations.AddConstraint(
            model_name='pduportcp',
            constraint=models.UniqueConstraint(fields=('rack', 'left_right', 'port_number', 'change_plan'), name='unique port per pdu for each change plan'),
        ),
        migrations.AddConstraint(
            model_name='networkportcp',
            constraint=models.UniqueConstraint(fields=('asset', 'port_name', 'change_plan'), name='unique network port names on change plan assets'),
        ),
    ]
