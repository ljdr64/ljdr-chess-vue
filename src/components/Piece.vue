<script setup lang="ts">
import { computed } from "vue";

interface PieceProps {
  piece: string; // 'k', 'q', 'r', etc.
  onClick?: () => void;
}
const props = defineProps<PieceProps>();

// función para determinar el ID del símbolo basado en la pieza recibida
const getSymbolId = (piece: string): string | null => {
  const normalizedPiece = piece.toLowerCase();
  if (["k", "q", "r", "b", "n", "p"].includes(normalizedPiece)) {
    return piece === piece.toLowerCase()
      ? `Chess_${normalizedPiece}dt45`
      : `Chess_${normalizedPiece}lt45`;
  }
  return null;
};

const symbolId = computed(() => getSymbolId(props.piece));

// ruta al SVG
const svgUrl = computed(() => (symbolId.value ? `public/svg/pieces/${symbolId.value}.svg` : null));
</script>

<template>
  <div
    class="w-full h-full flex items-center justify-center select-none"
    @click="props.onClick?.()"
  >
    <img
      v-if="svgUrl"
      :src="svgUrl"
      :alt="`Chess piece ${props.piece}`"
      width="64"
      height="64"
      class="dim-piece"
    />
  </div>
</template>
