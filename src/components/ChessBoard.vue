<script setup lang="ts">
import { ref, reactive, computed, inject, watch } from "vue";
import { Chess } from "chess.js";
import { FENToBoard2DArray } from "../utils";
import Piece from "./Piece.vue";
import PromotionPawn from "./PromotionPawn.vue";

import "./styles.css";

type SquareType = string;
type PieceType = "empty" | string;
interface Position {
  x: number;
  y: number;
}

interface ChessBoardProps {
  boardId: string;
  game: Chess;
}
const props = defineProps<ChessBoardProps>();

const context = inject<any>("ChessBoardContext");

// estados
const possibleMoves = ref<SquareType[]>([]);
const prevSquarePromotion = ref<string>("");
const isDragging = ref(false);
const movePosition = reactive<Position>({ x: 0, y: 0 });
const draggingPiece = ref<PieceType>("empty");
const currentSquare = ref<SquareType>("");
const dragStartSquare = ref<SquareType>("");
const highlightedSquare = ref<SquareType>("");
const highlightedLastMove = ref<SquareType>("");

const squareSize = ref(64);

const boardRef = ref<HTMLDivElement | null>(null);
const ghostRef = ref<HTMLDivElement | null>(null);

const board = computed(() => FENToBoard2DArray(context?.fen.value));

const squareRefs = computed(() => {
  const refs: Record<string, any> = {};
  for (let rowIndex = 0; rowIndex < context?.board2DArray.value.length; rowIndex++) {
    const row = context?.board2DArray.value[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const file = String.fromCharCode("a".charCodeAt(0) + colIndex);
      const rank = 8 - rowIndex;
      const square = `${file}${rank}`;
      refs[square] = ref<HTMLDivElement | null>(null);
    }
  }
  return refs;
});

type SquareRefs = Record<string, Ref<HTMLDivElement | null>>;

const pieceRefs = ref<SquareRefs>({});

for (let rowIndex = 0; rowIndex < context.board2DArray.length; rowIndex++) {
  const row = context.board2DArray[rowIndex];
  for (let colIndex = 0; colIndex < row.length; colIndex++) {
    const file = String.fromCharCode("a".charCodeAt(0) + colIndex);
    const rank = 8 - rowIndex;
    const square = `${file}${rank}`;
    pieceRefs.value[square] = ref<HTMLDivElement | null>(null);
  }
}

// watchers que reemplazan useEffect
watch([isDragging, () => context?.isClockZero.value], ([drag, clockZero]) => {
  if (drag && !clockZero) {
    document.addEventListener("mousemove", handleMouseMove as EventListener, {
      passive: false,
    });
    document.addEventListener("touchmove", handleTouchMove as EventListener, {
      passive: false,
    });
  } else {
    document.removeEventListener("mousemove", handleMouseMove as EventListener);
    document.removeEventListener("touchmove", handleTouchMove as EventListener);
  }
});

watch(
  () => context?.isClockZero.value,
  (newVal) => {
    if (newVal) {
      movePosition.x = 0;
      movePosition.y = 0;
      dragStartSquare.value = "";
      highlightedSquare.value = "";
      possibleMoves.value = [];
    }
  }
);

watch(
  () => context?.isReset.value,
  (newVal) => {
    if (newVal) {
      movePosition.x = 0;
      movePosition.y = 0;
      dragStartSquare.value = "";
      highlightedSquare.value = "";
      possibleMoves.value = [];
      context?.setIsReset(false);
      context?.setIsClockZero(false);
      if (ghostRef.value) {
        ghostRef.value.style.width = "0px";
        ghostRef.value.style.height = "0px";
        ghostRef.value.style.transform = "translate(0px, 0px)";
        ghostRef.value.style.visibility = "hidden";
      }
    }
  }
);

