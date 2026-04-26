# PLAN_DOCS_REDESIGN.md - Total UI/UX Redesign Docs VibeGram

> Dibuat: 2026-04-26
> Scope: redesign total frontend docs VibeGram.
> Target: modern, minimal, smooth, rapi, responsif, dan tetap static-build friendly untuk GitHub Pages.

---

## Prinsip Utama

- Tetap pakai VitePress sebagai docs engine.
- Rewrite total dilakukan di layer theme, layout, styling, dan komponen docs.
- Konten markdown EN/ID dipertahankan sebagai sumber konten, lalu dirapikan bertahap.
- GitHub Pages harus tetap bisa deploy dari static output `docs/.vitepress/dist`.
- Tidak mengubah CI publish trigger, tidak bump versi, dan tidak publish manual selama fase redesign.
- Semua perubahan besar dilakukan bertahap agar mudah direview dan direvert jika perlu.

---

## Stack Rekomendasi

### Core

- VitePress
    - Tetap menjadi engine utama docs, routing, Markdown, i18n, dan static build.
- Vue 3
    - Dipakai oleh VitePress theme dan komponen docs.
- Tailwind CSS
    - Dipakai untuk design tokens, layout utilities, responsive styling, dan dark mode.
- shadcn-vue
    - Dipakai sebagai UI component layer utama.
- Reka UI
    - Dipakai tidak langsung melalui shadcn-vue.
    - Dipakai langsung hanya jika shadcn-vue belum menyediakan primitive yang dibutuhkan.

### Optional

- `@vueuse/motion`
    - Hanya jika motion CSS biasa tidak cukup.
    - Semua motion harus menghormati `prefers-reduced-motion`.
- Lucide Vue / icon set yang kompatibel
    - Dipakai untuk icon navigasi, action, status, dan feature highlights.

---

## Non-Goals

- Tidak migrasi dari VitePress ke framework lain.
- Tidak membuat docs menjadi SPA custom tanpa Markdown pipeline.
- Tidak memakai Expo sebagai teknologi docs.
- Tidak membuat backend untuk docs.
- Tidak mengubah package publish pipeline.
- Tidak menambah dependency runtime library utama `vibegram`; dependency docs harus tetap dev-only.

---

## UX Target

### Desktop

- Header sticky yang ringan.
- Sidebar docs yang rapi, grouped, dan mudah discan.
- Area baca nyaman dengan line length terkontrol.
- Table of contents jelas dan tidak mengganggu.
- Code block modern dengan copy affordance.
- Search entry terlihat seperti command palette.
- Dark mode matang, bukan sekadar warna dibalik.

### Mobile

- Mobile navigation memakai sheet/drawer.
- Touch target cukup besar.
- Sidebar tidak menutupi konten secara membingungkan.
- Code block tidak merusak layout.
- Language/theme/search tetap mudah dijangkau.

### Accessibility

- Semantic HTML untuk nav, main, aside, footer.
- Focus state terlihat.
- Keyboard navigation aman.
- Kontras teks cukup.
- Motion bisa dikurangi.
- Dialog/sheet/command wajib punya title accessible.

---

## Visual Direction

Rekomendasi arah visual:

- Clean SaaS documentation.
- Warna dasar netral dengan satu aksen brand.
- Radius sedang, bukan terlalu bulat.
- Border halus, shadow minimal.
- Typography tajam dan mudah dibaca.
- Code examples menjadi elemen visual utama.
- Visual produk berupa code/API surfaces, bukan ilustrasi dekoratif berlebihan.

Hal yang perlu dihindari:

- Palette satu warna yang terlalu dominan.
- Hero terlalu marketing dan mengorbankan docs-first UX.
- Terlalu banyak card di setiap section.
- Animasi dekoratif yang tidak membantu navigasi.
- Layout desktop-only.

---

## Phase 0 - Audit dan Concept Direction

Status: selesai.

Tujuan:

- Mengunci arah visual dan information architecture sebelum coding.

Checklist:

- [x] Audit semua route docs EN.
- [x] Audit semua route docs ID.
- [x] Audit halaman yang paling penting:
    - [x] Home
    - [x] Quickstart
    - [x] Installation
    - [x] Bot instance
    - [x] Webhook
    - [x] API context
    - [x] Bot methods
    - [x] Conversations
    - [x] Adapters
- [x] Audit theme saat ini:
    - [x] `docs/.vitepress/config.js`
    - [x] `docs/.vitepress/theme/index.ts`
    - [x] `docs/.vitepress/theme/style.css`
- [x] Buat design brief final.
- [x] Buat minimal satu konsep visual untuk homepage dan docs reading page.
- [x] User approve konsep sebelum implementasi.

