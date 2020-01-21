from django.db import models

class User(models.Model): 
    user_id = models.CharField(max_length=120)

    def save(self, *args, **kwargs): 
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs): 
        super().delete(*args, **kwargs)

    class Meta: 
        ordering = [user_id]

        def __str__(self):
            return self.user_id