// handlers
function handleMouseDown(e: any, square: SquareType, piece: PieceType): void {
  if (context?.isClockZero.value) return;
  if (context?.chessResult.value !== "") return;

  if (possibleMoves.value.some((item) => item === square)) {
    context?.setLastFEN(context?.fen.value);
    context?.setPrevToLastMove(context?.lastMove.value);

    if (ghostRef.value) {
      ghostRef.value.style.width = "0px";
      ghostRef.value.style.height = "0px";
      ghostRef.value.style.transform = "translate(0px, 0px)";
      ghostRef.value.style.visibility = "hidden";
    }

    if (draggingPiece.value === "K" && currentSquare.value === "e1") {
      if (square === "h1") square = "g1";
      if (square === "a1") square = "c1";
    }
    if (draggingPiece.value === "k" && currentSquare.value === "e8") {
      if (square === "h8") square = "g8";
      if (square === "a8") square = "c8";
    }

    context?.setLastMove({ from: currentSquare.value, to: square });

    if (squareRefs.value[square]?.value && squareRefs.value[currentSquare.value]?.value) {
      const squareOffset = squareRefs.value[square].value;
      const currentOffset = squareRefs.value[currentSquare.value].value;
      if (squareOffset && currentOffset) {
        movePosition.x = squareOffset.offsetLeft - currentOffset.offsetLeft;
        movePosition.y = squareOffset.offsetTop - currentOffset.offsetTop;
      }
    }

    if (
      (draggingPiece.value === "P" && square?.[1] === "8") ||
      (draggingPiece.value === "p" && square?.[1] === "1")
    ) {
      context?.setPromotionModal(true);
      prevSquarePromotion.value = currentSquare.value;
      setTimeout(() => {
        context.handlePromote(currentSquare.value, square, draggingPiece.value, board.value);
      }, 190);
    } else {
      setTimeout(() => {
        movePosition.x = 0;
        movePosition.y = 0;
        props.game.move({ from: currentSquare.value, to: square });
        context?.setCurrentTurn(props.game.turn() === "w" ? "white" : "black");
        context?.setNotation(props.game.pgn());
        if (props.game.isCheckmate()) {
          if (props.game.turn() === "b") {
            context?.setChessResult("1-0");
          } else if (props.game.turn() === "w") {
            context?.setChessResult("0-1");
          }
        } else if (props.game.isStalemate() || props.game.isDraw()) {
          context?.setChessResult("1/2-1/2");
        }
        context?.setFEN(props.game.fen());
      }, 190);
    }

    draggingPiece.value = "empty";
    dragStartSquare.value = "";
    highlightedSquare.value = "";
    possibleMoves.value = [];
    return;
  } else if (
    piece === "empty" ||
    (context.currentTurn === "white" && piece === piece.toLowerCase()) ||
    (context.currentTurn === "black" && piece === piece.toUpperCase())
  ) {
    draggingPiece.value = "empty";
    dragStartSquare.value = "";
    highlightedSquare.value = "";
    possibleMoves.value = [];
    return;
  }

  if ((piece === "P" && square?.[1] === "8") || (piece === "p" && square?.[1] === "1")) {
    movePosition.x = 0;
    movePosition.y = 0;
    isDragging.value = false;
    return;
  }

  dragStartSquare.value = square;

  const moves: string[] = props.game
    .moves({ verbose: true })
    .filter((move) => move.from === square)
    .map((move) => move.to);

  if (piece === "K" && square === "e1") {
    if (moves.some((item) => item === "g1")) moves.push("h1");
    if (moves.some((item) => item === "c1")) moves.push("a1");
  }
  if (piece === "k" && square === "e8") {
    if (moves.some((item) => item === "g8")) moves.push("h8");
    if (moves.some((item) => item === "c8")) moves.push("a8");
  }

  possibleMoves.value = moves;

  const pieceArea = pieceRefs.value[square];

  if (!pieceArea) return;

  const piecePos = {
    posX: pieceArea.offsetLeft + squareSize.value / 2,
    posY: pieceArea.offsetTop + squareSize.value / 2,
  };

  const offsetX = e.clientX - pieceArea.getBoundingClientRect().left - squareSize.value / 2;
  const offsetY = e.clientY - pieceArea.getBoundingClientRect().top - squareSize.value / 2;
  pieceArea.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

  if (ghostRef.value && squareRefs.value["a8"]?.value) {
    ghostRef.value.style.width = `${squareSize.value}px`;
    ghostRef.value.style.height = `${squareSize.value}px`;
    ghostRef.value.style.transform = `translate(${
      piecePos.posX - squareRefs.value["a8"].value.offsetLeft - squareSize.value / 2
    }px, ${piecePos.posY - squareRefs.value["a8"].value.offsetTop - squareSize.value / 2}px)`;
    ghostRef.value.style.visibility = "visible";
  }

  isDragging.value = true;
  draggingPiece.value = piece;
  currentSquare.value = square;
  highlightedSquare.value = "";
}

