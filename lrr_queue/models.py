from __future__ import annotations

import time
from enum import StrEnum

from peewee import AutoField, FloatField, IntegerField, Model, TextField

from .db import db


class Status(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    DEAD = "dead"
    CANCELLED = "cancelled"


class Task(Model):
    id = AutoField()
    url = TextField(unique=True)
    status = TextField(default=Status.PENDING.value)
    priority = IntegerField(default=0)
    attempts = IntegerField(default=0)
    max_attempts = IntegerField(default=3)
    lrr_job_id = IntegerField(null=True)
    lrr_archive_id = TextField(null=True)
    title = TextField(null=True)
    error = TextField(default="")
    source = TextField(default="")
    next_attempt_at = FloatField(default=0.0)
    created_at = FloatField(default=time.time)
    updated_at = FloatField(default=time.time)
    submitted_at = FloatField(null=True)
    finished_at = FloatField(null=True)

    class Meta:
        database = db
        table_name = "tasks"
        indexes = ((("status", "priority", "next_attempt_at"), False),)
