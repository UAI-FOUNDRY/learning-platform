"""Runs learner code somewhere safe and reports what happened.

CODE_RUNNER=disabled  no execution (Run/Submit answer 503)
CODE_RUNNER=judge0    a Judge0 server does the work in a sandbox (use this in production)
CODE_RUNNER=local     runs on this machine with basic limits. Development only: it is NOT a security sandbox.
Tests replace `code_runner.backend` with a stub.
"""
import base64
import logging
import os
import resource
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

# status names match coding_submissions.status
OK = "accepted"          # for a plain run: "it ran and exited normally"
RUNTIME_ERROR, COMPILE_ERROR = "runtime_error", "compile_error"
TIME_LIMIT, MEMORY_LIMIT, INTERNAL = "time_limit_exceeded", "memory_limit_exceeded", "internal_error"

JUDGE0_LANGUAGE_IDS = {"python": 71, "c": 50, "cpp": 54, "javascript": 63, "java": 62, "sql": 82}


class RunnerUnavailable(Exception):
    """No code runner is configured."""


@dataclass
class RunResult:
    status: str
    stdout: str = ""
    stderr: str = ""
    time_ms: Optional[int] = None
    memory_kb: Optional[int] = None


class DisabledRunner:
    name = "disabled"

    def supports(self, language: str) -> bool:
        return False

    def execute(self, language, source, stdin, time_limit_ms, memory_limit_mb) -> RunResult:
        raise RunnerUnavailable("Code execution is not configured on this server")


class Judge0Runner:
    name = "judge0"

    def __init__(self, transport: Optional[httpx.BaseTransport] = None) -> None:
        self._transport = transport

    def supports(self, language: str) -> bool:
        return language in JUDGE0_LANGUAGE_IDS

    @staticmethod
    def _b64(text: str) -> str:
        return base64.b64encode((text or "").encode()).decode()

    @staticmethod
    def _unb64(text: Optional[str]) -> str:
        if not text:
            return ""
        try:
            return base64.b64decode(text).decode(errors="replace")
        except Exception:
            return text

    def execute(self, language, source, stdin, time_limit_ms, memory_limit_mb) -> RunResult:
        if not settings.JUDGE0_URL:
            raise RunnerUnavailable("JUDGE0_URL is not set")
        headers = {"Content-Type": "application/json"}
        if settings.JUDGE0_AUTH_TOKEN:
            headers[settings.JUDGE0_AUTH_HEADER or "X-Auth-Token"] = settings.JUDGE0_AUTH_TOKEN
        payload = {
            "source_code": self._b64(source), "language_id": JUDGE0_LANGUAGE_IDS[language], "stdin": self._b64(stdin),
            "cpu_time_limit": max(time_limit_ms, 100) / 1000.0, "memory_limit": int(memory_limit_mb) * 1024,
        }
        try:
            with httpx.Client(timeout=30, transport=self._transport) as client:
                response = client.post(f"{settings.JUDGE0_URL.rstrip('/')}/submissions?base64_encoded=true&wait=true",
                                       json=payload, headers=headers)
            if response.status_code >= 300:
                logger.error("Judge0 error %s: %s", response.status_code, response.text[:300])
                return RunResult(INTERNAL, stderr="The code runner is not available right now")
            data = response.json()
        except (httpx.HTTPError, ValueError):
            logger.exception("Judge0 request failed")
            return RunResult(INTERNAL, stderr="The code runner is not available right now")
        status_id = (data.get("status") or {}).get("id")
        stdout, stderr = self._unb64(data.get("stdout")), self._unb64(data.get("stderr"))
        compile_output = self._unb64(data.get("compile_output"))
        message = self._unb64(data.get("message"))
        time_ms = int(float(data["time"]) * 1000) if data.get("time") else None
        memory = int(data["memory"]) if data.get("memory") is not None else None
        if status_id in (3, 4):                 # accepted / wrong answer (Judge0 compares only if expected_output is sent)
            status_name = OK
        elif status_id == 5:
            status_name = TIME_LIMIT
        elif status_id == 6:
            status_name, stderr = COMPILE_ERROR, compile_output or stderr
        elif status_id in (7, 8, 9, 10, 11, 12):
            status_name = RUNTIME_ERROR
            if memory and memory >= int(memory_limit_mb) * 1024:
                status_name = MEMORY_LIMIT
            stderr = stderr or message
        else:
            status_name, stderr = INTERNAL, message or stderr or "The code runner failed"
        return RunResult(status_name, stdout, stderr, time_ms, memory)


class LocalRunner:
    """Development convenience: python and javascript (if Node is installed) with CPU/memory limits and a timeout."""
    name = "local"

    def supports(self, language: str) -> bool:
        return language == "python" or (language == "javascript" and shutil.which("node") is not None)

    def execute(self, language, source, stdin, time_limit_ms, memory_limit_mb) -> RunResult:
        if not self.supports(language):
            raise RunnerUnavailable(f"The local runner cannot run {language}")
        ext, command = (".py", [sys.executable, "-I"]) if language == "python" else (".js", [shutil.which("node")])
        limit_bytes = max(int(memory_limit_mb), 64) * 1024 * 1024 * (4 if language == "javascript" else 1)

        def limits():
            resource.setrlimit(resource.RLIMIT_CPU, (max(time_limit_ms // 1000, 1) + 1,) * 2)
            if language == "python":
                resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))
            resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))

        with tempfile.TemporaryDirectory() as workdir:
            path = os.path.join(workdir, "main" + ext)
            with open(path, "w") as handle:
                handle.write(source)
            started = time.monotonic()
            try:
                proc = subprocess.run(command + [path], input=stdin or "", capture_output=True, text=True, cwd=workdir,
                                      timeout=max(time_limit_ms, 100) / 1000.0, env={"PATH": "/usr/bin:/bin"},
                                      preexec_fn=limits)
            except subprocess.TimeoutExpired:
                return RunResult(TIME_LIMIT, stderr="Time limit exceeded",
                                 time_ms=int((time.monotonic() - started) * 1000))
            elapsed = int((time.monotonic() - started) * 1000)
        out, err = proc.stdout[:65536], proc.stderr[:8192]
        if proc.returncode == 0:
            return RunResult(OK, out, err, elapsed)
        if "MemoryError" in err:
            return RunResult(MEMORY_LIMIT, out, err, elapsed)
        return RunResult(RUNTIME_ERROR, out, err, elapsed)


class CodeRunnerFacade:
    """Picks the runner from CODE_RUNNER on every call, so tests can swap `backend`."""
    backend = None   # tests may assign a stub

    def _current(self):
        if self.backend is not None:
            return self.backend
        mode = (settings.CODE_RUNNER or "disabled").lower()
        if mode == "judge0":
            return Judge0Runner()
        if mode == "local":
            return LocalRunner()
        return DisabledRunner()

    @property
    def name(self) -> str:
        return self._current().name

    def available(self) -> bool:
        return self._current().name != "disabled"

    def supports(self, language: str) -> bool:
        return self._current().supports(language)

    def execute(self, language, source, stdin, time_limit_ms, memory_limit_mb) -> RunResult:
        return self._current().execute(language, source, stdin, time_limit_ms, memory_limit_mb)


code_runner = CodeRunnerFacade()