function handleMouseMove(e: any): void {
  const pieceArea = pieceRefs.value[currentSquare.value]?.value;
  if (!pieceArea) return;

  const piecePos = {
    posX: pieceArea.offsetLeft + squareSize.value / 2,
    posY: pieceArea.offsetTop + squareSize.value / 2,
  };

  const moves: string[] = props.game
    .moves({ verbose: true })
    .filter((move) => move.from === currentSquare.value)
    .map((move) => move.to);

  if (draggingPiece.value === "K" && currentSquare.value === "e1") {
    if (moves.some((item) => item === "g1")) moves.push("h1");
    if (moves.some((item) => item === "c1")) moves.push("a1");
  }
  if (draggingPiece.value === "k" && currentSquare.value === "e8") {
    if (moves.some((item) => item === "g8")) moves.push("h8");
    if (moves.some((item) => item === "c8")) moves.push("a8");
  }

  const squareArea: { [key: string]: HTMLElement | null } = {};
  const squarePos: { [key: string]: { posX: number; posY: number } } = {};

  for (const item of moves) {
    squareArea[item] = squareRefs.value[item]?.value;
    if (squareArea[item]) {
      squarePos[item] = {
        posX: squareArea[item].offsetLeft,
        posY: squareArea[item].offsetTop,
      };
    }
    if (!context?.isTouchDevice && squareArea[item]) {
      if (
        e.clientX - squarePos[item].posX + window.scrollX <= squareSize.value - 1 &&
        e.clientY - squarePos[item].posY + window.scrollY <= squareSize.value - 1 &&
        e.clientX - squarePos[item].posX + window.scrollX >= 0 &&
        e.clientY - squarePos[item].posY + window.scrollY >= 0
      ) {
        if (item === context?.lastMove.value.from || item === context?.lastMove.value.to) {
          highlightedLastMove.value = item;
          highlightedSquare.value = "";
          break;
        } else {
          highlightedSquare.value = item;
          highlightedLastMove.value = "";
          break;
        }
      } else {
        highlightedSquare.value = "";
        highlightedLastMove.value = "";
      }
    }
  }

  if (isDragging.value) {
    const newX = e.clientX - piecePos.posX + window.scrollX;
    const newY = e.clientY - piecePos.posY + window.scrollY;
    pieceArea.style.transform = `translate(${newX}px, ${newY}px)`;
  }
}

