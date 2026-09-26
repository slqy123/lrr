from __future__ import annotations

from dataclasses import dataclass

from lanraragi_api import LANraragiAPI


@dataclass(slots=True)
class JobStatus:
    state: str
    archive_id: str | None = None
    title: str | None = None
    message: str = ""


class LrrClient:
    def __init__(self, url: str, key: str):
        self._api = LANraragiAPI(url, key)

    def submit(self, url: str) -> tuple[bool, int | None, str]:
        resp = self._api.misc.queue_url_to_download(url)
        if resp.success:
            return True, resp.job, ""
        return False, None, resp.error or "submit failed"

    def job_status(self, job_id: int) -> JobStatus:
        raw = self._api.minion.get_full_status(job_id)
        result = raw.result or {}
        return JobStatus(
            state=raw.state,
            archive_id=result.get("id"),
            title=result.get("title"),
            message=result.get("message", ""),
        )

    def urlfinder(self, url: str) -> str | None:
        response = self._api.misc.use_plugin(plugin="urlfinder", arg=url)
        if not response.success:
            return None
        return (response.data or {}).get("id")

    def ping(self) -> None:
        self._api.misc.get_server_information()
