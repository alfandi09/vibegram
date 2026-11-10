<script setup lang="ts">
/**
 * Motion policy for the docs theme:
 *
 * - The homepage hero enters once on load through a CSS animation (motion.css).
 * - Docs content (headings, code blocks, tables, callouts) never fades in on
 *   scroll: readers jump to anchors, search with Ctrl+F, and print pages, and a
 *   scroll trigger could leave tall blocks invisible on small screens.
 * - Hover and press feedback lives in motion.css and respects reduced motion.
 *
 * The component stays mounted in Layout.vue as the single home for motion
 * behaviour that needs script; today none does.
 */
</script>

<template>
    <span class="vg-motion-controller" aria-hidden="true"></span>
</template>
