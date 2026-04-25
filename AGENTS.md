# AGENTS.md — Vibegram Development Rules

> Instruksi ini WAJIB diikuti oleh semua AI agent (Codex, Claude, Copilot, dll) saat bekerja di repository ini.
> Pelanggaran aturan ini pernah menyebabkan broken publish dan revert darurat.

---

## Identitas Proyek

- **Nama**: vibegram
- **Tipe**: npm library (Telegram Bot Framework)
- **Bahasa**: TypeScript (strict mode, target ES2022)
- **Runtime**: Node.js >= 18
- **Output**: Dual — CJS (`dist/cjs/`) + ESM (`dist/esm/`) + Type declarations (`dist/types/`)
- **Registry**: npmjs.com/package/vibegram
- **Docs**: VitePress (EN + ID) di `docs/`

---

## 1. Aturan Mutlak (JANGAN DILANGGAR)

### 1.1 Jangan Pernah Publish Versi yang Sudah Ada di npm

npm **tidak mengizinkan** re-publish versi yang sama, bahkan setelah `npm unpublish`.
Sebelum bump versi, SELALU cek dulu:

```bash
npm view vibegram versions --json
```

Versi yang **sudah terpakai dan tidak boleh digunakan lagi**:

- `1.0.0-rc.1`, `1.0.0-rc.2`, `1.0.0`, `1.0.1`
- `1.1.0` (npm menolak publish sebagai versi yang pernah dipakai meskipun sempat tidak muncul di daftar)
- `1.2.0` (sudah publish sebagai latest pada 2026-04-25)
- `1.1.1`, `1.1.2` (pernah gagal publish, status tidak pasti — hindari)

Versi berikutnya yang aman: `1.2.1` untuk patch atau `1.3.0` untuk minor (cek dulu via command di atas).

### 1.2 Jangan Ubah CI Publish Trigger ke Tag-Based

CI publish **HARUS** tetap menggunakan push-to-main + version-check. Percobaan sebelumnya menggunakan tag-based trigger (`on: push: tags:`) gagal dan menyebabkan revert darurat. Trigger yang benar ada di `.github/workflows/ci.yml`:

```yaml
# BENAR — publish hanya jika versi lokal berbeda dari npm
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
# Lalu di step version_check: bandingkan LOCAL_VERSION vs REMOTE_VERSION
```

### 1.3 Jangan Commit `dist/`, `node_modules/`, atau `.env`

File-file ini ada di `.gitignore`. Jangan pernah:

- `git add dist/` atau `git add -A` (bisa menangkap file yang tidak seharusnya)
- Commit file berisi secret (token, API key)

Selalu stage file secara **eksplisit**: `git add src/file.ts tests/file.test.ts`

### 1.4 Jangan Push Langsung Tanpa Validasi

Sebelum push ke `main`, **WAJIB** jalankan semua ini dan pastikan PASS:

```bash
npm run lint
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run build
```

Jika satu saja gagal, **JANGAN PUSH**. Perbaiki dulu.

---

## 2. Prosedur Version Bump (Step-by-Step)

Ikuti urutan ini secara tepat. Jangan skip langkah manapun.

### Langkah 1: Pastikan main branch bersih

```bash
git checkout main
git pull origin main
git status              # Harus clean, tidak ada perubahan
```

### Langkah 2: Cek versi yang sudah ada di npm

```bash
npm view vibegram versions --json
```

Pilih nomor versi yang BELUM ADA di daftar. Ikuti semver:

- **patch** (1.0.x): bug fix saja
- **minor** (1.x.0): fitur baru, backward compatible
- **major** (x.0.0): breaking changes

### Langkah 3: Update package.json

Ubah field `"version"` di `package.json`. Hanya field ini, jangan ubah yang lain.

### Langkah 4: Update CHANGELOG.md

Tambahkan entry baru di atas entry terakhir. Format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added / Changed / Fixed / Security

