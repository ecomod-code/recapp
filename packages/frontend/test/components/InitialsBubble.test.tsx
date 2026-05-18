import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InitialsBubble } from "../../src/components/InitialsBubble";

describe("InitialsBubble", () => {
	it("shows first and last initials for a two-word name", () => {
		render(<InitialsBubble username="Alice Smith" />);
		expect(screen.getByText("AS")).toBeInTheDocument();
	});

	it("uppercases initials", () => {
		render(<InitialsBubble username="bob jones" />);
		expect(screen.getByText("BJ")).toBeInTheDocument();
	});

	it("renders empty string when username is undefined", () => {
		const { container } = render(<InitialsBubble />);
		const div = container.firstChild as HTMLElement;
		expect(div.textContent).toBe("");
	});

	it("handles single-word name (no space)", () => {
		// lastIndexOf(' ') returns -1, so username[-1+1] = username[0]
		render(<InitialsBubble username="Mononym" />);
		expect(screen.getByText("MM")).toBeInTheDocument();
	});
});
