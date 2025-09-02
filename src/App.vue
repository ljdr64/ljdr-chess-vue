<script setup lang="ts">
import { createChessBoardContext } from "./context/ChessBoardContext";
import { provide } from "vue";
import { Chess } from "chess.js";
import ChessBoard from "./components/ChessBoard.vue";

const game = new Chess();
const context = createChessBoardContext();

// ⬅️ clave "ChessBoardContext" coincide con inject
provide("ChessBoardContext", context);
</script>

<template>
  <div class="app gap-10">
    <h1 class="text-4xl">LJDR Chess Vue</h1>
    <ChessBoard boardId="main-board" :game="game" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  font-family: system-ui, sans-serif;
  text-align: center;
}
</style>
