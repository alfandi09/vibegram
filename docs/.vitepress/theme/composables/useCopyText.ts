import { onBeforeUnmount, ref } from 'vue';

export const useCopyText = (resetDelay = 1800) => {
    const copiedId = ref<string | null>(null);
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const writeClipboard = async (text: string): Promise<boolean> => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                // Continue to the textarea fallback for restricted browser contexts.
            }
        }

        if (typeof document === 'undefined') {
            return false;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const didCopy = document.execCommand('copy');
        document.body.removeChild(textarea);

        return didCopy;
    };

    const copyText = async (text: string, id = 'default'): Promise<void> => {
        const didCopy = await writeClipboard(text);
        if (!didCopy) {
            return;
        }

        copiedId.value = id;
        if (resetTimer) {
            clearTimeout(resetTimer);
        }

        resetTimer = setTimeout(() => {
            copiedId.value = null;
        }, resetDelay);
    };

    onBeforeUnmount(() => {
        if (resetTimer) {
            clearTimeout(resetTimer);
        }
    });

    return {
        copiedId,
        copyText,
    };
};
