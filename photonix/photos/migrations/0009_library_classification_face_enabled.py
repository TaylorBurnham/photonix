# Generated by Django 3.2.3 on 2021-06-10 12:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('photos', '0008_auto_20210603_1442'),
    ]

    operations = [
        migrations.AddField(
            model_name='library',
            name='classification_face_enabled',
            field=models.BooleanField(default=False, help_text='Run face detection on photos?'),
        ),
    ]
