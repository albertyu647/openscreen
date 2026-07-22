import { clampFocusToDepth, ZOOM_DEPTH_SCALES, type ZoomDepth, type ZoomFocus } from "../types";

interface StageSize {
	width: number;
	height: number;
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function easeIntoBoundary(normalized: number) {
	const t = clamp(normalized, 0, 1);
	return -t * t * t + 2 * t * t;
}

function softClampToRange(value: number, min: number, max: number, softness: number) {
	const clamped = clamp(value, min, max);

	if (softness <= 0 || max <= min) {
		return clamped;
	}

	if (clamped < min + softness) {
		const normalized = (clamped - min) / softness;
		return min + softness * easeIntoBoundary(normalized);
	}

	if (clamped > max - softness) {
		const normalized = (max - clamped) / softness;
		return max - softness * easeIntoBoundary(normalized);
	}

	return clamped;
}

function getFocusBounds(depth: ZoomDepth) {
	const zoomScale = ZOOM_DEPTH_SCALES[depth];
	return getFocusBoundsForScale(zoomScale);
}

interface ViewportRatio {
	widthRatio: number;
	heightRatio: number;
}

function getFocusBoundsForScale(zoomScale: number, viewportRatio?: ViewportRatio) {
	const wr = viewportRatio?.widthRatio ?? 1;
	const hr = viewportRatio?.heightRatio ?? 1;
	const marginX = Math.min(0.5, wr / (2 * zoomScale));
	const marginY = Math.min(0.5, hr / (2 * zoomScale));

	return {
		minX: marginX,
		maxX: 1 - marginX,
		minY: marginY,
		maxY: 1 - marginY,
	};
}

export function clampFocusToStage(
	focus: ZoomFocus,
	depth: ZoomDepth,
	_stageSize: StageSize,
): ZoomFocus {
	const baseFocus = clampFocusToDepth(focus, depth);
	const bounds = getFocusBounds(depth);

	return {
		cx: clamp(baseFocus.cx, bounds.minX, bounds.maxX),
		cy: clamp(baseFocus.cy, bounds.minY, bounds.maxY),
	};
}

export function clampFocusToScale(
	focus: ZoomFocus,
	zoomScale: number,
	viewportRatio?: ViewportRatio,
): ZoomFocus {
	const baseFocus = {
		cx: clamp(focus.cx, 0, 1),
		cy: clamp(focus.cy, 0, 1),
	};
	const bounds = getFocusBoundsForScale(zoomScale, viewportRatio);

	return {
		cx: clamp(baseFocus.cx, bounds.minX, bounds.maxX),
		cy: clamp(baseFocus.cy, bounds.minY, bounds.maxY),
	};
}

export function softenFocusToScale(
	focus: ZoomFocus,
	zoomScale: number,
	viewportRatio?: ViewportRatio,
): ZoomFocus {
	const baseFocus = {
		cx: clamp(focus.cx, 0, 1),
		cy: clamp(focus.cy, 0, 1),
	};
	const bounds = getFocusBoundsForScale(zoomScale, viewportRatio);
	const horizontalRange = bounds.maxX - bounds.minX;
	const verticalRange = bounds.maxY - bounds.minY;
	const horizontalSoftness = Math.min(0.12, horizontalRange * 0.35);
	const verticalSoftness = Math.min(0.12, verticalRange * 0.35);

	return {
		cx: softClampToRange(baseFocus.cx, bounds.minX, bounds.maxX, horizontalSoftness),
		cy: softClampToRange(baseFocus.cy, bounds.minY, bounds.maxY, verticalSoftness),
	};
}

interface RectLike {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Map a point expressed in source-video space (0-1 across the recording) into
 * stage space (0-1 across the output canvas, wallpaper included).
 *
 * Cursor telemetry is captured relative to the recorded display, but zoom focus
 * is relative to the canvas — and the video sits inset within that canvas by
 * the padding setting. Auto-follow has to convert between the two or it aims
 * short of the cursor by however much padding is in effect.
 */
export function videoFocusToStageSpace(
	focus: ZoomFocus,
	stageSize: StageSize,
	screenRect: RectLike,
	cropRegion?: { x: number; y: number; width: number; height: number },
): ZoomFocus {
	if (!stageSize.width || !stageSize.height || !screenRect.width || !screenRect.height) {
		return focus;
	}

	// Telemetry covers the whole recording; the stage only shows the cropped part.
	const cropX = cropRegion?.x ?? 0;
	const cropY = cropRegion?.y ?? 0;
	const cropW = cropRegion?.width ?? 1;
	const cropH = cropRegion?.height ?? 1;

	const croppedX = cropW > 0 ? (focus.cx - cropX) / cropW : focus.cx;
	const croppedY = cropH > 0 ? (focus.cy - cropY) / cropH : focus.cy;

	return {
		cx: (screenRect.x + croppedX * screenRect.width) / stageSize.width,
		cy: (screenRect.y + croppedY * screenRect.height) / stageSize.height,
	};
}

export function stageFocusToVideoSpace(
	focus: ZoomFocus,
	stageSize: StageSize,
	videoSize: { width: number; height: number },
	baseScale: number,
	baseOffset: { x: number; y: number },
): ZoomFocus {
	if (
		!stageSize.width ||
		!stageSize.height ||
		!videoSize.width ||
		!videoSize.height ||
		baseScale <= 0
	) {
		return focus;
	}

	const stageX = focus.cx * stageSize.width;
	const stageY = focus.cy * stageSize.height;

	const videoNormX = (stageX - baseOffset.x) / (videoSize.width * baseScale);
	const videoNormY = (stageY - baseOffset.y) / (videoSize.height * baseScale);

	return {
		cx: videoNormX,
		cy: videoNormY,
	};
}
