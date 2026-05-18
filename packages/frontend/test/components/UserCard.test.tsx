import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useStatefulActor } from "ts-actors-react";
import { nothing } from "tsmonads";
import { toTimestamp } from "itu-utils";
import type { User } from "@recapp/models";
import { UserCard } from "../../src/components/cards/UserCard";
import { withState, withNoState } from "../actorMocks";

vi.mock("ts-actors-react", async importOriginal => {
	const actual = await importOriginal<typeof import("ts-actors-react")>();
	return { ...actual, useStatefulActor: vi.fn() };
});

vi.mock("@lingui/react", async importOriginal => {
	const actual = await importOriginal<typeof import("@lingui/react")>();
	return { ...actual, Trans: ({ id }: { id: string }) => <span>{id}</span> };
});

const mockHook = vi.mocked(useStatefulActor);

function makeUser(overrides: Partial<User> = {}): User {
	return {
		uid: "user-123" as any,
		created: toTimestamp(),
		updated: toTimestamp(),
		username: "Alice Teacher",
		role: "TEACHER",
		active: true,
		isTemporary: false,
		...overrides,
	} as User;
}

function renderCard(user: User, ownUser = nothing<User>()) {
	return render(<UserCard user={user} ownUser={ownUser} />);
}

describe("UserCard", () => {
	beforeEach(() => {
		// UserCard only uses the actor ref (second tuple element) for send operations
		mockHook.mockReturnValue(withState({ users: [] }) as any);
	});

	it("renders the username", () => {
		renderCard(makeUser({ username: "Alice Teacher" }));
		expect(screen.getByText("Alice Teacher")).toBeInTheDocument();
	});

	it("renders the user uid", () => {
		renderCard(makeUser({ uid: "uid-42" as any }));
		expect(screen.getByText(/uid-42/)).toBeInTheDocument();
	});

	it("renders a green active icon for active users", () => {
		const { container } = renderCard(makeUser({ active: true }));
		// react-bootstrap-icons renders an SVG; check it's present
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("renders a nickname when present", () => {
		renderCard(makeUser({ nickname: "prof_alice" }));
		expect(screen.getByText(/aka prof_alice/)).toBeInTheDocument();
	});

	it("renders a space placeholder when nickname is absent", () => {
		const { container } = renderCard(makeUser({ nickname: undefined }));
		// The italic div should exist even if nickname is absent
		expect(container.querySelector(".fst-italic")).toBeInTheDocument();
	});
});
