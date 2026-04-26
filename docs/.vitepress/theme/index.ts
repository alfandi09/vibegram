import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Layout from './Layout.vue';
import './style.css';
import {
    ApiMethodCard,
    CodePreview,
    CompatibilityTable,
    DocsCard,
    FeatureCard,
    FeatureGrid,
    InstallTabs,
    MethodSignature,
    PackageStats,
    SecurityNote,
    VersionBadge,
} from './components/docs';

const theme: Theme = {
    extends: DefaultTheme,
    Layout,
    enhanceApp(ctx) {
        DefaultTheme.enhanceApp?.(ctx);

        ctx.app.component('ApiMethodCard', ApiMethodCard);
        ctx.app.component('CodePreview', CodePreview);
        ctx.app.component('CompatibilityTable', CompatibilityTable);
        ctx.app.component('DocsCard', DocsCard);
        ctx.app.component('FeatureCard', FeatureCard);
        ctx.app.component('FeatureGrid', FeatureGrid);
        ctx.app.component('InstallTabs', InstallTabs);
        ctx.app.component('MethodSignature', MethodSignature);
        ctx.app.component('PackageStats', PackageStats);
        ctx.app.component('SecurityNote', SecurityNote);
        ctx.app.component('VersionBadge', VersionBadge);
    },
};

export default theme;
