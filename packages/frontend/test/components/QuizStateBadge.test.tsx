import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizStateBadge } from "../../src/components/QuizStateBadge";

describe("QuizStateBadge", () => {
	it("renders the state text", () => {
		render(<QuizStateBadge state="EDITING" />);
		expect(screen.getByText("EDITING")).toBeInTheDocument();
	});

	it("uses primary bg for EDITING", () => {
		const { container } = render(<QuizStateBadge state="EDITING" />);
		expect(container.querySelector(".bg-primary")).toBeInTheDocument();
	});

	it("uses success bg for STARTED", () => {
		const { container } = render(<QuizStateBadge state="STARTED" />);
		expect(container.querySelector(".bg-success")).toBeInTheDocument();
	});

	it("uses warning bg for STOPPED", () => {
		const { container } = render(<QuizStateBadge state="STOPPED" />);
		expect(container.querySelector(".bg-warning")).toBeInTheDocument();
	});

	it("uses secondary bg for ARCHIVED", () => {
		const { container } = render(<QuizStateBadge state="ARCHIVED" />);
		expect(container.querySelector(".bg-secondary")).toBeInTheDocument();
	});

	it("uses secondary bg for undefined state", () => {
		const { container } = render(<QuizStateBadge state={undefined} />);
		expect(container.querySelector(".bg-secondary")).toBeInTheDocument();
	});
});
