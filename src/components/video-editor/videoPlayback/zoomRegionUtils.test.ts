import { describe, expect, it } from "vitest";
import type { CursorTelemetryPoint, ZoomRegion } from "../types";
import { ZOOM_DEPTH_SCALES } from "../types";
import { videoFocusToStageSpace } from "./focusUtils";
import { findDominantRegion } from "./zoomRegionUtils";

const region = (
	over: Partial<ZoomRegion> & Pick<ZoomRegion, "id" | "startMs" | "endMs">,
): ZoomRegion => ({
	depth: 3,
	focus: { cx: 0.5, cy: 0.5 },
	focusMode: "manual",
	...over,
});

/** Effective camera scale at a moment: 1 when idle, blended toward the zoom. */
function scaleAt(regions: ZoomRegion[], timeMs: number) {
	const {
		region: r,
		strength,
		blendedScale,
	} = findDominantRegion(regions, timeMs, {
		connectZooms: true,
	});
	if (!r || strength <= 0) return 1;
	const target = blendedScale ?? ZOOM_DEPTH_SCALES[r.depth];
	return 1 + (target - 1) * strength;
}

describe("chained zoom regions", () => {
	// Two regions closer together than CHAINED_ZOOM_PAN_GAP_MS, so they get
	// joined by a connected pan.
	const chained = [
		region({ id: "zoom-1", startMs: 1260, endMs: 3580 }),
		region({ id: "zoom-2", startMs: 4130, endMs: 10915, depth: 2 }),
	];

	it("never drops toward scale 1 between two chained regions", () => {
		// Across the whole handoff the camera should stay zoomed in; the pan
		// carries it. Previously it collapsed to 1.0 for ~2 frames right before
		// endMs and then snapped back.
		for (let t = 2600; t <= 5200; t += 10) {
			expect(scaleAt(chained, t), `scale collapsed at t=${t}`).toBeGreaterThan(1.2);
		}
	});

	it("has no sudden scale jump across the handoff", () => {
		let prev = scaleAt(chained, 2600);
		for (let t = 2610; t <= 5200; t += 10) {
			const cur = scaleAt(chained, t);
			expect(Math.abs(cur - prev), `scale jumped at t=${t}`).toBeLessThan(0.05);
			prev = cur;
		}
	});

	it("still ramps normally when regions are far apart", () => {
		const apart = [
			region({ id: "zoom-1", startMs: 1000, endMs: 3600 }),
			region({ id: "zoom-2", startMs: 8000, endMs: 12000 }),
		];
		// Well clear of both regions the camera must be fully back out.
		expect(scaleAt(apart, 5500)).toBe(1);
		// And mid-region it must be fully zoomed.
		expect(scaleAt(apart, 2300)).toBeGreaterThan(1.5);
	});
});

describe("auto-follow focus mapping", () => {
	const telemetry: CursorTelemetryPoint[] = [
		{ timeMs: 0, cx: 0.5, cy: 0.5 },
		{ timeMs: 10_000, cx: 0.5, cy: 0.5 },
	];
	const autoRegion = [region({ id: "zoom-1", startMs: 0, endMs: 10_000, focusMode: "auto" })];

	it("maps telemetry out of video space before using it as focus", () => {
		// A 1280x800 video inset in a 16:9 canvas with padding: the centre of the
		// video is NOT the centre of the canvas horizontally... but it is here,
		// since centring is symmetric. Use an off-centre rect to prove mapping.
		const stageSize = { width: 2560, height: 1440 };
		const screenRect = { x: 200, y: 100, width: 2000, height: 1200 };

		const { region: mapped } = findDominantRegion(autoRegion, 5000, {
			connectZooms: true,
			cursorTelemetry: telemetry,
			mapCursorFocus: (f) => videoFocusToStageSpace(f, stageSize, screenRect),
		});

		// video (0.5,0.5) -> stage ((200+1000)/2560, (100+600)/1440)
		expect(mapped?.focus.cx).toBeCloseTo(1200 / 2560, 5);
		expect(mapped?.focus.cy).toBeCloseTo(700 / 1440, 5);
	});

	it("passes telemetry through untouched when no mapper is supplied", () => {
		const { region: unmapped } = findDominantRegion(autoRegion, 5000, {
			connectZooms: true,
			cursorTelemetry: telemetry,
		});
		expect(unmapped?.focus.cx).toBeCloseTo(0.5, 5);
		expect(unmapped?.focus.cy).toBeCloseTo(0.5, 5);
	});
});