Deliverable:

- Design brief.
- Accepted UI concept.
- Daftar halaman prioritas redesign.

Output:

- `DOCS_REDESIGN_PHASE0.md`
    - Audit route dan asset docs.
    - Accepted concept path.
    - Design system direction.
    - Phase 1 readiness notes.

---

## Phase 1 - Theme Foundation Rewrite

Status: selesai.

Tujuan:

- Membuat fondasi theme baru dari nol, tapi tetap kompatibel dengan VitePress.

Files yang kemungkinan dibuat/diubah:

- `docs/.vitepress/theme/index.ts`
- `docs/.vitepress/theme/Layout.vue`
- `docs/.vitepress/theme/styles/tokens.css`
- `docs/.vitepress/theme/styles/base.css`
- `docs/.vitepress/theme/styles/docs.css`
- `docs/.vitepress/theme/styles/motion.css`
- `docs/.vitepress/theme/components/AppHeader.vue`
- `docs/.vitepress/theme/components/AppSidebar.vue`
- `docs/.vitepress/theme/components/AppMobileNav.vue`
- `docs/.vitepress/theme/components/AppToc.vue`
- `docs/.vitepress/theme/components/AppFooter.vue`

Checklist:

- [x] Extend default VitePress theme hanya jika masih membantu.
- [x] Tentukan apakah layout akan full custom atau hybrid.
- [x] Buat root layout baru.
- [x] Buat CSS tokens baru.
- [x] Buat responsive shell desktop/mobile.
- [x] Pastikan `<Content />` tetap render markdown.
- [x] Pastikan 404 tetap tertangani.
- [x] Pastikan i18n route EN/ID tetap jalan.

Output:

- Foundation memakai hybrid layout: custom `Layout.vue` membungkus `DefaultTheme.Layout` agar local search, sidebar, mobile nav, outline, edit links, dan i18n tetap aman.
- CSS theme dipecah menjadi `tokens.css`, `base.css`, `shell.css`, `home.css`, `docs.css`, dan `motion.css`.
- Homepage mendapat install command panel dan proof strip sebagai jembatan menuju Phase 3.
- Article pages mendapat token typography, code block, table, callout, sidebar, and outline styling.
- Visual polish pass ditambahkan setelah screenshot audit: hero alignment, mobile top spacing, sidebar scrollbar, brand mark, dan mobile code block dirapikan.
- AppHeader/AppSidebar/AppMobileNav/AppToc/AppFooter full custom ditunda sampai dependency/UI strategy Phase 2/5 agar tidak memutus VitePress behavior terlalu awal.

Validation:

```bash
npm run docs:build
```

---

## Phase 2 - Tailwind dan shadcn-vue Setup

Status: belum mulai.

Tujuan:

- Menambahkan sistem styling dan komponen UI yang konsisten.

Checklist:

- [ ] Cek kompatibilitas shadcn-vue dengan VitePress SSR.
- [ ] Install dependency docs sebagai dev dependency.
- [ ] Setup Tailwind untuk folder docs/theme.
- [ ] Setup shadcn-vue config.
- [ ] Tentukan alias import yang aman untuk VitePress.
- [ ] Tambahkan util `cn()` jika diperlukan oleh shadcn-vue.
- [ ] Tambahkan komponen dasar:
    - [ ] Button
    - [ ] Badge
    - [ ] Card
    - [ ] Alert
    - [ ] Tabs
    - [ ] Sheet
    - [ ] Command
    - [ ] ScrollArea
    - [ ] Tooltip
    - [ ] Separator
    - [ ] Accordion

Catatan:

- Ikuti CLI/docs resmi shadcn-vue saat eksekusi.
- Jangan menebak API komponen.
- Preview perubahan dependency sebelum commit.

Validation:

```bash
npm run docs:build
npm run typecheck
```

---

## Phase 3 - Homepage Redesign

Status: belum mulai.

Tujuan:

- Membuat homepage baru yang modern, docs-first, dan menunjukkan nilai VibeGram sebagai Telegram Bot Framework.

Section awal:

- Hero:
    - Nama VibeGram jelas di first viewport.
    - Value proposition singkat.
    - CTA ke Quickstart dan API Reference.
    - Install command block.
- Feature overview:
    - Middleware
    - Webhook adapters
    - Conversations
    - Sessions
    - Bot API coverage
- Production readiness:
    - TypeScript strict
    - CJS/ESM
    - Webhook security
    - Rate limit
    - Observability
- Quick path:
    - Install
    - Create bot
    - Add handlers
    - Launch polling/webhook