- Deskripsi perubahan
```

### Langkah 5: Validasi lengkap

```bash
npm run lint
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run build
```

Semua HARUS pass. Jika ada yang gagal, **BERHENTI dan perbaiki**.

### Langkah 6: Commit dan push

```bash
git add package.json CHANGELOG.md package-lock.json
git commit -m "bump version to X.Y.Z"
git push origin main
```

### Langkah 7: Verifikasi

Tunggu CI selesai di GitHub Actions, lalu cek:

```bash
npm view vibegram version     # Harus menunjukkan versi baru
```

### JANGAN LAKUKAN:

- Jangan buat tag git secara manual
- Jangan jalankan `npm publish` secara manual (CI yang handle)
- Jangan bump versi tanpa menjalankan test dulu
- Jangan bump versi di branch selain `main`

---

## 3. Struktur Kode & Konvensi

### 3.1 Source Files (`src/`)

```
src/index.ts      → Barrel export (re-export semua module, JANGAN tambah logic di sini)
src/bot.ts        → Kelas utama Bot
src/client.ts     → HTTP client ke Telegram API
src/context.ts    → Context object per-update
src/composer.ts   → Middleware engine
src/types.ts      → TypeScript interfaces (zero runtime cost)
src/errors.ts     → Error hierarchy
src/markup.ts     → Keyboard builder
src/filters.ts    → Update filter predicates
src/session.ts    → Session middleware
src/scene.ts      → Scene manager (FSM)
src/wizard.ts     → Step-by-step wizard
src/conversation.ts → Wait-state conversation
src/adapters.ts   → Framework adapters (Express, Fastify, Hono, Koa, native)
src/plugin.ts     → Plugin interface
src/inline.ts     → Inline query builder
src/menu.ts       → Interactive menu builder
src/cache.ts      → Caching layer
src/queue.ts      → Background job queue
src/ratelimit.ts  → Rate limiting middleware
src/i18n.ts       → Internationalization
src/logger.ts     → Logging + sanitization
src/webapp.ts     → Telegram Web App HMAC validation
```

### 3.2 Aturan Penulisan Kode

- **TypeScript strict mode** aktif — jangan tambahkan `@ts-ignore` atau `@ts-nocheck`
- **Hindari `any`** sebisa mungkin. Jika terpaksa, gunakan `unknown` dan narrow secara eksplisit
- **Semua export harus melalui `src/index.ts`** — tambahkan `export * from './module'` jika buat module baru
- **Jangan tambah dependency runtime** tanpa alasan kuat. Library ini hanya punya 2 deps: `axios` dan `form-data`
- **Middleware harus mengikuti signature**: `(ctx: Context, next: NextFunction) => Promise<void> | void`
- **Jangan mutasi `ctx.client` secara global** — setiap update mendapat scoped client via `Object.create()`
- **Regex trigger**: selalu clone regex sebelum exec untuk hindari `lastIndex` leakage (lihat `Composer.cloneTriggerRegex`)

### 3.3 Aturan Testing

- Test framework: **Vitest** (config di `vitest.config.ts`)
- Semua test ada di `tests/` — nama file: `[module].test.ts`
- Mock helpers di `tests/helpers/mock.ts`
- Coverage thresholds (di `vitest.config.ts`):
    - Lines: 40%
    - Functions: 45%
    - Branches: 70%
- **Setiap fitur baru WAJIB punya test**
- **Setiap bug fix WAJIB punya regression test**
- Jalankan `npm test` sebelum commit apapun

### 3.4 Aturan TypeScript Config

Ada 4 tsconfig files, **jangan gabungkan**:

| File                     | Fungsi                  | Jangan Ubah                  |
| ------------------------ | ----------------------- | ---------------------------- |
| `tsconfig.json`          | Build CJS → `dist/cjs/` | `outDir`, `module: CommonJS` |
| `tsconfig.esm.json`      | Build ESM → `dist/esm/` | `outDir`, `module: ES2022`   |
| `tsconfig.test.json`     | Typecheck test files    | `include` pattern            |
| `tsconfig.examples.json` | Typecheck examples      | `include` pattern            |

---

## 4. Aturan CI/CD

### 4.1 GitHub Actions Workflows

| File                                | Fungsi                                | Trigger                          |
| ----------------------------------- | ------------------------------------- | -------------------------------- |
| `.github/workflows/ci.yml`          | Lint, typecheck, test, build, publish | push ke main/develop, PR ke main |
| `.github/workflows/deploy-docs.yml` | Build & deploy VitePress docs         | push ke main                     |
| `.github/workflows/claude.yml`      | Claude Code agent                     | PR events                        |

### 4.2 Jangan Ubah CI Tanpa Testing

Jika perlu mengubah CI workflow:

1. Buat branch baru
2. Test perubahan CI di branch tersebut (via PR)
3. Pastikan semua check pass sebelum merge
4. **JANGAN** langsung push perubahan CI ke `main`

### 4.3 Dependabot

File `.github/dependabot.yml` aktif (weekly updates untuk npm dan GitHub Actions).
Aturan menangani Dependabot PR:

- Cek apakah CI pass
- Jika CI gagal: close PR, update dependency secara manual
- Jangan biarkan Dependabot PRs menumpuk — tangani dalam seminggu

---

## 5. Aturan Build & Publish

### 5.1 Build Pipeline

```
npm run build
  → npm run clean          (hapus dist/)
  → npm run build:cjs      (tsc → dist/cjs/)
  → npm run build:esm      (tsc --project tsconfig.esm.json → dist/esm/)
  → node scripts/postbuild.js  (tulis package.json marker ke dist/cjs/ dan dist/esm/)
