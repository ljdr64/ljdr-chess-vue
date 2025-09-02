<script setup lang="ts">
import { ref, inject } from "vue";
import { Chess } from "chess.js";
import Piece from "./Piece.vue";

interface PromotionPawnProps {
  piece: "P" | "p";
  square: string;
  game: Chess;
  prevSquarePromotion: string;
}
const props = defineProps<PromotionPawnProps>();

const context = inject<any>("ChessBoardContext");

type PieceType = "Q" | "N" | "R" | "B" | "b" | "r" | "n" | "q";

const selectedPiece = ref<PieceType | null>(null);

function handleTouchStart(pieceType: PieceType) {
  selectedPiece.value = pieceType;
}

function handleTouchEnd(pieceType: PieceType) {
  if (selectedPiece.value === pieceType) {
    setTimeout(() => {
      handlePieceClick(pieceType);
    }, 0);
  }
  selectedPiece.value = null;
}

function handlePieceClick(selectedPiece: PieceType) {
  props.game.move({
    from: props.prevSquarePromotion,
    to: props.square,
    promotion: selectedPiece.toLowerCase(),
  });
  context.setFEN(props.game.fen());
  context.setCurrentTurn(context.currentTurn === "white" ? "black" : "white");
  context.setNotation(props.game.pgn());
  context.setPromotionModal(false);
  context.setPrevToLastMove({ from: "", to: "" });
}
</script>

<template>
  <div class="flex flex-col square-promote z-20 bg-white">
    <template v-if="props.piece === 'P'">
      <div
        v-for="pieceType in ['Q', 'N', 'R', 'B']"
        :key="pieceType"
        class="bg-circle-promotion-pawn"
        :class="[
          context.isTouchDevice.value && selectedPiece === pieceType ? 'bg-orange-400' : '',
          !context.isTouchDevice.value ? 'hover:bg-orange-400' : '',
        ]"
        @touchstart="context.isTouchDevice.value && handleTouchStart(pieceType as PieceType)"
        @touchend="context.isTouchDevice.value && handleTouchEnd(pieceType as PieceType)"
        @click="!context.isTouchDevice.value && handlePieceClick(pieceType as PieceType)"
      >
        <Piece :piece="pieceType" />
      </div>
    </template>

    <template v-else>
      <div
        v-for="pieceType in ['b', 'r', 'n', 'q']"
        :key="pieceType"
        class="bg-circle-promotion-pawn"
        :class="[
          context.isTouchDevice.value && selectedPiece === pieceType ? 'bg-orange-400' : '',
          !context.isTouchDevice.value ? 'hover:bg-orange-400' : '',
        ]"
        @touchstart="context.isTouchDevice.value && handleTouchStart(pieceType as PieceType)"
        @touchend="context.isTouchDevice.value && handleTouchEnd(pieceType as PieceType)"
        @click="!context.isTouchDevice.value && handlePieceClick(pieceType as PieceType)"
      >
        <Piece :piece="pieceType" />
      </div>
    </template>
  </div>
</template>
