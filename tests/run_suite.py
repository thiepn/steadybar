"""Run a browser suite and preserve its real exit status and failure diagnostics."""
from __future__ import annotations
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def main() -> int:
    if len(sys.argv) < 2:
        print('Usage: python tests/run_suite.py tests/suite.py [arguments]', file=sys.stderr)
        return 2
    root = Path(__file__).resolve().parent.parent
    script = Path(sys.argv[1]).resolve()
    if script.parent != root / 'tests' or script.suffix != '.py':
        raise ValueError('The suite must be a Python file in this repository’s tests directory.')
    started = time.monotonic()
    timeout = 840
    try:
        process = subprocess.run([sys.executable, '-u', str(script), *sys.argv[2:]],
                                 cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 text=True, timeout=timeout, check=False)
        output, code = process.stdout, process.returncode
    except subprocess.TimeoutExpired as error:
        output = error.stdout or ''
        if isinstance(output, bytes):
            output = output.decode('utf-8', errors='replace')
        output += f'\nSuite exceeded {timeout} seconds and was terminated.\n'
        code = 124
    report = {'suite': script.name, 'engine': os.environ.get('PLAYWRIGHT_ENGINE', 'chromium'),
              'exitCode': code, 'elapsedSeconds': round(time.monotonic() - started, 3),
              'renderHarness': '--render' in sys.argv or script.name == 'ci_render.py',
              'output': output[-60000:]}
    target = root / '.qa' / f'{script.stem}-results.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(output, end='')
    return code if code >= 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