function handleMouseUp(): void {
  if (context?.isClockZero.value) return;
  if (!isDragging.value) return;

  const squareArea: { [key: string]: HTMLElement | null } = {};
  const squarePos: { [key: string]: { posX: number; posY: number } } = {};
  const pieceArea = pieceRefs.value[currentSquare.value]?.value;
  if (!pieceArea) return;

  const piecePos = { posX: pieceArea.offsetLeft, posY: pieceArea.offsetTop };

  const moves: string[] = props.game
    .moves({ verbose: true })
    .filter((move) => move.from === currentSquare.value)
    .map((move) => move.to);

  context?.board2DArray.value.forEach((row: any, rowIndex: number) =>
    row.forEach((piece: any, colIndex: number) => {
      const file = String.fromCharCode("a".charCodeAt(0) + colIndex);
      const rank = 8 - rowIndex;
      const square = `${file}${rank}`;
      squareArea[square] = squareRefs.value[square]?.value;
      if (squareArea[square]) {
        squarePos[square] = {
          posX: squareArea[square]!.offsetLeft,
          posY: squareArea[square]!.offsetTop,
        };
      }
    })
  );

  let positionFound = false;
  context?.board2DArray.value.forEach((row: any, rowIndex: number) => {
    row.forEach((piece: any, colIndex: number) => {
      const file = String.fromCharCode("a".charCodeAt(0) + colIndex);
      const rank = 8 - rowIndex;
      let square = `${file}${rank}`;
      const regex = /translate\((-?\d+(?:\.\d+)?)px, (-?\d+(?:\.\d+)?)px\)/;
      const position = pieceArea.style.transform.match(regex);

      if (position) {
        if (
          parseInt(position[2], 10) >=
            squarePos[square].posY - piecePos.posY - squareSize.value / 2 &&
          parseInt(position[2], 10) <=
            squarePos[square].posY - piecePos.posY + squareSize.value / 2 - 1 &&
          parseInt(position[1], 10) >=
            squarePos[square].posX - piecePos.posX - squareSize.value / 2 &&
          parseInt(position[1], 10) <=
            squarePos[square].posX - piecePos.posX + squareSize.value / 2 - 1
        ) {
          positionFound = true;
          if (draggingPiece.value === "K" && currentSquare.value === "e1") {
            if (square === "h1") square = "g1";
            if (square === "a1") square = "c1";
          }
          if (draggingPiece.value === "k" && currentSquare.value === "e8") {
            if (square === "h8") square = "g8";
            if (square === "a8") square = "c8";
          }
          if (moves.includes(square)) {
            context?.setLastFEN(context?.fen.value);
            context?.setPrevToLastMove(context?.lastMove.value);
            context?.setLastMove({ from: currentSquare.value, to: square });

            if (ghostRef.value) {
              ghostRef.value.style.width = "0px";
              ghostRef.value.style.height = "0px";
              ghostRef.value.style.transform = "translate(0px, 0px)";
              ghostRef.value.style.visibility = "hidden";
            }

            if (
              (draggingPiece.value === "P" && square[1] === "8") ||
              (draggingPiece.value === "p" && square[1] === "1")
            ) {
              context.handlePromote(
                currentSquare.value,
                square,
                draggingPiece.value,
                context?.board2DArray.value
              );
              prevSquarePromotion.value = currentSquare.value;
              context?.setPromotionModal(true);
            } else {
              props.game.move({ from: currentSquare.value, to: square });
              context?.setCurrentTurn(props.game.turn() === "w" ? "white" : "black");
              context?.setNotation(props.game.pgn());
              if (props.game.isCheckmate()) {
                if (props.game.turn() === "b") {
                  context?.setChessResult("1-0");
                } else if (props.game.turn() === "w") {
                  context?.setChessResult("0-1");
                }
              } else if (props.game.isStalemate() || props.game.isDraw()) {
                context?.setChessResult("1/2-1/2");
              }
              context?.setFEN(props.game.fen());
            }
            pieceArea.style.transform = "";
            draggingPiece.value = "empty";
            dragStartSquare.value = "";
            highlightedSquare.value = "";
            possibleMoves.value = [];
          } else {
            pieceArea.style.transform = "";
            movePosition.x = 0;
            movePosition.y = 0;
          }
        }
      }
    });
  });

  if (!positionFound) {
    pieceArea.style.transform = "";
    movePosition.x = 0;
    movePosition.y = 0;
  }

  isDragging.value = false;
}

function handleTouchStart(e: any, square: SquareType, piece: PieceType): void {
  const event = e.touches[0];
  handleMouseDown(event, square, piece);
}
function handleTouchMove(e: any): void {
  const event = e.touches[0];
  handleMouseMove(event);
}
function handleTouchEnd(): void {
  handleMouseUp();
}

function getSquareClass(
  isLightSquare: boolean,
  isHighlighted: boolean,
  isHighlightedLastMove: boolean,
  isDragStartSquare: boolean,
  isPossibleMove: boolean,
  isPossibleTake: boolean,
  isWhiteInCheck: boolean,
  isBlackInCheck: boolean,
  isLastMoveSquare: boolean
) {
  let baseClass = "";

  if (isLastMoveSquare) baseClass = isLightSquare ? "bg-blue-300" : "bg-blue-400";
  if (isHighlightedLastMove) return baseClass;
  if (isWhiteInCheck || isBlackInCheck) return `${baseClass} bg-circle-check`;
  if (isHighlighted || isDragStartSquare) return "bg-green-700";
  if (isPossibleMove) {
    return `${baseClass} ${isPossibleTake ? "bg-circle-take-piece" : "bg-circle-in-center"} ${
      isLastMoveSquare ? "hover:bg-none" : "hover:bg-green-700"
    }`;
  }
  return baseClass;
}
</script>