- Footer CTA:
    - Read guide
    - View GitHub

Checklist:

- [ ] Rewrite `docs/index.md` frontmatter/content jika perlu.
- [ ] Rewrite `docs/id/index.md` agar setara.
- [ ] Buat home-specific Vue components.
- [ ] Tambahkan install tabs.
- [ ] Tambahkan responsive proof/features.
- [ ] Test desktop dan mobile.

Validation:

```bash
npm run docs:build
```

---

## Phase 4 - Docs Reading Experience

Status: belum mulai.

Tujuan:

- Membuat semua halaman markdown nyaman dibaca dan rapi.

Checklist:

- [ ] Redesign typography:
    - [ ] h1
    - [ ] h2
    - [ ] h3
    - [ ] paragraph
    - [ ] list
    - [ ] inline code
    - [ ] blockquote
- [ ] Redesign code block.
- [ ] Redesign table.
- [ ] Redesign custom containers:
    - [ ] tip
    - [ ] warning
    - [ ] danger
    - [ ] details
- [ ] Redesign previous/next nav.
- [ ] Redesign edit link.
- [ ] Redesign aside/table of contents.
- [ ] Pastikan line length nyaman di desktop.
- [ ] Pastikan code block usable di mobile.

Validation:

```bash
npm run docs:build
```

---

## Phase 5 - Navigation dan Search UX

Status: belum mulai.

Tujuan:

- Membuat navigasi docs cepat, jelas, dan responsive.

Checklist:

- [ ] Header desktop:
    - [ ] Logo/brand
    - [ ] Guide link
    - [ ] API link
    - [ ] Changelog/GitHub
    - [ ] Language switch
    - [ ] Theme switch
    - [ ] Search trigger
- [ ] Sidebar desktop:
    - [ ] Group heading
    - [ ] Active route
    - [ ] Collapsible groups
    - [ ] Scroll behavior
- [ ] Mobile:
    - [ ] Sheet nav
    - [ ] Search accessible
    - [ ] Theme/language controls
- [ ] Search:
    - [ ] Local search tetap jalan.
    - [ ] UI trigger command-style.

Validation:

```bash
npm run docs:build
```

---

## Phase 6 - Docs Component System

Status: belum mulai.

Tujuan:

- Menyediakan komponen reusable untuk halaman docs agar tidak hanya berupa markdown polos.

Komponen rencana:

- `InstallTabs.vue`
- `FeatureGrid.vue`
- `FeatureCard.vue`
- `ApiMethodCard.vue`
- `MethodSignature.vue`
- `CompatibilityTable.vue`
- `SecurityNote.vue`
- `VersionBadge.vue`
- `CodePreview.vue`
- `DocsCard.vue`
- `PackageStats.vue`

Checklist:

- [ ] Register global components di VitePress theme.
- [ ] Pastikan semua komponen SSR-compatible.
- [ ] Pastikan props typed.
- [ ] Pastikan fallback content aman.
- [ ] Dokumentasikan cara pakai komponen internal docs.

Validation:

```bash
npm run docs:build
npm run typecheck
```

---

## Phase 7 - Content Migration

Status: belum mulai.

Tujuan:

- Menerapkan layout/komponen baru ke halaman-halaman penting secara bertahap.

Urutan migrasi:

1. [ ] Home EN/ID.
2. [ ] Quickstart EN/ID.
3. [ ] Installation EN/ID.
4. [ ] Bot instance EN/ID.
5. [ ] Webhook/security EN/ID.
6. [ ] Adapters EN/ID.
7. [ ] Conversations EN/ID.
8. [ ] API context EN/ID.
9. [ ] Bot methods EN/ID.
10. [ ] Advanced pages EN/ID.

Rules:

- Jangan menghapus informasi teknis penting.
- EN/ID harus tetap sejajar.
- Jika halaman EN diubah substansial, update pasangan ID-nya.
- Jangan menambah klaim fitur yang belum ada di source code.

Validation:

```bash
npm run docs:build
```

---

## Phase 8 - Motion dan Interaction Polish

Status: belum mulai.

Tujuan:

- Membuat docs terasa smooth tanpa mengganggu performa atau aksesibilitas.

Checklist:

- [ ] Hover/focus state konsisten.
- [ ] Mobile sheet smooth.
- [ ] Search/dialog transition halus.
- [ ] Copy code feedback.
- [ ] Active nav transition.
- [ ] Section reveal ringan jika tidak mengganggu reading.
- [ ] Respect `prefers-reduced-motion`.
- [ ] Tidak menyebabkan layout shift.

Validation:

```bash
npm run docs:build
```

---

