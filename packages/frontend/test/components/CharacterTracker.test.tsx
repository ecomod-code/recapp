import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CharacterTracker } from "../../src/components/CharacterTracker";

describe("CharacterTracker", () => {
	it("renders value and maxValue", () => {
		render(<CharacterTracker value={42} maxValue={150} />);
		expect(screen.getByText(/42/)).toBeInTheDocument();
		expect(screen.getByText(/150/)).toBeInTheDocument();
	});

	it("renders zero value", () => {
		render(<CharacterTracker value={0} maxValue={100} />);
		expect(screen.getByText(/0/)).toBeInTheDocument();
	});

	it("renders when value equals maxValue", () => {
		render(<CharacterTracker value={100} maxValue={100} />);
		// Should show both numbers — rendered as "( 100 / 100 )"
		const text = screen.getByText(/100\s*\/\s*100/);
		expect(text).toBeInTheDocument();
	});
});