```

Setelah build, verifikasi output:

```bash
test -f dist/cjs/index.js          # CJS entry
test -f dist/cjs/package.json      # {"type": "commonjs"}
test -f dist/esm/index.js          # ESM entry
test -f dist/esm/package.json      # {"type": "module"}
test -f dist/types/index.d.ts      # Type declarations
```

### 5.2 Package Contents

Field `"files"` di `package.json` mengontrol apa yang masuk npm package:

```json
"files": ["dist", "CHANGELOG.md", "README.md"]
```

Jangan ubah field ini kecuali ada alasan yang jelas.
File `.npmignore` juga ada sebagai safety net tambahan.

### 5.3 Dry Run Sebelum Publish

Untuk melihat apa yang akan di-publish tanpa benar-benar publish:

```bash
npm pack --dry-run
```

---

## 6. Aturan Git

### 6.1 Commit Message Format

```
tipe: deskripsi singkat

Penjelasan lebih detail jika perlu.
```

Tipe yang digunakan:

- `feat`: fitur baru
- `fix`: bug fix
- `chore`: maintenance (deps update, cleanup)
- `docs`: dokumentasi
- `test`: menambah/mengubah test
- `refactor`: refactoring tanpa ubah behavior

### 6.2 Branch Strategy

- `main` = production, auto-publish ke npm
- Fitur besar: buat branch → PR → merge setelah CI pass
- Fitur kecil / fix: boleh langsung ke `main` setelah validasi lokal

### 6.3 Jangan Lakukan

- `git push --force` ke `main`
- `git rebase` pada `main` yang sudah di-push
- Commit file besar (binary, node_modules, dist)
- Menumpuk branch yang tidak terpakai — hapus setelah merge

---

## 7. Troubleshooting Umum

### Build gagal: "Cannot find module"

```bash
npm run clean && npm ci && npm run build
```

### Test gagal setelah update dependency

```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### npm publish gagal: "403 Forbidden" / "Version already exists"

Versi sudah pernah di-publish. Pilih nomor versi baru yang belum pernah dipakai.

```bash
npm view vibegram versions --json
```

### CI gagal di GitHub tapi lokal pass

1. Pastikan `package-lock.json` sudah di-commit (CI pakai `npm ci`)
2. Cek versi Node.js — CI test di Node 18, 20, dan 22
3. Jangan pakai fitur Node.js yang belum tersedia di versi 18

### Typecheck pass tapi lint gagal

Lint config ada di `eslint.config.js` (flat config). Jangan buat `.eslintrc.json` — file itu sudah dihapus.

```bash
npm run lint          # Cek error
npm run format        # Auto-fix formatting
```

---

## 8. File yang Tidak Boleh Dihapus

File-file ini krusial untuk build/publish. **JANGAN HAPUS**:

```
package.json
package-lock.json
tsconfig.json
tsconfig.esm.json
tsconfig.test.json
tsconfig.examples.json
vitest.config.ts
eslint.config.js
scripts/clean-dist.js
scripts/postbuild.js
.github/workflows/ci.yml
.github/workflows/deploy-docs.yml
.gitignore
.npmignore
src/index.ts (barrel export)
```

---

## 9. Catatan Sejarah (Untuk Konteks)

**April 2026 — Gagal upgrade versi:**

- Percobaan bump ke 1.1.1 lalu 1.1.2 dengan tag-based CI trigger → gagal
- CI workflow tag-triggered run error
- Revert ke 1.0.1 dilakukan
- Pelajaran: jangan ubah CI publish trigger dari version-check ke tag-based tanpa testing di branch terpisah dulu

**April 2026 â€” Release 1.2.0:**

- Setelah phase hardening dan API coverage, rilis `1.1.0` ditolak npm sebagai versi yang pernah dipublish.
- Versi dikoreksi ke `1.2.0`, CI push-to-main + version-check berhasil publish ke npm.
- Pelajaran: perlakukan `1.1.0` sebagai burned version dan gunakan `1.2.1`/`1.3.0` untuk update berikutnya sesuai SemVer.

**Dependabot PR menumpuk:**

- 13 PRs pernah menumpuk tanpa ditangani
- Semua CI-nya gagal karena breaking changes di dependency baru
- Dibersihkan: semua di-close dan branch dihapus
- Pelajaran: tangani Dependabot PRs segera, jangan biarkan menumpuk