## Phase 9 - Responsive dan Browser QA

Status: belum mulai.

Tujuan:

- Memastikan desain benar-benar usable di desktop dan mobile.

Viewport wajib:

- Desktop: 1440px.
- Laptop: 1280px.
- Tablet: 768px.
- Mobile: 390px.
- Small mobile: 360px.

Checklist:

- [ ] Header tidak overlap.
- [ ] Sidebar tidak memotong konten.
- [ ] Mobile nav bisa ditutup/dibuka.
- [ ] Code block bisa discroll.
- [ ] Table tidak merusak layout.
- [ ] CTA tetap terlihat.
- [ ] Language switch tidak membingungkan.
- [ ] Dark mode tidak kehilangan kontras.
- [ ] No horizontal overflow global.

Validation:

```bash
npm run docs:build
npm run docs:dev
```

Browser verification:

- Buka local docs.
- Test desktop.
- Test mobile.
- Capture screenshot jika perlu untuk fidelity review.

---

## Phase 10 - GitHub Pages Hardening

Status: belum mulai.

Tujuan:

- Memastikan redesign aman untuk deploy static GitHub Pages.

Checklist:

- [ ] `base: '/vibegram/'` tetap benar.
- [ ] Asset path tidak memakai absolute root yang salah.
- [ ] Direct refresh route aman.
- [ ] EN route aman.
- [ ] ID route aman.
- [ ] Search asset aman.
- [ ] Dark mode state aman.
- [ ] Build output tetap di `docs/.vitepress/dist`.

Validation:

```bash
npm run docs:build
npm run docs:preview
```

---

## Phase 11 - Full Release Validation

Status: belum mulai.

Tujuan:

- Validasi repo penuh sebelum merge/push/release discussion.

Wajib sesuai AGENTS.md:

```bash
npm run lint
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run build
npm run docs:build
npm pack --dry-run
```

Catatan:

- Warning lint lama boleh dicatat jika tetap bukan error.
- Jangan push jika salah satu command gagal.
- Jangan bump versi sampai pembahasan release dilakukan terpisah.

---

## Risiko dan Mitigasi

### Risiko: VitePress CSS bentrok dengan Tailwind/shadcn-vue

Mitigasi:

- Scope CSS theme dengan hati-hati.
- Jangan reset global secara agresif.
- Test halaman markdown panjang, table, dan code block.

### Risiko: shadcn-vue component tidak SSR-safe

Mitigasi:

- Tambahkan komponen bertahap.
- Jalankan `npm run docs:build` setelah setiap batch.
- Hindari akses `window`/`document` tanpa guard.

### Risiko: EN/ID divergen lagi

Mitigasi:

- Setiap perubahan struktur halaman EN harus punya pasangan ID.
- Tambahkan checklist sync di tiap phase content.

### Risiko: GitHub Pages broken asset

Mitigasi:

- Semua asset public harus diuji dengan `base: '/vibegram/'`.
- Hindari hardcoded `/asset.ext` kecuali memang berada di public root VitePress dengan base yang benar.

### Risiko: redesign terlalu besar untuk satu commit

Mitigasi:

- Commit per phase.
- Hindari staging massal.
- Jangan stage `dist/`, cache, `.claude/`, `ANALYSIS.md`, atau `PLAN.md`.

---

## Dependency Policy

Allowed jika dibutuhkan dan sudah direview:

- Tailwind CSS dev dependency.
- shadcn-vue related dev dependencies.
- Reka UI dependency untuk docs UI.
- Icon library untuk docs UI.
- Motion library hanya jika CSS transition tidak cukup.

Tidak boleh:

- Dependency runtime utama library `vibegram` untuk kebutuhan docs saja.
- Dependency besar yang tidak punya manfaat jelas.
- Library yang membutuhkan server runtime untuk GitHub Pages.

---

## Commit Strategy

Rekomendasi commit:

1. `docs: add redesign plan`
2. `docs: add redesign theme foundation`
3. `docs: add shadcn vue design system`
4. `docs: redesign homepage`
5. `docs: redesign navigation experience`
6. `docs: add reusable docs components`
7. `docs: migrate core documentation pages`
8. `docs: polish responsive docs experience`

---

## Definition of Done

Redesign dianggap selesai jika:

- Semua route EN/ID build tanpa error.
- Homepage baru selesai.
- Reading layout baru selesai.
- Desktop dan mobile usable.
- Dark mode rapi.
- Search/navigation usable.
- Code blocks dan tables tidak rusak.
- GitHub Pages static build aman.
- Full validation AGENTS.md pass.
- Tidak ada version bump tanpa pembahasan release.
