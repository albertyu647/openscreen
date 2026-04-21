import type React from "react";
import type { SpeedRegion, TrimRegion } from "../types";

interface VideoEventHandlersParams {
	video: HTMLVideoElement;
	isSeekingRef: React.MutableRefObject<boolean>;
	isPlayingRef: React.MutableRefObject<boolean>;
	allowPlaybackRef: React.MutableRefObject<boolean>;
	currentTimeRef: React.MutableRefObject<number>;
	timeUpdateAnimationRef: React.MutableRefObject<number | null>;
	onPlayStateChange: (playing: boolean) => void;
	onTimeUpdate: (time: number) => void;
	trimRegionsRef: React.MutableRefObject<TrimRegion[]>;
	speedRegionsRef: React.MutableRefObject<SpeedRegion[]>;
}

export function createVideoEventHandlers(params: VideoEventHandlersParams) {
	const {
		video,
		isSeekingRef,
		isPlayingRef,
		allowPlaybackRef,
		currentTimeRef,
		timeUpdateAnimationRef,
		onPlayStateChange,
		onTimeUpdate,
		trimRegionsRef,
		speedRegionsRef,
	} = params;

	const emitTime = (timeValue: number) => {
		currentTimeRef.current = timeValue * 1000;
		onTimeUpdate(timeValue);
	};

	// Helper function to check if current time is within a trim region
	const findActiveTrimRegion = (currentTimeMs: number): TrimRegion | null => {
		const trimRegions = trimRegionsRef.current;
		return (
			trimRegions.find(
				(region) => currentTimeMs >= region.startMs && currentTimeMs < region.endMs,
			) || null
		);
	};

	// Helper function to find the active speed region at the current time
	const findActiveSpeedRegion = (currentTimeMs: number): SpeedRegion | null => {
		return (
			speedRegionsRef.current.find(
				(region) => currentTimeMs >= region.startMs && currentTimeMs < region.endMs,
			) || null
		);
	};

	let lastTickTime = performance.now();

	function updateTime() {
		if (!video) return;

		const now = performance.now();
		const deltaRealTimeMs = now - lastTickTime;
		lastTickTime = now;

		const currentTimeMs = video.currentTime * 1000;
		const activeTrimRegion = findActiveTrimRegion(currentTimeMs);

		// If we're in a trim region during playback, skip to the end of it
		if (activeTrimRegion && !video.paused && !video.ended) {
			const skipToTime = activeTrimRegion.endMs / 1000;

			// If the skip would take us past the video duration, pause instead
			if (skipToTime >= video.duration) {
				video.pause();
			} else {
				video.currentTime = skipToTime;
				emitTime(skipToTime);
			}
		} else {
			// Apply playback speed from active speed region
			const activeSpeedRegion = findActiveSpeedRegion(currentTimeMs);
			const targetSpeed = activeSpeedRegion ? activeSpeedRegion.speed : 1;

			if (targetSpeed > 16 && !video.paused && !video.ended) {
				// TIMELAPSE MODE:
				// Browser can't handle playbackRate > 16.
				// We move the playhead manually and jump the video occasionally.

				// 1. Calculate the new "Virtual" time
				const videoDeltaMs = deltaRealTimeMs * targetSpeed;
				const nextTime = video.currentTime + videoDeltaMs / 1000;

				if (nextTime >= video.duration) {
					video.currentTime = video.duration;
					emitTime(video.duration);
					video.pause();
				} else {
					// 2. Only seek the actual video occasionally (e.g., every 100ms) to create a timelapse effect
					// and avoid crushing the decoder with 60 seeks per second.
					const lastSeekTime =
						(video as HTMLVideoElement & { _lastHighSpeedSeek?: number })._lastHighSpeedSeek || 0;
					if (now - lastSeekTime > 100) {
						video.currentTime = nextTime;
						(video as HTMLVideoElement & { _lastHighSpeedSeek?: number })._lastHighSpeedSeek = now;
					}

					// 3. Always update the playhead smoothly
					emitTime(nextTime);
				}
			} else {
				// NORMAL MODE: 0.1x to 16x
				try {
					const clampedRate = Math.min(Math.max(targetSpeed, 0.0625), 16);
					if (Math.abs(video.playbackRate - clampedRate) > 0.01) {
						video.playbackRate = clampedRate;
					}
				} catch (_e) {
					// Fallback for browsers with stricter limits
				}
				emitTime(video.currentTime);
			}
		}

		if (!video.paused && !video.ended) {
			timeUpdateAnimationRef.current = requestAnimationFrame(updateTime);
		}
	}

	const handlePlay = () => {
		lastTickTime = performance.now();
		if (isSeekingRef.current) {
			video.pause();
			return;
		}

		if (!allowPlaybackRef.current) {
			video.pause();
			return;
		}

		isPlayingRef.current = true;
		onPlayStateChange(true);
		if (timeUpdateAnimationRef.current) {
			cancelAnimationFrame(timeUpdateAnimationRef.current);
		}
		timeUpdateAnimationRef.current = requestAnimationFrame(updateTime);
	};

	const handlePause = () => {
		isPlayingRef.current = false;
		onPlayStateChange(false);
		if (timeUpdateAnimationRef.current) {
			cancelAnimationFrame(timeUpdateAnimationRef.current);
			timeUpdateAnimationRef.current = null;
		}
		emitTime(video.currentTime);
	};

	const handleSeeked = () => {
		isSeekingRef.current = false;

		const currentTimeMs = video.currentTime * 1000;
		const activeTrimRegion = findActiveTrimRegion(currentTimeMs);

		// If we seeked into a trim region while playing, skip to the end
		if (activeTrimRegion && isPlayingRef.current && !video.paused) {
			const skipToTime = activeTrimRegion.endMs / 1000;

			if (skipToTime >= video.duration) {
				video.pause();
			} else {
				video.currentTime = skipToTime;
				emitTime(skipToTime);
			}
		} else {
			if (!isPlayingRef.current && !video.paused) {
				video.pause();
			}
			emitTime(video.currentTime);
		}
	};

	const handleSeeking = () => {
		isSeekingRef.current = true;

		if (!isPlayingRef.current && !video.paused) {
			video.pause();
		}
		emitTime(video.currentTime);
	};

	return {
		handlePlay,
		handlePause,
		handleSeeked,
		handleSeeking,
	};
}
