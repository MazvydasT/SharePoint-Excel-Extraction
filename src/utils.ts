import { from } from 'ix/iterable';
import { map } from 'ix/iterable/operators';

export function parseIntClamp(
	value: string,
	radix?: number,
	min?: number,
	max?: number
) {
	const parsed = parseInt(value, radix);

	return clamp(parsed, min ?? parsed, max ?? parsed);
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function getAdditionalProperties(obj: Record<string, unknown>) {
	return from(Object.entries<any>(obj)).pipe(
		map(([key, value]) => `${key}: ${value}`)
	);
}
