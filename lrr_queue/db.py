from __future__ import annotations

from peewee import SqliteDatabase
from playhouse.migrate import SqliteMigrator, migrate

db = SqliteDatabase(None)


def init_db(path: str) -> None:
    db.init(path, pragmas={"journal_mode": "wal", "busy_timeout": 5000})


def ensure_schema() -> None:
    from .models import Task

    if db.table_exists(Task._meta.table_name):
        _dedupe_urls()
        _add_missing_columns(Task)
    db.create_tables([Task], safe=True)


def _add_missing_columns(model) -> None:
    table = model._meta.table_name
    existing = {column.name for column in db.get_columns(table)}
    migrator = SqliteMigrator(db)
    for field in model._meta.sorted_fields:
        if field.column_name not in existing:
            migrate(migrator.add_column(table, field.column_name, field))


def _dedupe_urls() -> None:
    db.execute_sql("DELETE FROM tasks WHERE id NOT IN (SELECT MIN(id) FROM tasks GROUP BY url)")
