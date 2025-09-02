import { ref, reactive, provide, inject, onMounted, watch } from "vue";
import { board2DArrayToFEN, FENToBoard2DArray } from "../utils";

export function createChessBoardContext() {
  const initialFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const fen = ref(initialFEN);
  const board2DArray = ref(FENToBoard2DArray(initialFEN));
  const boardPrevToPromotion = ref(FENToBoard2DArray(initialFEN));
  const lastFEN = ref("");
  const lastMove = reactive({ from: "", to: "" });
  const prevToLastMove = reactive({ from: "", to: "" });
  const currentTurn = ref("white");
  const onPromote = ref<string | null>(null);
  const notation = ref("");
  const promotionModal = ref(false);
  const promotionNotation = ref("");
  const isClockZero = ref(false);
  const isTouchDevice = ref(false);
  const isReset = ref(false);
  const chessResult = ref("");

  // Actualizar board2DArray cuando cambia fen
  watch(fen, (newFen) => {
    board2DArray.value = FENToBoard2DArray(newFen);
  });

  onMounted(() => {
    const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    isTouchDevice.value = hasTouchScreen;
  });

  function handlePromote(from: string, to: string, piece: string, board: string[][]) {
    boardPrevToPromotion.value = board;
    const newBoard = board.map((row) => [...row]);
    newBoard[8 - parseInt(to[1])][to.charCodeAt(0) - "a".charCodeAt(0)] = piece;
    newBoard[8 - parseInt(from[1])][from.charCodeAt(0) - "a".charCodeAt(0)] = "empty";

    const [, , castling, enPassant, halfmove, fullmove] = fen.value.split(" ");
    const fullmoveNumber = parseInt(fullmove, 10);
    const halfmoveNumber = parseInt(halfmove, 10);

    fen.value = board2DArrayToFEN(
      newBoard,
      currentTurn.value,
      fullmoveNumber,
      halfmoveNumber,
      castling,
      enPassant
    );
  }

  return {
    fen,
    board2DArray,
    boardPrevToPromotion,
    lastFEN,
    lastMove,
    prevToLastMove,
    currentTurn,
    onPromote,
    notation,
    promotionModal,
    promotionNotation,
    isClockZero,
    isTouchDevice,
    isReset,
    chessResult,
    handlePromote,
    // setters estilo React
    setFEN: (v: string) => (fen.value = v),
    setBoard2DArray: (v: string[][]) => (board2DArray.value = v),
    setBoardPrevToPromotion: (v: string[][]) => (boardPrevToPromotion.value = v),
    setLastFEN: (v: string) => (lastFEN.value = v),
    setLastMove: (v: { from: string; to: string }) => {
      lastMove.from = v.from;
      lastMove.to = v.to;
    },
    setPrevToLastMove: (v: { from: string; to: string }) => {
      prevToLastMove.from = v.from;
      prevToLastMove.to = v.to;
    },
    setCurrentTurn: (v: string) => (currentTurn.value = v),
    setOnPromote: (v: string | null) => (onPromote.value = v),
    setNotation: (v: string) => (notation.value = v),
    setPromotionModal: (v: boolean) => (promotionModal.value = v),
    setPromotionNotation: (v: string) => (promotionNotation.value = v),
    setIsClockZero: (v: boolean) => (isClockZero.value = v),
    setIsTouchDevice: (v: boolean) => (isTouchDevice.value = v),
    setIsReset: (v: boolean) => (isReset.value = v),
    setChessResult: (v: string) => (chessResult.value = v),
  };
}

// clave única
const KEY = Symbol("ChessBoardContext");

// proveedor
export function provideChessBoardContext() {
  const context = createChessBoardContext();
  provide(KEY, context);
  return context;
}

// consumidor
export function useChessBoardContext() {
  const context = inject<ReturnType<typeof createChessBoardContext>>(KEY);
  if (!context) {
    throw new Error("ChessBoardContext not provided");
  }
  return context;
}
