"""Build a self-contained Windows demo; never reads operational data or credentials."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--runtime-manifest', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = json.loads(Path(args.runtime_manifest).read_text())
archive = Path(manifest['archive'])
if hashlib.sha256(archive.read_bytes()).hexdigest() != manifest['sha256']:
    raise RuntimeError('O runtime não corresponde ao checksum oficial verificado.')
if not manifest['source'].startswith('https://nodejs.org/dist/'):
    raise RuntimeError('Origem inesperada do runtime.')
output = Path(args.output).resolve()
if output.exists():
    raise RuntimeError('O destino já existe; nenhum arquivo será sobrescrito.')
if not (root / 'dist/index.html').exists():
    raise RuntimeError('Execute npm run build antes de empacotar.')
output.parent.mkdir(parents=True, exist_ok=True)
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
clean = not subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True).strip()
prefix = 'REVO-Processos-Offline/'
excluded_roots = {'data', 'data-demo', 'attachments', 'generated_images', 'test-results', 'playwright-report', '.git'}
excluded_modules = {'@playwright', 'playwright', 'playwright-core', 'prettier', '@esbuild', '@rollup', 'esbuild', 'rollup', 'vite'}
source_files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
checksums = {}

def add(z, path, name):
    content = Path(path).read_bytes()
    z.writestr(prefix + name, content)
    checksums[name] = hashlib.sha256(content).hexdigest()

with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for name in sorted(set(source_files)):
        if not name:
            continue
        path = Path(name)
        if path.parts[0] in excluded_roots or path.suffix.lower() in {'.sqlite', '.db', '.xlsx', '.key', '.pem', '.zip', '.pyc'} or path.name.startswith('.env'):
            continue
        full = root / path
        if full.is_file() and not full.is_symlink():
            add(z, full, name)
    for path in sorted((root / 'dist').rglob('*')):
        if path.is_file():
            add(z, path, path.relative_to(root).as_posix())
    modules = root / 'node_modules'
    for folder, dirs, files in os.walk(modules, followlinks=False):
        relative = Path(folder).relative_to(modules)
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__' and not (relative == Path('.') and d in excluded_modules)]
        for name in files:
            path = Path(folder) / name
            if name.startswith('.') or path.is_symlink():
                continue
            add(z, path, path.relative_to(root).as_posix())
    runtime_root = 'node-' + manifest['version'] + '-win-x64/'
    with zipfile.ZipFile(archive) as runtime:
        for original, target in [('node.exe', 'runtime/node.exe'), ('LICENSE', 'runtime/LICENSE.txt')]:
            content = runtime.read(runtime_root + original)
            z.writestr(prefix + target, content)
            checksums[target] = hashlib.sha256(content).hexdigest()
    z.writestr(prefix + 'VERSAO-PACOTE.json', json.dumps({'sourceCommit': commit, 'sourceTreeClean': clean, 'platform': 'Windows x64', 'runtime': {k: manifest[k] for k in ['version', 'source', 'sha256', 'verifiedAgainst']}, 'containsOperationalData': False, 'internetRequiredToRun': False}, ensure_ascii=False, indent=2) + '\n')
    z.writestr(prefix + 'CHECKSUMS.json', json.dumps(checksums, indent=2) + '\n')
with zipfile.ZipFile(output) as verified:
    if verified.testzip() is not None:
        raise RuntimeError('Falha na verificação do ZIP.')
    assert prefix + 'INICIAR-REVO.bat' in verified.namelist()
    assert prefix + 'runtime/node.exe' in verified.namelist()
    assert prefix + 'dist/index.html' in verified.namelist()
    assert not any(name.startswith(prefix + d + '/') for name in verified.namelist() for d in ['data', 'data-demo', 'attachments'])
print(json.dumps({'package': str(output), 'bytes': output.stat().st_size, 'sourceCommit': commit, 'sourceTreeClean': clean, 'zipVerified': True}, ensure_ascii=False))