<template>
  <div ref="boardRef" class="bg-board">
    <div
      v-if="context?.promotionModal.value"
      class="flex absolute dim-board bg-gray-500 opacity-50 z-10"
    ></div>
    <div class="flex flex-wrap dim-board touch-none cursor-pointer select-none">
      <template v-for="(row, rowIndex) in board" :key="rowIndex">
        <template v-for="(piece, colIndex) in row" :key="colIndex">
          <div
            :ref="squareRefs[`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`]"
            class="dim-square flex items-center justify-center cursor-pointer"
            :class="
              getSquareClass(
                (colIndex + rowIndex) % 2 === 0,
                highlightedSquare ===
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`,
                highlightedLastMove ===
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`,
                dragStartSquare ===
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`,
                possibleMoves.includes(
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`
                ),
                possibleMoves.includes(
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`
                ) && piece !== 'empty',
                piece === 'K' &&
                  (props.game.isCheck() || props.game.isCheckmate()) &&
                  context.currentTurn.value === 'white',
                piece === 'k' &&
                  (props.game.isCheck() || props.game.isCheckmate()) &&
                  context.currentTurn.value === 'black',
                `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}` ===
                  context?.lastMove.value?.to ||
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}` ===
                    context?.lastMove.value?.from
              )
            "
            @mousedown="
              (e) =>
                handleMouseDown(
                  e,
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`,
                  piece
                )
            "
            @touchstart="
              (e) =>
                handleTouchStart(
                  e,
                  `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`,
                  piece
                )
            "
          >
            <!-- piezas / promoción / arrastre -->
            <div
              v-if="
                currentSquare ===
                `${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`
              "
            >
              <PromotionPawn
                v-if="piece === 'P' && 8 - rowIndex === 8 && context.promotionModal.value"
                :piece="piece"
                :square="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                :game="props.game"
                :prevSquarePromotion="prevSquarePromotion"
              />
              <PromotionPawn
                v-if="piece === 'p' && 8 - rowIndex === 1 && context.promotionModal.value"
                :piece="piece"
                :square="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                :game="props.game"
                :prevSquarePromotion="prevSquarePromotion"
              />
              <div
                v-if="movePosition.x === 0 && movePosition.y === 0"
                :ref="
                  pieceRefs[`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`]
                "
                class="card dim-square cursor-pointer z-10"
                @mouseup="handleMouseUp"
                @touchend="handleTouchEnd"
              >
                <div
                  :id="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                  class="h-full pointer-events-none"
                >
                  <Piece v-if="piece !== 'empty'" :piece="piece" />
                </div>
              </div>
              <div
                v-else
                :ref="
                  pieceRefs[`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`]
                "
                class="card dim-square cursor-pointer"
                :style="{
                  transform: `translate(${movePosition.x}px, ${movePosition.y}px)`,
                  transition: 'transform 0.2s ease-in-out',
                }"
                @mouseup="handleMouseUp"
                @touchend="handleTouchEnd"
              >
                <div
                  :id="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                  class="h-full pointer-events-none"
                >
                  <Piece v-if="piece !== 'empty'" :piece="piece" />
                </div>
              </div>
            </div>
            <div v-else>
              <PromotionPawn
                v-if="piece === 'P' && 8 - rowIndex === 8 && context.promotionModal.value"
                :piece="piece"
                :square="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                :game="props.game"
                :prevSquarePromotion="prevSquarePromotion"
              />
              <PromotionPawn
                v-if="piece === 'p' && 8 - rowIndex === 1 && context.promotionModal.value"
                :piece="piece"
                :square="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                :game="props.game"
                :prevSquarePromotion="prevSquarePromotion"
              />
              <div
                :ref="
                  pieceRefs[`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`]
                "
                class="card dim-square cursor-pointer"
              >
                <div
                  :id="`${String.fromCharCode('a'.charCodeAt(0) + colIndex)}${8 - rowIndex}`"
                  class="h-full pointer-events-none"
                >
                  <Piece v-if="piece !== 'empty'" :piece="piece" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
      <div
        ref="ghostRef"
        class="ghost-piece absolute cursor-pointer"
        style="width: 0px; height: 0px; transform: translate(0px, 0px); visibility: hidden"
      >
        <div class="pointer-events-none opacity-50">
          <Piece :piece="draggingPiece" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chessboard {
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  grid-template-columns: repeat(8, 1fr);
  width: 512px;
  height: 512px;
  border: 2px solid #333;
}
.ghost-piece {
  position: absolute;
  pointer-events: none;
  opacity: 0.5;
}
</style>
