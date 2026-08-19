export function parseIntClamp(
	value: string,
	options?: { radix?: number; min?: number; max?: number }
) {
	const parsed = parseInt(value, options?.radix);

	return clamp(parsed, options?.min ?? parsed, options?.max ?? parsed);
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}
